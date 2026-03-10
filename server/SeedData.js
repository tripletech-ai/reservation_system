/**
 * 建立完整關連性的測試假資料
 * 包含：Manager, User, ServiceItem, BusinessHours, Event, ScheduleOverride, Booking
 */
function seedAllData() {
    console.log('🚀 開始插入完整關聯測試資料...');

    // 1. 定義常數 ID 以利關連
    const MGR_ID = 'MGR_001';
    const MENU_A = 'MENU_MASSAGE';
    const MENU_B = 'MENU_BEAUTY';
    const BH_ID_WEEKDAY = 'BH_WEEKDAY';
    const BH_ID_WEEKEND = 'BH_WEEKEND';

    // 2. 清除舊資料
    clearAllData();

    // 3. 建立管理者 (Manager) - 定義問卷結構
    const questDef = [
        {
            title: "身體評估",
            options: [{ title: "正常" }, { title: "過敏" }, { title: "肌肉緊繃" }, { title: "受傷中" }]
        },
        {
            title: "偏好力道",
            options: [{ title: "強" }, { title: "中" }, { title: "輕" }]
        }
    ];

    Database.query(`INSERT INTO manager (
        uid, account,password,logo_url, website_name, bank_name, bank_account, bank_account_owner, questionnaire
    ) VALUES (
        '${MGR_ID}', 'admin@relax.com','1234','https://drive.google.com/uc?export=view&id=1JPnDw91jJiaH478ZhrBKRHh0vvowAyZx','靜心紓壓館', '國泰世華', '123-456-789', '陳大志', '${JSON.stringify(questDef).replace(/'/g, "''")}'
    )`);
    console.log('✅ Manager 插入完成');

    // 4. 建立服務項目 (Service Items)
    const services = [
        { uid: 'S_001', menu: MENU_A, title: '瑞典式油壓', dur: '60' },
        { uid: 'S_002', menu: MENU_A, title: '深層筋膜放鬆', dur: '90' },
        { uid: 'S_003', menu: MENU_B, title: '煥采臉部護理', dur: '45' },
        { uid: 'S_004', menu: MENU_B, title: '保濕深層清粉刺', dur: '60' }
    ];
    services.forEach(s => {
        Database.query(`INSERT INTO service_item (uid, service_menu_id, title, duration) VALUES ('${s.uid}', '${s.menu}', '${s.title}', '${s.dur}')`);
    });
    console.log('✅ Service Items 插入完成');

    // 5. 建立營業時間 (Business Hours)
    Database.query(`INSERT INTO business_hours (uid, userUid, day_of_week, time_range, max_capacity) VALUES ('${BH_ID_WEEKDAY}', '${MGR_ID}', '1,2,3,4,5', '10:00-20:00', '3')`);
    Database.query(`INSERT INTO business_hours (uid, userUid, day_of_week, time_range, max_capacity) VALUES ('${BH_ID_WEEKEND}', '${MGR_ID}', '6,0', '11:00-18:00', '2')`);
    console.log('✅ Business Hours 插入完成');

    // 6. 建立預約活動 (Event) - 關連服務選單與營業時間
    Database.query(`INSERT INTO event (
        uid, userUid, title, description, service_menu_id, service_menu_name, business_hours_ids, is_phone_required
    ) VALUES (
        'E_001', '${MGR_ID}', '平日紓壓專案', '限週一至週五預約', '${MENU_A}', '專業按摩', '${BH_ID_WEEKDAY}', 'true'
    )`);
    Database.query(`INSERT INTO event (
        uid, userUid, title, description, service_menu_id, service_menu_name, business_hours_ids, is_phone_required
    ) VALUES (
        'E_002', '${MGR_ID}', '週末美顏季', '週末限定保養', '${MENU_B}', '美容護理', '${BH_ID_WEEKEND}', 'true'
    )`);
    console.log('✅ Events 插入完成');

    // 7. 建立使用者 (User) - 回答問卷
    const users = [
        { uid: 'U_001', name: '王小華', luid: 'line_w_01', phone: '0912111222', q: '正常,強' },
        { uid: 'U_002', name: '李阿美', luid: 'line_l_02', phone: '0922333444', q: '肌肉緊繃,中' },
        { uid: 'U_003', name: '張大名', luid: 'line_z_03', phone: '0933555666', q: '過敏,輕' }
    ];
    users.forEach(u => {
        Database.query(`INSERT INTO user (uid, name, line_uid, phone, questionnaire, status) VALUES ('${u.uid}', '${u.name}', '${u.luid}', '${u.phone}', '${u.q}', 'active')`);
    });
    console.log('✅ Users 插入完成');

    // 8. 建立預約記錄 (Booking) - 關連使用者與服務項目
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    const bookings = [
        { uid: 'B_001', user: users[0], service: 'S_001', start: '10:00', end: '11:00', deposit: 'true' },
        { uid: 'B_002', user: users[1], service: 'S_002', start: '14:00', end: '15:30', deposit: 'false' },
        { uid: 'B_003', user: users[2], service: 'S_003', start: '16:00', end: '16:45', deposit: 'true' }
    ];

    bookings.forEach(b => {
        Database.query(`INSERT INTO booking (
            uid, name, line_uid, phone, booking_start_time, booking_end_time, service_id, is_deposit_received, is_cancelled
        ) VALUES (
            '${b.uid}', '${b.user.name}', '${b.user.luid}', '${b.user.phone}', '${dateStr}T${b.start}:00', '${dateStr}T${b.end}:00', '${b.service}', '${b.deposit}', 'false'
        )`);
    });
    console.log('✅ Bookings 插入完成');

    // 9. 覆蓋日程 (Schedule Override) - 例如某天休假
    Database.query(`INSERT INTO schedule_override (uid, userUid, override_date, override_time, max_capacity) VALUES (
        'OV_001', '${MGR_ID}', '2026-05-01', '00:00-23:59', '0'
    )`);
    console.log('✅ Schedule Override 插入完成');

    console.log('✨ 測試資料插入作業全部結束！');
}

/**
 * 清空所有相關資料表
 */
function clearAllData() {
    const tables = ['manager', 'user', 'booking', 'business_hours', 'schedule_override', 'event', 'service_item'];
    const ss = getSpreadsheetApp();
    tables.forEach(name => {
        const sheet = ss.getSheetByName(name);
        if (sheet && sheet.getLastRow() > 1) {
            sheet.deleteRows(2, sheet.getLastRow() - 1);
            console.log(`🧹 已清空表: ${name}`);
        }
    });
}
