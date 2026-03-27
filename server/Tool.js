/**
 * 通用 Log 工具：將訊息寫入 Google Sheet 的 "log" 分頁
 * @param {string} message - 要記錄的訊息內容
 * @param {string} level - 訊息等級 (例如：INFO, WARN, ERROR)，預設為 INFO
 */
function log(message, level = "INFO") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("logs");

    // 如果找不到名為 "log" 的分頁，就自動建立一個
    if (!sheet) {
        sheet = ss.insertSheet("log");
        sheet.appendRow(["時間", "層級", "內容"]); // 建立標題列
        sheet.setFrozenRows(1); // 凍結首行
    }

    // 取得現在時間並寫入新行
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([timestamp, level, message]);
}