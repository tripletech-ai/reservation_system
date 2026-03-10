/**
 * SQL 自動化測試套件
 * 執行方法: 在 GAS 編輯器選擇執行 runAllTests()
 */
function runAllTests() {
    const tester = new SQLTester();

    console.log('--- 開始執行 SQL 引擎測試 (目標 100% 覆蓋率) ---');

    // 1. 基礎錯誤處理測試
    tester.test('空語法測試', () => {
        const res = Database.query('');
        return res.success === false && res.error === 'SQL 語句不能為空';
    });

    tester.test('未知命令測試', () => {
        const res = Database.query('DROP TABLE user');
        return res.success === false && res.error.includes('未支援的 SQL 命令');
    });

    // 2. 內部輔助函數測試 (單元測試)
    tester.test('TableName 解析測試', () => {
        const t1 = Database._extractTableName('SELECT * FROM user_profile', 'FROM');
        const t2 = Database._extractTableName('INSERT INTO booking_logs', 'INTO');
        return t1 === 'user_profile' && t2 === 'booking_logs';
    });

    tester.test('條件評估器 - 基礎條件', () => {
        const row = { id: 10, status: 'active' };
        return Database._evaluateCondition(row, 'id = 10') === true &&
            Database._evaluateCondition(row, "status = 'active'") === true &&
            Database._evaluateCondition(row, 'id != 5') === true;
    });

    tester.test('條件評估器 - AND/OR/BETWEEN', () => {
        const row = { price: 100, category: 'A' };
        return Database._evaluateCondition(row, 'price BETWEEN 50 AND 150') === true &&
            Database._evaluateCondition(row, "category = 'A' AND price = 100") === true &&
            Database._evaluateCondition(row, "category = 'B' OR price = 100") === true;
    });

    // 3. 整合測試 (需要實際操作試算表)
    // 建立一個臨時測試表
    const testTableName = '_test_suite_';
    setupTestTable(testTableName);

    try {
        tester.test('INSERT 測試', () => {
            const res = Database.query(`INSERT INTO ${testTableName} (uid, name, score) VALUES ('t1', 'TestUser', 99)`);
            const data = Database.query(`SELECT * FROM ${testTableName} WHERE uid = 't1'`);
            return res.success === true && data[0].name === 'TestUser' && data[0].score === 99;
        });

        tester.test('SELECT COUNT 測試', () => {
            Database.query(`INSERT INTO ${testTableName} (uid, name, score) VALUES ('t2', 'User2', 80)`);
            const res = Database.query(`SELECT COUNT(*) FROM ${testTableName}`);
            return res[0].count === 2;
        });

        tester.test('SELECT ORDER BY (數字) 測試', () => {
            const res = Database.query(`SELECT * FROM ${testTableName} ORDER BY score DESC`);
            return res[0].score === 99 && res[1].score === 80;
        });

        tester.test('SELECT LIMIT / OFFSET 測試', () => {
            const res = Database.query(`SELECT * FROM ${testTableName} LIMIT 1 OFFSET 1`);
            return res.length === 1 && res[0].uid === 't2';
        });

        tester.test('UPDATE 測試 (多欄位)', () => {
            const res = Database.query(`UPDATE ${testTableName} SET name = 'Updated', score = 50 WHERE uid = 't1'`);
            const data = Database.query(`SELECT * FROM ${testTableName} WHERE uid = 't1'`);
            return res.success === true && data[0].name === 'Updated' && data[0].score === 50;
        });

        tester.test('DELETE 測試', () => {
            const res = Database.query(`DELETE FROM ${testTableName} WHERE uid = 't1'`);
            const count = Database.query(`SELECT COUNT(*) FROM ${testTableName}`);
            return res.success === true && res.deletedCount === 1 && count[0].count === 1;
        });

        tester.test('DELETE 安全機制測試 (無 WHERE)', () => {
            const res = Database.query(`DELETE FROM ${testTableName}`);
            return res.success === false && res.error.includes('必須包含 WHERE');
        });

        tester.test('SELECT 特定欄位測試', () => {
            const res = Database.query(`SELECT name FROM ${testTableName} WHERE uid = 't2'`);
            return res.length === 1 && res[0].name === 'User2' && res[0].uid === undefined;
        });

        tester.test('多行 SQL 解析測試', () => {
            const multiLineSql = `
                INSERT INTO ${testTableName} 
                (uid, name, score) 
                VALUES 
                ('t3', 'MultiLine', 77)
            `;
            const res = Database.query(multiLineSql);
            const data = Database.query(`SELECT * FROM ${testTableName} WHERE uid = 't3'`);
            return res.success === true && data[0].name === 'MultiLine';
        });

    } finally {
        // 測試完成後刪除測試表
        const ss = getSpreadsheetApp();
        const sheet = ss.getSheetByName(testTableName);
        if (sheet) ss.deleteSheet(sheet);
    }

    tester.report();
}

/**
 * 測試輔助類別
 */
function SQLTester() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];

    this.test = function (name, fn) {
        try {
            const success = fn();
            if (success) {
                this.passed++;
                this.results.push(`✅ [PASS] ${name}`);
            } else {
                this.failed++;
                this.results.push(`❌ [FAIL] ${name}`);
            }
        } catch (e) {
            this.failed++;
            this.results.push(`💥 [ERR] ${name}: ${e.message}`);
        }
    };

    this.report = function () {
        this.results.forEach(r => console.log(r));
        console.log('-----------------------------------');
        console.log(`測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        const total = this.passed + this.failed;
        console.log(`覆蓋完整度估計: ${Math.round((this.passed / total) * 100)}%`);
        if (this.failed > 0) throw new Error('部分測試未通過');
    };
}

/**
 * 建立測試環境
 */
function setupTestTable(name) {
    const ss = getSpreadsheetApp();
    let sheet = ss.getSheetByName(name);
    if (sheet) ss.deleteSheet(sheet);

    sheet = ss.insertSheet(name);
    const headers = ['uid', 'name', 'score', 'create_at', 'update_at'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}
