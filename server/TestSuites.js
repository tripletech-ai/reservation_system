

function testAll() {
    console.log('🧪 --- 開始自動化整合測試報告 ---');
    const results = [];

    // 助手函數：紀錄結果
    const record = (name, pass, msg = '') => {
        results.push({ name, status: pass ? '✅ PASS' : '❌ FAIL', detail: msg });
        if (pass) console.log(`✅ [${name}] 通過`);
        else console.error(`❌ [${name}] 失敗: ${msg}`);
    };

    try {
        // 1. 測試 INSERT
        const resInsert = callApi_mock({
            action: 'insert',
            table: 'logs',
            data: { uid: 'T_AUTO_01', time: new Date().toISOString(), status: 'test', msg: '自動化測試' }
        });
        record('Insert 測試', resInsert.status === 'success');

        // 2. 測試 SELECT
        const resSelect = callApi_mock({
            action: 'select',
            sql: "SELECT uid, msg FROM logs WHERE uid = 'T_AUTO_01'"
        });
        const selectPass = resSelect.data && resSelect.data.length > 0 && resSelect.data[0].uid === 'T_AUTO_01';
        record('Select 查詢比對', selectPass, selectPass ? '' : '找不到資料或 UID 不符');

        // 3. 測試 UPDATE
        const resUpdate = callApi_mock({
            action: 'update',
            table: 'logs',
            where: "uid = 'T_AUTO_01'",
            data: { msg: '已更新' }
        });
        const updatePass = resUpdate.data && resUpdate.data.updatedCount >= 1;
        record('Update 更新確認', updatePass, updatePass ? '' : `更新筆數不符: ${JSON.stringify(resUpdate.data)}`);

        // 4. 測試 DELETE
        const resDelete = callApi_mock({
            action: 'delete',
            table: 'logs',
            where: "uid = 'T_AUTO_01'"
        });
        const deletePass = resDelete.data && resDelete.data.deletedCount >= 1;
        record('Delete 刪除確認', deletePass, deletePass ? '' : '刪除筆數不符');

    } catch (e) {
        console.error('💥 測試中途崩潰:', e.toString());
    }

    // --- 總結報告 ---
    console.log('\n📊 --- 測試總結報告 ---');
    console.log(results);
    const failedCount = results.filter(r => r.status.includes('FAIL')).length;
    if (failedCount === 0) {
        console.log('🎉 恭喜！所有核心資料庫功能均運作正常。');
    } else {
        console.error(`⚠️ 警告：有 ${failedCount} 個測試站點失敗，請檢查上述日誌。`);
    }
}



/**
 * 測試 1: 模擬前端寫入 Log
 */
function testLogsInsert() {
    console.log('🧪 執行單步測試: logs INSERT');
    const res = callApi_mock({
        action: 'insert',
        table: 'logs',
        data: { uid: 'DEBUG_01', time: '2026-03-18 16:38:53', status: 'info', msg: '我是前端傳來的訊息' }
    });
    console.log('Result:', JSON.stringify(res));
}

/**
 * 測試 2: 模擬前端查詢 Log (SQL 語法)
 */
function testLogsSelect() {
    console.log('🧪 執行單步測試: logs SELECT');
    const res = callApi_mock({
        action: 'select',
        sql: "SELECT uid, msg FROM logs WHERE uid = 'DEBUG_01'"
    });
    console.log('Result:', JSON.stringify(res));
}

/**
 * 測試 3: 模擬前端更新某筆 Log
 */
function testLogsUpdate() {
    console.log('🧪 執行單步測試: logs UPDATE');
    const res = callApi_mock({
        action: 'update',
        table: 'logs',
        where: "uid = 'DEBUG_01'",
        data: { msg: '我被前端更新了！3', status: 'updated' }
    });
    console.log('Result:', JSON.stringify(res));
}

/**
 * 測試 4: 模擬前端刪除 Log
 */
function testLogsDelete() {
    console.log('🧪 執行單步測試: logs DELETE');
    const res = callApi_mock({
        action: 'delete',
        table: 'logs',
        where: "uid = 'DEBUG_01'"
    });
    console.log('Result:', JSON.stringify(res));
}

/**
 * 共用助手函數：模擬前端 POST 呼叫 (為了避免與內部同名函數衝突，更名為 callApi_mock)
 */
function callApi_mock(payload) {
    const e = { postData: { contents: JSON.stringify(payload) } };
    const response = doPost(e);
    return JSON.parse(response.getContent());
}
