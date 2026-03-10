/**
 * DatabaseEngine: 提供 SQL-like 操作 Google Sheets 的功能
 * 支援: SELECT, INSERT, UPDATE, DELETE, WHERE, ORDER BY, LIMIT, OFFSET, COUNT, AND, OR, BETWEEN
 */
const Database = {
    /**
     * 執行 SQL 語句
     * @param {string} sql
     */
    query: function (sql) {
        if (!sql) return { success: false, error: 'SQL 語句不能為空' };
        sql = sql.trim();
        const command = sql.split(/\s+/)[0].toUpperCase();

        try {
            switch (command) {
                case 'SELECT':
                    return this._executeSelect(sql);
                case 'INSERT':
                    return this._executeInsert(sql);
                case 'UPDATE':
                    return this._executeUpdate(sql);
                case 'DELETE':
                    return this._executeDelete(sql);
                default:
                    throw new Error('未支援的 SQL 命令: ' + command);
            }
        } catch (e) {
            console.error('SQL 執行錯誤:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * 執行 SELECT (支援 WHERE, ORDER BY, LIMIT, OFFSET, COUNT)
     */
    _executeSelect: function (sql) {
        const isCount = /SELECT\s+COUNT\(/i.test(sql);
        const isSelectAll = /SELECT\s+\*\s+FROM/i.test(sql);
        const tableName = this._extractTableName(sql, 'FROM');
        const data = this._getTableData(tableName);
        let results = data;

        // 處理 WHERE (支援 AND, OR, BETWEEN, =, !=, >, <)
        const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?=\s+ORDER BY|\s+LIMIT|\s+OFFSET|$)/i);
        if (whereMatch) {
            const condition = whereMatch[1];
            results = results.filter(row => this._evaluateCondition(row, condition));
        }

        // 處理特定欄位選擇 (如果不是 SELECT * 且不是 COUNT)
        if (!isSelectAll && !isCount) {
            const selectColsMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
            if (selectColsMatch) {
                const cols = selectColsMatch[1].split(',').map(c => c.trim());
                results = results.map(row => {
                    const obj = {};
                    cols.forEach(c => obj[c] = row[c]);
                    return obj;
                });
            }
        }

        // 如果是 COUNT(*)
        if (isCount) {
            return [{ count: results.length }];
        }

        // 處理 ORDER BY
        const orderMatch = sql.match(/ORDER BY\s+([\s\S]+?)(?=\s+LIMIT|\s+OFFSET|$)/i);
        if (orderMatch) {
            const parts = orderMatch[1].trim().split(/\s+/);
            const col = parts[0];
            const dir = parts[1] ? parts[1].toUpperCase() : 'ASC';
            const isDesc = dir === 'DESC';

            results.sort((a, b) => {
                let valA = a[col];
                let valB = b[col];

                if (!isNaN(valA) && !isNaN(valB)) {
                    valA = Number(valA);
                    valB = Number(valB);
                }

                if (valA < valB) return isDesc ? 1 : -1;
                if (valA > valB) return isDesc ? -1 : 1;
                return 0;
            });
        }

        // 處理 LIMIT & OFFSET
        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
        const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
        const limit = limitMatch ? parseInt(limitMatch[1]) : results.length;

        return results.slice(offset, offset + limit);
    },

    /**
     * 執行 INSERT INTO table (cols) VALUES (vals)
     */
    _executeInsert: function (sql) {
        const tableName = this._extractTableName(sql, 'INTO');
        const colsMatch = sql.match(/\(([\s\S]+?)\)\s+VALUES/i);
        const valsMatch = sql.match(/VALUES\s*\(([\s\S]+)\)/i);

        if (!colsMatch || !valsMatch) throw new Error('INSERT 語法錯誤，請確保包含 (columns) 與 VALUES (values)');

        const cols = colsMatch[1].split(',').map(s => s.trim());
        // 改用 regex 拆分 VALUES，避免 JSON 內部的逗號導致錯誤
        const valsStr = valsMatch[1].trim();
        const vals = valsStr.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(s => {
            return s.trim().replace(/^'|'$/g, '').replace(/''/g, "'");
        });

        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(tableName);
        if (!sheet) throw new Error(`找不到 Table: ${tableName}`);

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const now = new Date();

        const newRow = headers.map(h => {
            const idx = cols.indexOf(h);
            if (h === 'create_at' || h === 'update_at') return now;
            return idx > -1 ? vals[idx] : "";
        });

        sheet.appendRow(newRow);
        return { success: true, message: '插入成功' };
    },

    /**
     * 執行 UPDATE table SET col=val WHERE ...
     */
    _executeUpdate: function (sql) {
        const tableName = this._extractTableName(sql, 'UPDATE');
        const setMatch = sql.match(/SET\s+(.+?)(?=\s+WHERE|$)/i);
        const whereMatch = sql.match(/WHERE\s+(.+)/i);

        if (!setMatch || !whereMatch) throw new Error('UPDATE 必須包含 SET 與 WHERE 條件');

        const setPairs = setMatch[1].split(/,(?=(?:(?:[^']*'){2})*[^']*$)/).map(p => {
            const eqIdx = p.indexOf('=');
            if (eqIdx === -1) return null;
            return [p.substring(0, eqIdx).trim(), p.substring(eqIdx + 1).trim().replace(/^'|'$/g, '').replace(/''/g, "'")];
        }).filter(p => p !== null);

        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(tableName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const now = new Date();

        let updatedCount = 0;
        for (let i = 1; i < data.length; i++) {
            const rowObj = this._rowToObj(headers, data[i]);
            if (this._evaluateCondition(rowObj, whereMatch[1])) {
                setPairs.forEach(([col, val]) => {
                    const colIdx = headers.indexOf(col);
                    if (colIdx > -1) {
                        sheet.getRange(i + 1, colIdx + 1).setValue(val);
                    }
                });
                // 自動更新 update_at
                const updateAtIdx = headers.indexOf('update_at');
                if (updateAtIdx > -1) {
                    sheet.getRange(i + 1, updateAtIdx + 1).setValue(now);
                }
                updatedCount++;
            }
        }
        return { success: true, updatedCount };
    },

    /**
     * 執行 DELETE FROM table WHERE ...
     */
    _executeDelete: function (sql) {
        const tableName = this._extractTableName(sql, 'FROM');
        const whereMatch = sql.match(/WHERE\s+(.+)/i);
        if (!whereMatch) throw new Error('基於安全考量，DELETE 指令必須包含 WHERE 條件');

        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(tableName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];

        let deletedCount = 0;
        // 從最後一行往前刪除，避免索引偏移
        for (let i = data.length - 1; i >= 1; i--) {
            const rowObj = this._rowToObj(headers, data[i]);
            if (this._evaluateCondition(rowObj, whereMatch[1])) {
                sheet.deleteRow(i + 1);
                deletedCount++;
            }
        }
        return { success: true, deletedCount };
    },

    // --- 內部輔助函數 ---

    _getTableData: function (tableName) {
        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(tableName);
        if (!sheet) throw new Error(`找不到 Table: ${tableName}`);
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return []; // 只有標題或完全沒資料
        const headers = data[0];
        return data.slice(1).map(row => this._rowToObj(headers, row));
    },

    _rowToObj: function (headers, row) {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    },

    _extractTableName: function (sql, keyword) {
        const regex = new RegExp(`${keyword}\\s+([\\w\\d_]+)`, 'i');
        const match = sql.match(regex);
        if (!match) throw new Error(`無法解析資料表名稱，請確認語法是否包含 ${keyword}`);
        return match[1];
    },

    /**
     * 條件模擬器 (支援 AND, OR, BETWEEN, =, !=, <>, >, <)
     */
    _evaluateCondition: function (row, condition) {
        // 1. 處理 BETWEEN (支援引號字串或數值)
        let jsCond = condition.replace(/(\w+)\s+BETWEEN\s+('.+?'|\S+)\s+AND\s+('.+?'|\S+)/gi, (m, col, p1, p2) => {
            return `(${col} >= ${p1} && ${col} <= ${p2})`;
        });

        // 2. 處理不等於 <> 或 != 轉為 !== (前後補空格避免黏連)
        jsCond = jsCond.replace(/<>|!=/g, ' !== ');

        // 3. 處理等於 = 轉為 === (避免影響已有的 !==, >=, <=)
        // 使用更安全的 regex，匹配被空格包圍或在單詞邊界的 =
        jsCond = jsCond.replace(/([^!<=>\s])\s*=\s*(?!=)/g, '$1 === ');

        // 4. 處理邏輯運算子 (加上 \b 確保精確匹配)
        jsCond = jsCond.replace(/\bAND\b/gi, ' && ').replace(/\bOR\b/gi, ' || ');

        // 5. 對 row 裡面的每個欄位進行代換
        const sortedKeys = Object.keys(row).sort((a, b) => b.length - a.length);

        sortedKeys.forEach(key => {
            const val = row[key];
            // 處理 Date 物件或其他非字串類型
            let valStr;
            if (val instanceof Date) {
                valStr = `new Date('${val.toISOString()}')`;
            } else if (typeof val === 'string') {
                valStr = `'${val.replace(/'/g, "\\'")}'`;
            } else if (val === null || val === undefined) {
                valStr = 'null';
            } else {
                valStr = val;
            }

            const regex = new RegExp(`\\b${key}\\b`, 'g');
            jsCond = jsCond.replace(regex, valStr);
        });

        try {
            return eval(jsCond);
        } catch (e) {
            console.warn('條件解析錯誤:', jsCond, e);
            return false;
        }
    }
};
