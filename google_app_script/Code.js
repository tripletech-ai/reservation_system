// /**
//  * 處理網頁應用程式的 GET 請求
//  */
// function doGet(e) {
//     return null;
// }

/**
 * 接收來自 Next.js / Edge Function 的 POST 請求
 */
function doPost(e) {
    try {
        const params = JSON.parse(e.postData.contents);
        log("params1", params)
        // 將判斷邏輯交給 Router
        const result = Router.handle(params);

        log('result', result)
        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            result: result
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
