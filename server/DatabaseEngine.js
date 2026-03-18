/**
 * DatabaseEngine: 高效能 Google Sheets SQL 引擎 (重構版)
 * 優化策略：
 * 1. SELECT: 使用 Gviz API (google.visualization.Query) 並由伺服器端過濾。
 * 2. INSERT: 批次寫入 (setValues)。
 * 3. UPDATE/DELETE: 讀寫分離 (全量讀取 -> 記憶體計算 -> 批次寫回)。
 * 4. Cache: 實作 Runtime Schema Cache 減少重複讀取。
 */
const Database = {
    // Runtime 快取，僅存在於單次請求週期
    _cache: {
        sheets: {}, // 名稱 -> { sheet, headers, colMap (name->letter) }
    },

    /**
     * 執行 SQL 語句入口
     */
    query: function (sql) {
        if (!sql) return { success: false, error: 'SQL 語句不能為空' };
        sql = sql.trim();
        const command = sql.split(/\s+/)[0].toUpperCase();
        try {
            switch (command) {
                case 'SELECT':
                    if (!/\s+FROM\s+/i.test(sql) && /SELECT\s+\w+\s*\(/.test(sql)) {
                        return this._executeProcedure(sql, 'SELECT');
                    }
                    return this._executeSelect(sql);
                case 'INSERT':
                    return this._executeInsert(sql);
                case 'UPDATE':
                    return this._executeUpdate(sql);
                case 'DELETE':
                    return this._executeDelete(sql);
                case 'CALL':
                    return this._executeProcedure(sql, 'CALL');
                default:
                    throw new Error('未支援的 SQL 命令: ' + command);
            }
        } catch (e) {
            logError(`SQL 執行錯誤: ${e.message} | SQL: ${sql}`);
            return { success: false, error: e.message };
        }
    },

    /**
     * 公開方法：基於物件的 INSERT (支援單筆或陣列)
     */
    insert: function (tableName, data) {
        const schema = this._getTableSchema(tableName);
        const records = Array.isArray(data) ? data : [data];
        if (records.length === 0) return { success: true, count: 0 };

        const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        const rows = records.map(record => schema.headers.map(h => {
            if (h === 'create_at' || h === 'update_at') return now;
            return record[h] !== undefined ? record[h] : "";
        }));

        const formats = rows.map(row => row.map(v => (typeof v === 'number' || typeof v === 'boolean') ? 'General' : '@'));
        const range = schema.sheet.getRange(schema.sheet.getLastRow() + 1, 1, rows.length, schema.headers.length);
        range.setNumberFormats(formats);
        range.setValues(rows);
        return { success: true, count: rows.length };
    },

    /**
     * 公開方法：基於物件與條件的 UPDATE
     */
    update: function (tableName, data, where) {
        if (!where) throw new Error('UPDATE 操作必須提供 WHERE 條件');
        const start = Date.now();
        const schema = this._getTableSchema(tableName);
        const sheet = schema.sheet;
        
        // 1. 取得所有資料 (全量讀取一次)
        const allData = sheet.getDataRange().getValues();
        if (allData.length <= 1) return { success: true, updatedCount: 0 };
        
        const headers = allData[0].map(h => String(h).trim());
        const rows = allData.slice(1);

        // 2. 【預編譯任務】將要更新的欄位 Key 轉為 Index，避免在迴圈中重複搜尋
        const updateTasks = Object.keys(data).map(k => {
          const searchKey = k.trim().toLowerCase();
          return {
            idx: headers.findIndex(h => h.toLowerCase() === searchKey),
            val: data[k]
          };
        }).filter(task => task.idx > -1);

        const utIdx = headers.findIndex(h => h.toLowerCase() === 'update_at');
        const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

        // 3. 【條件解析】處理傳入的 WHERE 字串或物件
        const whereStr = typeof where === 'string' ? where : Object.keys(where).map(k => `${k}='${where[k]}'`).join(' AND ');
        const conditionFn = this._compileCondition(headers, whereStr);

        // 4. 【執行更新】原地修改 rows 陣列，不產生新物件以節省記憶體
        let updatedCount = 0;
        for (let i = 0; i < rows.length; i++) {
          const rowArr = rows[i];
          // 建立臨時物件僅用於條件判斷
          const rowObj = this._rowToObj(headers, rowArr);

          if (conditionFn(rowObj)) {
            updateTasks.forEach(task => {
              rowArr[task.idx] = task.val;
            });
            if (utIdx > -1) rowArr[utIdx] = now;
            updatedCount++;
          }
        }

        // 5. 【批次寫回】
        if (updatedCount > 0) {
          // 確保寫回的維度與標頭完全對齊
          const finalRows = rows.map(r => {
            if (r.length < headers.length) return r.concat(new Array(headers.length - r.length).fill(""));
            return r.slice(0, headers.length);
          });

          // 從第 2 行、第 1 欄開始寫入
          sheet.getRange(2, 1, finalRows.length, headers.length).setValues(finalRows);
          SpreadsheetApp.flush(); // 強制同步
        }

        return { 
          success: true, 
          updatedCount, 
          elapsed: (Date.now() - start) + 'ms'
        };
      },
  
    
    /**
     * 公開方法：基於條件的 DELETE
     */
    delete: function (tableName, where) {
        if (!where) throw new Error('DELETE 操作必須提供 WHERE 條件');
        const sql = `DELETE FROM ${tableName} WHERE ${typeof where === 'string' ? where : Object.keys(where).map(k => `${k}='${where[k]}'`).join(' AND ')}`;
        return this._executeDelete(sql);
    },

    /**
     * 1. 優化 SELECT: 使用 Gviz API
     * 優點：Google 伺服器端過濾，減少大量資料轉輸
     */
    _executeSelect: function (sql) {
        const tableName = this._extractTableName(sql, 'FROM');
        const schema = this._getTableSchema(tableName);

        // 將 SQL 中的欄位名稱替換為 Gviz 要求的字母 (如 uid -> A)
        let gvizSql = sql;
        // 移除 FROM table 部分，Gviz 不需要
        gvizSql = gvizSql.replace(new RegExp(`FROM\\s+${tableName}`, 'i'), '');

        // 替換欄位名稱
        schema.sortedNames.forEach(name => {
            const regex = new RegExp(`\\b${name}\\b`, 'g');
            gvizSql = gvizSql.replace(regex, schema.colMap[name]);
        });

        const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(gvizSql)}&sheet=${encodeURIComponent(tableName)}`;

        const response = UrlFetchApp.fetch(url, {
            headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
        });

        const content = response.getContentText();
        // Gviz 回傳格式為 google.visualization.Query.setResponse({...});
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        const gvizData = JSON.parse(jsonStr);

        if (gvizData.status === 'error') {
            throw new Error(`Gviz API 錯誤: ${gvizData.errors[0].detailed_message}`);
        }

        const table = gvizData.table;
        const cols = table.cols; // [{id: 'A', label: 'uid', type: 'string'}, ...]
        const rows = table.rows; // [{c: [{v: 'M001'}, {v: 123}]}, ...]

        // 建立 Letter -> Name 的反向對照表，解決部分查詢時 Index 位移的問題
        const letterToName = {};
        for (const name in schema.colMap) {
            letterToName[schema.colMap[name]] = name;
        }

        // 轉換回原始 JSON 物件陣列格式
        const results = rows.map(r => {
            const rowObj = {};
            r.c.forEach((cell, i) => {
                const colId = cols[i].id;
                // 優先用對照表找回名稱，若無則用 Gviz Label，最後才用 Index
                const colLabel = letterToName[colId] || cols[i].label || `col_${i}`;
                let val = cell ? cell.v : null;

                // 處理 Gviz 日期格式
                if (typeof val === 'string' && val.startsWith('Date(')) {
                    val = this._parseGvizDate(val, colLabel);
                }
                rowObj[colLabel] = val;
            });
            return rowObj;
        });

        return results;
    },

    /**
     * 2. 優化 INSERT: 支援單筆批次寫入
     */
    _executeInsert: function (sql) {
        const tableName = this._extractTableName(sql, 'INTO');
        const schema = this._getTableSchema(tableName);
        const sheet = schema.sheet;

        const colsMatch = sql.match(/\(([\s\S]+?)\)\s+VALUES/i);
        const valsMatch = sql.match(/VALUES\s*\(([\s\S]+)\)/i);
        if (!colsMatch || !valsMatch) throw new Error('INSERT 語法錯誤');

        const cols = colsMatch[1].split(',').map(s => s.trim());
        const valsStr = valsMatch[1].trim();
        const rawVals = valsStr.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(this._parseSqlValue);

        const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

        const newRow = schema.headers.map(h => {
            if (h === 'create_at' || h === 'update_at') return now;
            const idx = cols.indexOf(h);
            return idx > -1 ? rawVals[idx] : "";
        });

        const lastRow = sheet.getLastRow() + 1;
        const formats = newRow.map(v => (typeof v === 'number' || typeof v === 'boolean') ? 'General' : '@');
        const range = sheet.getRange(lastRow, 1, 1, schema.headers.length);

        range.setNumberFormats([formats]);
        range.setValues([newRow]);

        return { success: true, message: '插入成功' };
    },

    /**
     * 3. 優化 UPDATE: 讀寫分離 + 記憶體批次處理
     */
    _executeUpdate: function (sql) {
        const tableName = this._extractTableName(sql, 'UPDATE');
        const setMatch = sql.match(/SET\s+([\s\S]+?)(?=\s+WHERE|$)/i);
        const whereMatch = sql.match(/WHERE\s+([\s\S]+)/i);
        if (!setMatch || !whereMatch) throw new Error('UPDATE 必須包含 SET 與 WHERE');

        const schema = this._getTableSchema(tableName);
        const sheet = schema.sheet;
        const allData = sheet.getDataRange().getValues();
        const headers = allData[0].map(h => String(h).trim());
        const rows = allData.slice(1);

        const setPairs = setMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(p => {
            const eqIdx = p.indexOf('=');
            if (eqIdx === -1) return null;
            return [p.substring(0, eqIdx).trim(), this._parseSqlValue(p.substring(eqIdx + 1).trim())];
        }).filter(p => p !== null);

        const whereCond = whereMatch[1];
        const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

        // 編譯條件函數以優化 eval 效能
        const conditionFn = this._compileCondition(headers, whereCond);

        let updatedCount = 0;
        const newRows = rows.map((rowArr) => {
            const rowObj = this._rowToObj(headers, rowArr);
            if (conditionFn(rowObj)) {
                setPairs.forEach(([col, val]) => {
                    const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
                    if (idx > -1) rowArr[idx] = val;
                });
                const utIdx = headers.findIndex(h => h.toLowerCase() === 'update_at');
                if (utIdx > -1) rowArr[utIdx] = now;
                updatedCount++;
            }
            return rowArr;
        });

        if (updatedCount > 0) {
            const formats = newRows.map(row => row.map(v => (typeof v === 'number' || typeof v === 'boolean') ? 'General' : '@'));
            const range = sheet.getRange(2, 1, newRows.length, headers.length);
            range.setNumberFormats(formats);
            range.setValues(newRows);
        }

        // 協助垃圾回收
        nullRows = null;
        return { success: true, updatedCount };
    },

    /**
     * 4. 優化 DELETE: 記憶體過濾 + 批次覆蓋
     */
    _executeDelete: function (sql) {
        const tableName = this._extractTableName(sql, 'FROM');
        const whereMatch = sql.match(/WHERE\s+([\s\S]+)/i);
        if (!whereMatch) throw new Error('DELETE 必須包含 WHERE');

        const schema = this._getTableSchema(tableName);
        const sheet = schema.sheet;
        const allData = sheet.getDataRange().getValues();
        const headers = allData[0].map(h => String(h).trim());
        const rows = allData.slice(1);

        const conditionFn = this._compileCondition(headers, whereMatch[1]);

        const filteredRows = rows.filter(rowArr => {
            const rowObj = this._rowToObj(headers, rowArr);
            return !conditionFn(rowObj); // 留下不符合條件的
        });

        const deletedCount = rows.length - filteredRows.length;

        if (deletedCount > 0) {
            sheet.clearContents();
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            if (filteredRows.length > 0) {
                const formats = filteredRows.map(row => row.map(v => (typeof v === 'number' || typeof v === 'boolean') ? 'General' : '@'));
                const range = sheet.getRange(2, 1, filteredRows.length, headers.length);
                range.setNumberFormats(formats);
                range.setValues(filteredRows);
            }
        }

        return { success: true, deletedCount };
    },

    /**
     * 獲取資料表 Schema 並快取
     */
    _getTableSchema: function (tableName) {
        if (this._cache.sheets[tableName]) return this._cache.sheets[tableName];

        const cache = CacheService.getScriptCache();
        const cacheKey = `schema_v3_${tableName}`; // 強制切換到 v3 避開舊快取
        let headers = JSON.parse(cache.get(cacheKey) || 'null');

        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(tableName);
        if (!sheet) throw new Error(`找不到資料表: ${tableName}`);

        if (!headers) {
            // 讀取並去除標頭空格
            headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(h => String(h).trim());
            cache.put(cacheKey, JSON.stringify(headers), 3600); // 緩存 1 小時
        }

        const colMap = {};
        headers.forEach((h, i) => {
            colMap[h] = this._indexToLetter(i);
        });

        const schema = {
            sheet: sheet,
            headers: headers,
            colMap: colMap,
            sortedNames: Object.keys(colMap).sort((a, b) => b.length - a.length)
        };

        this._cache.sheets[tableName] = schema;
        return schema;
    },

    _indexToLetter: function (i) {
        let letter = '';
        while (i >= 0) {
            letter = String.fromCharCode((i % 26) + 65) + letter;
            i = Math.floor(i / 26) - 1;
        }
        return letter;
    },

    _parseSqlValue: function (s) {
        const v = s.trim();
        if (v.startsWith("'") && v.endsWith("'")) return v.replace(/^'|'$/g, '').replace(/''/g, "'");
        if (v.toLowerCase() === 'true') return true;
        if (v.toLowerCase() === 'false') return false;
        if (!isNaN(v) && v !== "") return Number(v);
        return v;
    },

    _parseGvizDate: function (val, colName) {
        // 格式: Date(2026,2,17,10,0,0) -> 注意月份是 0-11
        const parts = val.match(/\d+/g).map(Number);
        const date = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);

        if (colName.endsWith('_date')) return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (colName.endsWith('_time')) return Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm");

        const timeStr = Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm:ss");
        return (timeStr === "00:00:00")
            ? Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd")
            : Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    },

    _compileCondition: function(headers, whereStr) {
        // 1. 處理 SQL 的 = 號與單引號
        // 將 "uid = 'DEBUG_01'" 轉為 JavaScript 的 "r['uid'] == 'DEBUG_01'"
        let jsCond = whereStr
            .replace(/=/g, '==')
            .replace(/AND/gi, '&&')
            .replace(/OR/gi, '||');

        // 2. 關鍵：確保欄位名稱被正確映射到 r['column']
        headers.forEach(h => {
            // 使用正規表達式匹配獨立的單字，避免 'id' 誤換 'uid'
            const reg = new RegExp(`\\b${h}\\b`, 'g');
            jsCond = jsCond.replace(reg, `r['${h}']`);
        });

        try {
            // 3. 動態生成函式
            return new Function('r', `return ${jsCond};`);
        } catch (e) {
            console.error("條件編譯失敗: " + jsCond);
            return () => false;
        }
    },


    _extractTableName: function (sql, keyword) {
        const regex = new RegExp(`${keyword}\\s+([\\w\\d_]+)`, 'i');
        const match = sql.match(regex);
        return match ? match[1] : null;
    },

    _rowToObj: function (headers, row) {
        const obj = {};
        headers.forEach((h, i) => {
            let val = row[i];
            // 去除字串前後空格
            if (typeof val === 'string') val = val.trim();

            if (val instanceof Date && h !== 'create_at' && h !== 'update_at') {
                if (h.endsWith('_date')) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
                else if (h.endsWith('_time')) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
                else {
                    const t = Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm:ss");
                    val = (t === "00:00:00") ? Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd") : Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
                }
            }
            obj[h] = val;
        });
        return obj;
    },

    _executeProcedure: function (sql, type) {
        const regex = new RegExp(`${type}\\s+([\\w\\d_]+)\\s*\\(([\\s\\S]*)\\)`, 'i');
        const match = sql.trim().match(regex);
        if (!match) throw new Error(`${type} 語法錯誤`);

        const funcName = match[1];
        const argsStr = match[2].trim();
        let args = argsStr ? argsStr.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(s => this._parseSqlValue(s)) : [];

        const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
        const targetFunc = globalScope[funcName];

        if (typeof targetFunc === 'function') {
            const result = targetFunc.apply(null, args);
            return type === 'SELECT' ? [{ result }] : { success: true, result };
        }
        throw new Error(`找不到函數: ${funcName}`);
    },

    log: function (status, msg) {
        const uid = Utilities.getUuid();
        const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        const safeMsg = String(msg).replace(/'/g, "''");
        return this.query(`INSERT INTO logs (uid,time, status, msg) VALUES ('${uid}', '${now}', '${status}', '${safeMsg}')`);
    }
};

function logInfo(msg) { return Database.log('info', msg); }
function logWarn(msg) { return Database.log('warn', msg); }
function logError(msg) { return Database.log('error', msg); }
