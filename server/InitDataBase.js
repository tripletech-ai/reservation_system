/**
 * 一鍵初始化所有資料表
 */
function initAllTables() {
    initManagerTable();
    initMemberTable();
    initScheduleMenuTable();
    initScheduleHoursTable();
    initScheduleOverrideTable();
    initEventTable();
    initBookingTable();
    initBookingCacheTable();
    initLogTable();

}

/**
 * 通用的資料表建立函數
 */
function createTableIfNotExists(tableName, headers) {
    const ss = getSpreadsheetApp();
    let sheet = ss.getSheetByName(tableName);

    if (!sheet) {
        sheet = ss.insertSheet(tableName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        console.log(`✅ [NEW] 資料表 "${tableName}" 已建立成功。`);
    } else {
        const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(h => String(h).trim());
        
        // 如果標頭順序不完全一致，強制同步標頭
        if (currentHeaders.join(',') !== headers.join(',')) {
            console.warn(`⚠️ [SYNC] 資料表 "${tableName}" 順序不符，正在重整標頭...`);
            // 只更新第一列標頭，保留下方資料
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            
            // 如果列數不足，補齊
            if (sheet.getMaxColumns() < headers.length) {
                sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
            }
        } else {
            console.log(`ℹ️ [SKIP] 資料表 "${tableName}" 已與定義同步。`);
        }
    }
    return sheet;
}

/**
 * 遷移工具：比對並更新資料表結構
 * 包含：更名、刪除、及欄位同步
 */
function migrateDatabaseStructure() {
    const ss = getSpreadsheetApp();
    // 4. 最後跑一次全量同步，確保所有新欄位都補齊
    initAllTables();
    console.log('Database migration completed.');
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
function initMemberTable() {
    const headers = [
        'uid',
        'manager_uid',
        'name',
        'line_uid',
        'phone',
        'email',
        'questionnaire',
        'status',
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('member', headers);
}

/**
 * 預約資料表 (booking)
 */
function initBookingTable() {
    const headers = [
        'uid',
        'manager_uid',
        'name',
        'line_uid',
        'phone',
        'booking_start_time', // 預約開始時間
        'booking_end_time', // 預約開始時間
        'service_item',          // 預約項目
        'service_computed_duration',      // 預約時長
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
 * 快取預約資料表 (booking_cache)
 */
function initBookingCacheTable() {
    const headers = [
        'uid',
        'manager_uid',
        'booking_start_time', // 預約開始時間
        'booked_count',  // 已預約人數
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('booking_cache', headers);
}

/**
 * 營業時間 (schedule_times)
 */
function initScheduleHoursTable() {
    const headers = [
        'uid',
        'schedule_menu_uid',
        'time_range',    // 營業時間
        'day_of_week',   // 星期
        'max_capacity',  // 可預約人數
        'is_open',       // 是否營業
        'last_booking_time', // 最後預約時間
        'is_open_last_booking_time', // 最後預約時間是否營業
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('schedule_time', headers);
}

/**
 * 營業時間 (schedule_menu)
 */
function initScheduleMenuTable() {
    const headers = [
        'uid',
        'manager_uid',
        'name',    // 營業時間
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('schedule_menu', headers);
}

/**
 * 覆蓋日程 (schedule_override)
 */
function initScheduleOverrideTable() {
    const headers = [
        'uid',
        'schedule_menu_uid',
        'override_time', // 覆蓋時間
        'override_date', // 覆蓋日期
        'max_capacity',  // 可預約人數
        'is_closed',
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
        'manager_uid',
        'title',
        'logo_url',
        'description',          // 說明
        'is_phone_required',    // 是否需要填電話
        'is_email_required',    // 是否需要填Email
        'schedule_menu_uid',    // 營業時間選單ID
        'options',      // 服務項目選單ID
        'booking_dynamic_url',  // 預約動態網址
        'website_name', // 網站名稱
        'create_at',
        'update_at'
    ];
    createTableIfNotExists('event', headers);
}

/**
 * 建立日誌資料表 (logs)
 */
function initLogTable() {
    const headers = [
        'uid',
        'time',
        'status',   // info, warn, error
        'msg'
    ];
    createTableIfNotExists('logs', headers);
}
