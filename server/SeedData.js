/**
 * 建立完整關連性的測試假資料
 * 改為使用 doPost 路由方式，驗證 Code.js 與 DatabaseEngine.js 的整合
 */
function seedAllData() {
    console.log('🚀 開始執行整合後的 SeedData (模擬 POST 路由)...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = Utilities.formatDate(tomorrow, 'GMT+8', 'yyyy-MM-dd');

    // 1. 清除舊資料 (直接調用清空)
    clearAllData();

    // 2. 建立管理者 (保持型別正確)
    const questDef = [
        { title: "身體評估", options: [{ title: "正常" }, { title: "過敏" }] },
        { title: "偏好力道", options: [{ title: "強" }, { title: "中" }] }
    ];

    const managers = [
        { uid: 'MGR_001', account: 'admin', name: '店長 A', password: 'admin', logo_url: 'hnp.png' },
        { uid: 'MGR_002', account: 'manager_b', name: '店長 B', password: 'password123', logo_url: 'hnp.png' }
    ];

    managers.forEach(m => {
        mockPost({
            action: 'insert',
            table: 'manager',
            data: {
                uid: m.uid,
                account: m.account,
                password: m.password,
                website_name: m.name,
                questionnaire: JSON.stringify(questDef),
                logo_url: m.logo_url
            }
        });
        console.log(`✅ [INSERT] Manager ${m.uid} OK`);
    });

    // 3. 批次建立會員 (保持數字 status)
    const membersData = [
        { uid: 'U_001', manager_uid: 'MGR_001', name: '測試會員 A', line_uid: 'L_01', phone: '0911', status: 1 },
        { uid: 'U_002', manager_uid: 'MGR_001', name: '測試會員 B', line_uid: 'L_02', phone: '0922', status: 1 },
        { uid: 'U_003', manager_uid: 'MGR_001', name: '測試會員 C', line_uid: 'L_03', phone: '0933', status: 0 }
    ];
    
    const resBatch = mockPost({
        action: 'insert',
        table: 'member',
        data: membersData
    });
    console.log(`✅ [BATCH INSERT] Members count: ${resBatch.data ? resBatch.data.count : 0}`);

    console.log('✨ SeedData 初始化完成！');
}

/**
 * 模擬前端呼叫 doPost
 */
function mockPost(payload) {
    const e = {
        postData: {
            contents: JSON.stringify(payload)
        }
    };
    const response = doPost(e);
    return JSON.parse(response.getContent());
}

/**
 * 整合效能驗證：驗證新 SQL 引擎的 Gviz SELECT 與 批次 UPDATE
 */
function runFrontendIntegrationTest() {
    console.log('🧪 執行效能整合驗證...');

    // (A) 高效 SELECT (只要傳入 SQL 即可)
    const resSelect = mockPost({
        action: 'select',
        sql: "SELECT uid, name FROM member WHERE manager_uid = 'MGR_001' ORDER BY uid DESC"
    });
    console.log(`📡 [POST SELECT] 成員數: ${resSelect.data ? resSelect.data.length : 0}`);

    // (B) 批次 UPDATE (Action = update)
    const resUpdate = mockPost({
        action: 'update',
        table: 'member',
        data: { status: 2 },
        where: "status = 1"
    });
    console.log(`🔄 [POST UPDATE] 成功批次更新筆數: ${resUpdate.data ? resUpdate.data.updatedCount : 0}`);

    // (C) 驗證 Action = query (直接跑 SQL)
    const resQuery = mockPost({
        action: 'query',
        sql: "SELECT COUNT(*) as active_count FROM member WHERE status = 2"
    });
    console.log(`🔍 [POST QUERY] Active 人數統計: ${JSON.stringify(resQuery.data)}`);
}

/**
 * 清空所有相關資料表
 */
function clearAllData() {
    const tables = ['manager', 'member', 'booking', 'schedule_times', 'schedule_menu', 'schedule_override', 'event', 'logs', 'booking_cache'];
    const ss = getSpreadsheetApp();
    tables.forEach(name => {
        const sheet = ss.getSheetByName(name);
        if (sheet && sheet.getLastRow() > 1) {
            // 安全做法：先清空內容
            sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
            // 如果行數太多，刪除多餘的行（至少保留兩行以策安全）
            if (sheet.getMaxRows() > 2) {
                sheet.deleteRows(2, sheet.getMaxRows() - 2);
            }
            console.log(`掃除中: ${name}`);
        }
    });
}
