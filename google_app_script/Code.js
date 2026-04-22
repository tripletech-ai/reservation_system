// /**
//  * 處理網頁應用程式的 GET 請求
//  */
// function doGet(e) {
//   return doPost(e);
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

        const { data } = params;
        log('result', result)
        if (data?.booking_uid) {
            updateBookingInSupabase(data.booking_uid, result)
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            result: result
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        log('error', error)
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
/**
 * 使用 Supabase REST API 更新資料
 */
function updateBookingInSupabase(bookingUid, eventId) {
    const url = `${CONFIG.URL}/rest/v1/booking?uid=eq.${bookingUid}`;

    const payload = {
        google_calendar_event_id: eventId
    };

    const options = {
        method: "patch",
        contentType: "application/json",
        headers: {
            "apikey": CONFIG.KEY,
            "Authorization": `Bearer ${CONFIG.KEY}`,
            "Prefer": "return=minimal"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode >= 200 && responseCode < 300) {
        log("Supabase 更新成功:", bookingUid);
        return true;
    } else {
        log("Supabase 更新失敗:", response.getContentText());
        throw new Error(`Supabase API Error: ${responseCode}`);
    }
}