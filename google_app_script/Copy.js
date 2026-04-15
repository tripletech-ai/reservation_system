const TABLE_NAME = 'member';
const MANAGER_UID = "kX2p9W5y";

function syncSheetToSupabase() {
  const ss = SpreadsheetApp.openById("1GkdI4i5jJ4rZVHtEPr5N7dJeCXeOGI-ksSgpOuHx21Q")
  const sheet = ss.getSheetByName('會員資料'); // 請改成你的分頁名稱
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
      phone: row[3].toString(), // 確保電話是字串
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
    payload: JSON.stringify(payload.slice(0, 2)),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    // const resContent = response.getContentText();
    // console.log(response)
    console.log(payload.length)
  } catch (e) {
    console.log('執行發生異常：' + e.message);
  }
}



// 根據你的需求設定常數
const TIME_SLOT_INTERVAL = 30; // 分鐘
const MAX_CAPACITY_ARRAY = [1, 1, 1, 1, 1, 1, 1, 1]; // 舉例：每個時段容量為 1

function processBookingsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('❌預約資料'); // 請確認分頁名稱
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1); // 排除標頭

  rows.forEach((row, index) => {
    // 欄位索引說明 (請依據你的試算表實際位置微調)
    // index 1: lineUserId
    // index 20: 已處理取消 (Checkbox) - 假設在第 U 欄
    // index 21: BookingID (String) - 假設在第 V 欄

    const lineUid = row[9];
    const isCancelRequested = row[24] === true || row[4] === "TRUE"; // 「已處理取消」欄位


    if (!lineUid) return;

    if (isCancelRequested) {
      // 2. 如果「已處理取消」是 true -> 呼叫 cancel_booking
      handleCancelBooking(lineUid);
    } else {
      // 1. 呼叫 submit_booking 重新預約
      // 這裡需要預約的詳細資料，假設從 row 中提取
      const bookingData = {
        manager_uid: MANAGER_UID,
        line_uid: lineUid,
        name: row[2], // 姓名
        phone: row[3].toString(),
        booking_start_time: formatToSupabaseTz(row[6].toString()),
        booking_end_time: formatToSupabaseTz(row[7].toString()),
        service_item: row[5].toString(),
        service_computed_duration: 30
      };
      handleSubmitBooking(bookingData);
    }
  });


  rows.forEach((row, index) => {
    const lineUid = row[9];
    const booking_start_time = formatToSupabaseTz(row[6].toString());
    const booking_end_time = formatToSupabaseTz(row[7].toString());
    const a1d = row[22] === true || row[4] === "TRUE";
    const a3d = row[25] === true || row[4] === "TRUE";
    const is_deposit_received = row[17] === true || row[4] === "TRUE";
    const apply_cancel = row[18] === true || row[4] === "TRUE"
    updateBookingReminder(lineUid, booking_start_time, booking_end_time, a1d, a3d, is_deposit_received, apply_cancel)
  });
  // 3. 最後呼叫自動存檔與清理
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
  Logger.log('Submit Result: ' + JSON.stringify(res));
}

/** 處理取消預約：先找 UID 再取消 */
function handleCancelBooking(lineUid) {
  // 先去 Supabase 找該 line_uid 目前 status=1 (預約中) 的最新一筆資料
  const queryUrl = `${CONFIG.URL}/rest/v1/booking?line_uid=eq.${lineUid}&status=eq.1&select=uid&order=create_at.desc&limit=1`;
  const options = {
    method: 'get',
    headers: { 'apikey': CONFIG.KEY, 'Authorization': `Bearer ${CONFIG.KEY}` }
  };

  const response = UrlFetchApp.fetch(queryUrl, options);
  const result = JSON.parse(response.getContentText());

  if (result.length > 0) {
    const bookingUid = result[0].uid;
    const cancelPayload = {
      _booking_uid: bookingUid,
      _manager_uid: MANAGER_UID,
      _time_slot_interval: TIME_SLOT_INTERVAL,
      _delete_type: 0 // 0: 移至備份並刪除
    };
    const res = callRpc('cancel_booking', cancelPayload);
    Logger.log('Cancel Result: ' + JSON.stringify(res));
  } else {
    Logger.log('找不到可取消的預約: ' + lineUid);
  }
}

/** 通用 RPC 呼叫函式 */
function callRpc(functionName, payload) {
  const url = `${CONFIG.KEY}/rest/v1/rpc/${functionName}`;
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
  return JSON.parse(response.getContentText());
}

function updateBookingReminder(lineUid, startTime, endTime, is_reminded_1d, is_reminded_3d, is_deposit_received, apply_cancel) {
  const SUPABASE_URL = CONFIG.URL;
  const SUPABASE_KEY = CONFIG.KEY;

  // 1. 根據類型決定要更新哪個欄位
  const payload = {};
  payload.is_reminded_3d = is_reminded_3d;
  payload.is_reminded_1d = is_reminded_1d;
  payload.is_deposit_received = is_deposit_received;
  if (apply_cancel) {
    payload.status = 3;
  }



  // 2. 建立帶有篩選條件的 URL
  // 使用 eq 運算子來比對 line_uid, booking_start_time, booking_end_time
  const url = `${SUPABASE_URL}/rest/v1/booking?` +
    `line_uid=eq.${encodeURIComponent(lineUid)}&` +
    `booking_start_time=eq.${encodeURIComponent(startTime)}&` +
    `booking_end_time=eq.${encodeURIComponent(endTime)}`;

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
      console.log(`成功更新 ${type} 提醒標記！`);
      console.log(result);
    } else {
      console.log(`更新失敗：${response.getContentText()}`);
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


