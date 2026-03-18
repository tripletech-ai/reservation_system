function clearSchemaCache() {
    const ss = getSpreadsheetApp();
    const sheets = ss.getSheets();
    const cache = CacheService.getScriptCache();
    
    console.log('🧹 開始清理所有表格快取...');
    sheets.forEach(sheet => {
        const name = sheet.getName();
        cache.remove(`schema_v1_${name}`);
        cache.remove(`schema_v2_${name}`);
        cache.remove(`schema_v3_${name}`);
        cache.remove(`schema_v4_${name}`);
        console.log(`- 已清除表 [${name}] 的快取`);
    });
    
    console.log('✅ 所有快取已清除完畢');
}