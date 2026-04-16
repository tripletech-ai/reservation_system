const TABLE_NAME = 'member';
const MANAGER_UID = "kX2p9W5y";
const sheetId = "1gGmHcKcyhI7zvSwTz2eRNmuvEHiwCeUaDRN_m85HPl4";
const sheetmember = "會員資料";
const sheetbook = "預約資料";

function all() {
  syncSheetToSupabase()
  processBookingsFromSheet()
}


function syncSheetToSupabase() {
  const ss = SpreadsheetApp.openById(sheetId)
  const sheet = ss.getSheetByName(sheetmember); // 請改成你的分頁名稱
  const data = sheet.getDataRange().getValues();

  // 取得標頭 (第一列) 以確認欄位位置
  const headers = data[0];
  const rows = data.slice(1); // 排除標頭，只拿資料

  // 定義欄位索引 (根據你的截圖順序)
  // 0: 會員ID, 1: lineUserId, 2: 姓名, 3: 電話, 4: 已綁定, 5: 建立時間, 6: 更新時間

  const payload = rows.map(row => {
    return {
      // uid 不傳，讓資料庫預設 nanoid(8) 或由 DB 生成
      uid: nanoid(8),
      manager_uid: MANAGER_UID,
      line_uid: row[1],
      name: row[2],
      phone: row[3].toString().padStart(10, '0').trim(), // 確保電話是字串
      status: row[4] === true || row[4] === "TRUE", // 轉換 checkbox 為 boolean
      create_at: new Date(row[5]).toISOString(),
      update_at: new Date(row[6]).toISOString()
    };
  });

  // 執行 API 請求
  const url = `${CONFIG.URL}/rest/v1/${TABLE_NAME}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.KEY,
      'Authorization': `Bearer ${CONFIG.KEY}`,
      'Prefer': 'return=representation' // 回傳寫入的資料（選擇性）
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    // const resContent = response.getContentText();
    // console.log(response)

  } catch (e) {
    console.log('執行發生異常：' + e.message);
  }
}



// 根據你的需求設定常數
const TIME_SLOT_INTERVAL = 30; // 分鐘
const MAX_CAPACITY_ARRAY = [100, 100, 100, 100, 100, 100, 100, 100]; // 舉例：每個時段容量為 1

function processBookingsFromSheet() {
  const ss = SpreadsheetApp.openById(sheetId)
  const sheet = ss.getSheetByName(sheetbook); // 請改成你的分頁名稱
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // 排除標頭
  let count = 0;
  let cnacelCount = 0;
  let more30d = 0;

  const sheet2 = ss.getSheetByName("管理員看的表格"); // 請確保分頁名稱正確
  const data2 = sheet2.getDataRange().getValues();

  // 從第二列開始找（索引 1），跳過標題列

  rows.forEach((row, index) => {
    // 欄位索引說明 (請依據你的試算表實際位置微調)
    // index 1: lineUserId
    // index 20: 已處理取消 (Checkbox) - 假設在第 U 欄
    // index 21: BookingID (String) - 假設在第 V 欄

    const lineUid = row[9];


    if (!lineUid) return;





    // 1. 先取得 ISO 字串
    const startTimeStr = formatToSupabaseTz(row[6].toString());
    const endTimeStr = formatToSupabaseTz(row[7].toString());


    const endDate = new Date(endTimeStr);
    const now = new Date();

    // 2. 計算 30 天前的時間點 (30天 * 24小時 * 60分 * 60秒 * 1000毫秒)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // 3. 如果結束時間早於（小於）30 天前，則 return
    if (endDate < thirtyDaysAgo) {
      console.log("30天前 index:", index)
      more30d++;
      return;
    }
    count++;
    // 2. 轉換為 Date 物件並相減（得到毫秒）
    const diffInMs = new Date(endTimeStr) - new Date(startTimeStr);

    // 3. 換算成分鐘 (1分鐘 = 60,000 毫秒)
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));



    const bookingData = {
      manager_uid: MANAGER_UID,
      line_uid: lineUid,
      name: row[2], // 姓名
      phone: row[3].toString(),
      booking_start_time: startTimeStr,
      booking_end_time: endTimeStr,
      service_item: row[5].toString(),
      service_computed_duration: diffInMinutes
    };

    const res = handleSubmitBooking(bookingData);


    const targetRow = data2.find(row2 => row2[0] === row[0]);
    if (!targetRow) return;
    console.log("uid: index:", targetRow[0], index)

    const a1d = row[22] === true || row[4] === "TRUE";
    const a3d = row[25] === true || row[4] === "TRUE";



    const is_deposit_received = targetRow[8] === true || targetRow[8] === "TRUE";
    const google_calendar_event_id = targetRow[14]


    const success = targetRow[9] === true || targetRow[9] === "TRUE";
    const applay_cancel = targetRow[10] === true || targetRow[10] === "TRUE";
    const canceled = targetRow[11] === true || targetRow[11] === "TRUE";

    let status = 10;
    if (success) {
      status = 13;
    }
    if (applay_cancel) {
      status = 3;
    }
    if (canceled) {
      status = 0;
    }

    updateBookingReminder(res.booking_uid, a1d, a3d, is_deposit_received, status, google_calendar_event_id)

    if (status == 0) {
      cnacelCount++;
      handleCancelBooking(res.booking_uid, MANAGER_UID, 30.0);
    }

  });

  console.log("total: " + rows.length + " insert: " + count + " cancel: " + cnacelCount + " more30d: " + more30d)

  // // 3. 最後呼叫自動存檔與清理
  callRpc('auto_archive_old_bookings', {});
}

/** 呼叫 submit_booking RPC */
function handleSubmitBooking(bookingData) {
  const payload = {
    p_booking_data: bookingData,
    p_max_capacity_array: MAX_CAPACITY_ARRAY,
    p_time_slot_interval: TIME_SLOT_INTERVAL
  };
  const res = callRpc('submit_booking', payload);

  return res;
}

/** 處理取消預約：先找 UID 再取消 */
function handleCancelBooking(_booking_uid, _manager_uid, _time_slot_interval, _delete_type) {

  const payload = {
    _booking_uid: _booking_uid,
    _manager_uid: _manager_uid,
    _time_slot_interval: _time_slot_interval,
    _delete_type: _delete_type || 0
  };

  const res = callRpc('cancel_booking', payload);

}

/** 通用 RPC 呼叫函式 */
function callRpc(functionName, payload) {

  const url = `${CONFIG.URL}/rest/v1/rpc/${functionName}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': CONFIG.KEY,
      'Authorization': `Bearer ${CONFIG.KEY}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);

  if (response.getContentText()) {
    return JSON.parse(response.getContentText());
  }

}

function updateBookingReminder(booking_uid, is_reminded_1d, is_reminded_3d, is_deposit_received, status, google_calendar_event_id) {
  const SUPABASE_URL = CONFIG.URL;
  const SUPABASE_KEY = CONFIG.KEY;

  // 1. 根據類型決定要更新哪個欄位
  const payload = {};
  payload.is_reminded_3d = is_reminded_3d;
  payload.is_reminded_1d = is_reminded_1d;
  payload.is_deposit_received = is_deposit_received;
  payload.status = status;
  payload.google_calendar_event_id = google_calendar_event_id;



  // 2. 建立帶有篩選條件的 URL
  // 使用 eq 運算子來比對 line_uid, booking_start_time, booking_end_time
  const url = `${SUPABASE_URL}/rest/v1/booking?` +
    // `create_at=eq.${create_at}&` +
    // `service_item=eq.${service_item}&` +
    // `phone=eq.${phone}&` +
    `uid=eq.${encodeURIComponent(booking_uid)}`;
  // `booking_start_time=eq.${encodeURIComponent(startTime)}&` +
  // `booking_end_time=eq.${encodeURIComponent(endTime)}`;



  const options = {
    method: 'patch', // 使用 patch 進行部分更新
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation' // 讓 API 回傳更新後的結果以便確認
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 || response.getResponseCode() === 204) {

    } else {

    }
  } catch (e) {
    console.log(`執行異常：${e.message}`);
  }
}


function formatToSupabaseTz(time) {
  // 1. 取得台灣時間 (假設從試算表讀取，或是手動定義)
  // 台灣 11:00 轉成 UTC (+00) 會變成 03:00
  const inputDate = new Date(time);
  const formattedDate = Utilities.formatDate(inputDate, "GMT", "yyyy-MM-dd HH:mm:ss") + "+00";

  return formattedDate;
}


function nanoid(size = 8) {
  // 標準 NanoID 使用的字符集（A-Z, a-z, 0-9, _, -）
  const alphabet = 'use_sample_2134567890ABCDEFGHIJKLMNPQRTUVWXYZOabcdefghijklmnpqrtuvwxyz';
  let id = '';

  for (let i = 0; i < size; i++) {
    // 使用 Math.random() 取得隨機索引
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    id += alphabet.charAt(randomIndex);
  }

  return id;
}


