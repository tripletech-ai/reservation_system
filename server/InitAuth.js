/**
 * 權限觸發專用函數：執行此函數以彈出授權視窗，不影響任何資料。
 */
function initAuth() {
    console.log('--- 正在觸發 Google 權限檢查 ---');

    // 1. 觸發試算表讀取權限
    const ssName = getSpreadsheetApp().getName();
    console.log(`成功連結試算表: ${ssName}`);

    // 2. 觸發外部請求權限 (UrlFetchApp)
    const response = UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
    console.log(`成功連結外部網路，狀態碼: ${response.getResponseCode()}`);

    console.log('✅ 權限授權已完成，現在可以正常執行所有 API 功能了。');
}
