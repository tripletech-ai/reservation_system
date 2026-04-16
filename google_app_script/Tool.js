/**
 * 強化版 Log 工具：支援多參數輸入
 * 呼叫範例：log("標題", "內容物件", "ERROR")
 */
function log(...args) {
    const ssId = "1UHsomTB7nn-3wEAGyr26xdEeDvGv1Y_B-wO7q8-_YAg";
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName("log") || ss.insertSheet("log");

    // 如果是新分頁，初始化標題
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(["時間", "層級", "內容"]);
        sheet.setFrozenRows(1);
    }

    let level = "INFO";
    let contentParts = [];

    // 邏輯判斷：如果最後一個參數是特定的 Level 標籤（全大寫），則抽出來當 Level
    const lastArg = args[args.length - 1];
    const levels = ["INFO", "WARN", "ERROR", "SUCCESS", "DEBUG"];

    if (args.length > 1 && typeof lastArg === "string" && levels.includes(lastArg.toUpperCase())) {
        level = args.pop().toUpperCase();
    }

    // 將剩餘的所有參數轉為字串（物件會自動縮排）
    contentParts = args.map(arg => {
        return (typeof arg === 'object') ? JSON.stringify(arg, null, 2) : String(arg);
    });

    const message = contentParts.join(" | "); // 用分隔符號連起來
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([timestamp, level, message]);
}