/**
 * 一鍵初始化所有資料表
 */
function initAllTables() {
    initManagerTable();
    initUserTable();
    initBookingTable();
    initBusinessHoursTable();
    initScheduleOverrideTable();
    initEventTable();
    initServiceItemTable();
}

/**
 * 通用的資料表建立函數
 */
function createTableIfNotExists(tableName, headers) {
    const ss = getSpreadsheetApp();
    let sheet = ss.getSheetByName(tableName);

    if (!sheet) {
        sheet = ss.insertSheet(tableName);
        // 寫入標題欄
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        // 凍結第一列標題
        sheet.setFrozenRows(1);
        console.log(`Table "${tableName}" created successfully.`);
    } else {
        console.log(`Table "${tableName}" already exists. Checking for missing columns...`);
        // 取得現有標題
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const missingHeaders = headers.filter(h => !currentHeaders.includes(h));

        if (missingHeaders.length > 0) {
            const nextCol = sheet.getLastColumn() + 1;
            sheet.getRange(1, nextCol, 1, missingHeaders.length).setValues([missingHeaders]);
            console.log(`Updated "${tableName}": Added columns [${missingHeaders.join(', ')}]`);
        }
    }
    return sheet;
}


/**
 * 建立管理者資料表 (manager)
 */
function initManagerTable() {
    const headers = [
        'uid',
        'account',
        'password',
        'logo_url',
        'website_name',
        'google_calendar_id',
        'bank_name',
        'bank_account',
        'bank_account_owner',
        'line_notify_content',
        'questionnaire',
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('manager', headers);
}


/**
 * 建立使用者資料表 (user)
 */
function initUserTable() {
    const headers = [
        'uid',
        'name',
        'line_uid',
        'phone',
        'questionnaire',
        'status',
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('user', headers);
}

/**
 * 預約資料表 (booking)
 */
function initBookingTable() {
    const headers = [
        'uid',
        'name',
        'line_uid',
        'phone',
        'booking_start_time', // 預約開始時間
        'booking_end_time', // 預約開始時間
        'service_id',          // 預約項目ID
        'is_deposit_received', // 是否收到定金
        'is_cancelled',        // 是否取消預約
        'reminded_1day_sent',   // 已傳送一天前提醒
        'reminded_2days_sent',  // 已傳送兩天前提醒
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('booking', headers);
}

/**
 * 營業時間 (business_hours)
 */
function initBusinessHoursTable() {
    const headers = [
        'uid',
        'userUid',
        'time_range',    // 營業時間
        'day_of_week',   // 星期
        'max_capacity',  // 可預約人數
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('business_hours', headers);
}

/**
 * 覆蓋日程 (schedule_override)
 */
function initScheduleOverrideTable() {
    const headers = [
        'uid',
        'userUid',
        'override_time', // 覆蓋時間
        'override_date', // 覆蓋日期
        'max_capacity',  // 可預約人數
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('schedule_override', headers);
}

/**
 * 事件 (event)
 */
function initEventTable() {
    const headers = [
        'uid',
        'userUid',
        'title',
        'description',          // 說明
        'is_phone_required',    // 是否需要填電話
        'is_email_required',    // 是否需要填Email
        'service_menu_id',      // 服務項目選單ID
        'service_menu_name',    // 服務項目選單名稱
        'business_hours_ids',   // 營業時間ID(可以多選)
        'booking_dynamic_url',  // 預約動態網址
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('event', headers);
}

/**
 * 服務項目 (service_item)
 */
function initServiceItemTable() {
    const headers = [
        'uid',
        'service_menu_id', // 服務項目選單ID
        'title',
        'duration',         // time (持續時間)
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('service_item', headers);
}
