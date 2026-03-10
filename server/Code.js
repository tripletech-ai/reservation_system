/**
 * 處理網頁應用程式的 GET 請求
 */
function doGet(e) {
    const query = e.parameter.query;
    if (!query) {
        return createJsonResponse({ success: false, error: '缺少 query 參數' });
    }

    const result = Database.query(query);
    return createJsonResponse(result);
}

/**
 * 處理網頁應用程式的 POST 請求
 */
function doPost(e) {
    try {
        const postData = JSON.parse(e.postData.contents);
        const query = postData.query;

        if (!query) {
            return createJsonResponse({ success: false, error: 'JSON 中缺少 query 欄位' });
        }

        const result = Database.query(query);
        return createJsonResponse(result);

    } catch (error) {
        return createJsonResponse({ success: false, error: '解析請求失敗: ' + error.message });
    }
}

/**
 * 輔助函數：建立 JSON 回傳格式
 */
function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
