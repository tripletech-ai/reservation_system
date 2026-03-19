/**
 * 處理網頁應用程式的 GET 請求
 */
function doGet(e) {
    const query = e.parameter.query;
    logInfo(`GET request: ${query}`);
    if (!query) {
        return createJsonResponse({ success: false, error: '缺少 query 參數' });
    }

    const result = Database.query(query);
    logInfo(`GET response: ${JSON.stringify(result)}`);
    return createJsonResponse(result);
}

/**
 * 處理網頁應用程式的 POST 請求：智慧路由系統
 */
function doPost(e) {
    const start = Date.now();
    try {
        const payload = JSON.parse(e.postData.contents);
        const { action, table, data, sql, procedure, params, where } = payload;
        logInfo(`POST request: ${JSON.stringify(payload)}`);
        // 1. 安全性檢查與白名單過濾
        const allowedActions = ['query', 'select', 'insert', 'update', 'delete', 'call'];
        if (!action || !allowedActions.includes(action.toLowerCase())) {
            throw new Error(`未經授權或無效的 API Action: ${action}`);
        }

        let result;
        // 2. 路由分發 (Router)
        switch (action.toLowerCase()) {
            case 'query':
                result = Database.query(sql);
                break;
            case 'select':
                // 如果沒給 SQL，則根據 table 與 where 組裝
                const finalSql = sql || `SELECT * FROM ${table} ${where ? 'WHERE ' + where : ''}`;
                result = Database.query(finalSql);
                break;
            case 'insert':
                result = Database.insert(table, data); // 內建模組支援單筆或陣列(批次)
                break;
            case 'update':
                result = Database.update(table, data, where);
                break;
            case 'delete':
                result = Database.delete(table, where);
                break;
            case 'call':
                // 3. Procedure 調度 (Orchestrator)
                result = callProcedure(procedure, params);
                break;
        }

        // 4. 根據操作類型決定是否強制落盤 (SELECT 不需要)
        const isMutation = ['insert', 'update', 'delete', 'call'].includes(action.toLowerCase());
        if (isMutation) {
            SpreadsheetApp.flush();
        }

        const executionTime = Date.now() - start;
        logInfo(`API執行成功: 耗時=${executionTime}ms, Payload=${e.postData.contents}, Result=${JSON.stringify(result)}`);
        return createJsonResponse(result);

    } catch (error) {
        let errMsg = error.message;
        const elapsed = Date.now() - start;

        // 5. 錯誤捕捉與邊際情境處理 (超時、溢位等)
        if (errMsg.includes('Exceeded maximum execution') || errMsg.includes('timeout')) {
            errMsg = '伺服器端執行超時 (Timeout)，建議分批處理或優化查詢。';
        }

        logError(`API執行失敗: ${errMsg} | 耗時=${elapsed}ms`);
        return createJsonResponse({ success: false, error: errMsg, elapsed: elapsed + 'ms' });
    }
}

/**
 * 全域 Procedure 調度器
 */
function callProcedure(procName, params) {
    const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
    const targetFunc = globalScope[procName];

    if (typeof targetFunc !== 'function') {
        throw new Error(`找不到指定的預存程序 (Procedure): ${procName}`);
    }

    // 將參數標準化為陣列
    const args = Array.isArray(params) ? params : [params];
    const result = targetFunc.apply(null, args);

    // 如果 Procedure 回傳的不是標準格式，自動包裝
    if (result && typeof result === 'object' && result.success !== undefined) {
        return result;
    }
    return { success: true, data: result };
}

/**
 * 輔助函數：建立標準 JSON 回傳格式
 * @param {any} input Database.query 的原始回傳結果
 */
function createJsonResponse(input) {
    const response = {
        status: 'success',
        message: '',
        data: null
    };

    if (input && typeof input === 'object') {
        if (input.success === false) {
            response.status = 'fail';
            response.message = input.error || '不明錯誤';
        } else if (input.success === true) {
            const { ...rest } = input;
            response.data = Object.keys(rest).length > 0 ? rest : null;
        } else {
            response.data = input;
        }
    } else {
        response.data = input;
    }
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}
