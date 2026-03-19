/**
 * 預約程序：儲存預約並同步更新快取
 * 
 * 1. 儲存原始預約資料到 booking 表
 * 2. 統計該時段的人數，更新或新增到 booking_cache 表
 * 
 * @param {Object} data 預約資料
 * @returns {Object} 執行結果
 */
function submitBooking(data) {
    // 1. 先解析資料 (如果是字串) 以取得 manager_uid
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
    }

    const managerUid = data.manager_uid || 'unknown';
    const lockKey = 'lock_mgr_' + managerUid;
    const projectLock = LockService.getScriptLock();
    const cache = CacheService.getScriptCache();
    let isLocked = false;

    try {
        // 2. 具名鎖定邏輯：當 manager_uid 一樣時才互斥
        // 透過全域鎖快速檢查並標記 Cache，實現分區並行
        const timeout = 30000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (projectLock.tryLock(500)) {
                try {
                    if (!cache.get(lockKey)) {
                        cache.put(lockKey, '1', 60); // 鎖定 60 秒防止掛掉不放
                        isLocked = true;
                        break;
                    }
                } finally {
                    projectLock.releaseLock();
                }
            }
            Utilities.sleep(Math.random() * 200 + 100);
        }

        if (!isLocked) throw new Error('伺服器忙碌中 (Manager Lock Timeout)');

        // 3. 儲存預約主表資料 (使用全新安全的 insert 方法)
        Database.insert('booking', {
            uid: data.uid,
            manager_uid: data.manager_uid,
            name: data.name,
            line_uid: data.line_uid,
            phone: data.phone,
            booking_start_time: data.booking_start_time,
            booking_end_time: data.booking_end_time,
            service_item: data.service_item,
            service_computed_duration: data.service_computed_duration || 60,
            is_deposit_received: data.is_deposit_received || false,
            is_cancelled: false
        });

        // 4. 更新預約快取表 (booking_cache)
        const startDate = new Date(data.booking_start_time.replace(/-/g, '/'));
        const endDate = new Date(data.booking_end_time.replace(/-/g, '/'));
        let currentSlot = new Date(startDate);
        currentSlot.setMinutes(0, 0, 0);

        const taskList = [];
        let currentIndex = 0;
        while (currentSlot <= endDate) {
            const slotStr = Utilities.formatDate(currentSlot, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
            const checkCacheSql = `SELECT uid, booked_count FROM booking_cache WHERE manager_uid = '${data.manager_uid}' AND booking_start_time = '${slotStr}'`;
            const value = Database.query(checkCacheSql);

            if (value && value.length > 0) {
                const record = value[0];
                const nextCount = (Number(record.booked_count) || 0) + 1;
                const max_capacity = data.max_capacity_array[currentIndex];
                if (nextCount > max_capacity) {
                    return { success: true, msg: '該時段已滿' };
                }
            }
            taskList.push({ slot: slotStr, data: value });
            currentSlot.setMinutes(currentSlot.getMinutes() + data.time_slot_interval);
            currentIndex++;
        }

        // 5. 批次更新或建立快取 (使用物件導向更新方法)
        taskList.forEach(task => {
            const value = task.data;
            if (value && value.length > 0) {
                const record = value[0];
                const nextCount = (Number(record.booked_count) || 0) + 1;
                Database.update('booking_cache', { booked_count: nextCount }, `uid = '${record.uid}'`);
            } else {
                const cacheUid = Utilities.getUuid();
                Database.insert('booking_cache', {
                    uid: cacheUid,
                    manager_uid: data.manager_uid,
                    booking_start_time: task.slot,
                    booked_count: 1
                });
            }
        });


        return {
            success: true,
            msg: '預約成功',
        };

    } catch (e) {
        logError(`submitBooking Procedure Error: ${e.message}`);
        return { success: false, error: '預約程序失敗: ' + e.message };
    } finally {
        // 5. 釋放具名鎖
        if (isLocked) cache.remove(lockKey);
    }
}

/**
 * 腳本 2：根據 manager_uid 取得完整的排班配置 (Menu + Time Slots)
 * 
 * @param {string} managerUid 管理員唯一識別碼
 * @returns {Object} 包含 menus 與 times 陣列的結果
 */
function getManagerScheduleConfig(managerUid) {
    if (!managerUid) throw new Error("必須提供 manager_uid");

    console.log(`🔍 [PROC] 正在讀取管理員 ${managerUid} 的排班配置...`);

    // 分別查詢選單與時段
    const menus = Database.query(`SELECT * FROM schedule_menu WHERE manager_uid = '${managerUid}' ORDER BY create_at DESC`);
    let times = [];
    if (menus && menus.length > 0) {
        times = Database.query(`SELECT * FROM schedule_time WHERE schedule_menu_uid = '${menus[0].uid}' ORDER BY day_of_week ASC`);
    }

    return {
        success: true,
        manager_uid: managerUid,
        menus: menus || [],
        times: times || []
    };
}

/**
 * 腳本 3：同步儲存或更新排班配置 (Menu + Time Slots)
 * 解決「存入新排班」與「更新舊排班」的混合場景
 * 
 * @param {Object} config 包含 menu 與 times 的配置物件
 * @returns {Object} 執行結果
 */
function saveScheduleConfig(config) {
    // 增加字串解析防呆 (處理前端可能把 params 誤傳成字串編碼的情況)
    if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) { }
    }

    const { menu, times } = config;

    if (!menu || !menu.uid || !menu.manager_uid) {
        logError(`💾 [PROC] 排班配置失敗，缺少必要參數: ${JSON.stringify(config)}`);
        throw new Error("v1必須提供 menu、menu.uid 與 menu.manager_uid");
    }

    const start = Date.now();
    console.log(`💾 [PROC] 正在處理排班配置: ${menu.name || '未命名'} (UID: ${menu.uid})...`);

    // 1. 【UPSERT Menu】 判斷是否存在，存在則更新所有欄位，不存在則插入
    const checkMenu = Database.query(`SELECT uid FROM schedule_menu WHERE uid = '${menu.uid}'`);
    if (checkMenu && checkMenu.length > 0) {
        const updateData = { ...menu };
        delete updateData.uid; // 不更新主鍵
        Database.update('schedule_menu', updateData, `uid = '${menu.uid}'`);
        console.log(`- 已更新 Menu [${menu.uid}]`);
    } else {
        Database.insert('schedule_menu', menu);
        console.log(`- 已建立新 Menu [${menu.uid}]`);
    }

    // 2. 【Hard Sync Times】 清除該菜單舊的所有時段，並重新寫入，確保與前端順序一致
    Database.delete('schedule_time', `schedule_menu_uid = '${menu.uid}'`);

    if (times && times.length > 0) {
        const finalTimes = times.map(t => ({
            uid: t.uid || Utilities.getUuid(),
            manager_uid: menu.manager_uid,
            schedule_menu_uid: menu.uid,
            ...t
        }));
        Database.insert('schedule_time', finalTimes);
        console.log(`- 已同步 ${times.length} 個時段`);
    }

    return {
        success: true,
        msg: `排班配置儲存成功`,
        data: {
            menu_uid: menu.uid,
            elapsed: (Date.now() - start) + 'ms'
        }
    };
}

/**
 * 腳本 4：判斷會員狀態並取得活動與排班配置
 * 
 * 1. 若 member 不存在：透過 manager_uid 查詢 manager 的 questionnaire。
 * 2. 若 member 存在：透過 booking_dynamic_url 與 website_name 查詢 event，並透過其 schedule_menu_uid 找尋對應的時段及覆蓋資料。
 * 
 * @param {string} lineUid LINE UID
 * @param {string} bookingDynamicUrl 預約動態網址
 * @param {string} websiteName 網站名稱
 */
function getMemberEventInfo(lineUid, bookingDynamicUrl, websiteName, scheduleMenuUid) {
    if (!bookingDynamicUrl || !websiteName) {
        throw new Error("必須提供 booking_dynamic_url 與 website_name");
    }


    const hasMember = () => {
        // 會員存在 => 搜尋 event => 找尋 schedule_override, schedule_time
        console.log(`- 會員存在，查詢 event 資料: url=${bookingDynamicUrl}, website=${websiteName}`);

        if (!eventRecords || eventRecords.length === 0) {
            return {
                success: true,
                is_member: true,
                msg: "找不到符合的 event 資料"
            };
        }

        const eventData = eventRecords[0];

        let overrideRecords = [];
        let timeRecords = [];

        if (scheduleMenuUid) {
            overrideRecords = Database.query(`SELECT * FROM schedule_override WHERE schedule_menu_uid = '${scheduleMenuUid}'`) || [];
            timeRecords = Database.query(`SELECT * FROM schedule_time WHERE schedule_menu_uid = '${scheduleMenuUid}'`) || [];
            bookingCache = Database.query(`SELECT * FROM booking_cache WHERE manager_uid = '${eventData.manager_uid}'`) || [];
        }

        return {
            success: true,
            is_member: true,
            event: eventData,
            schedule_override: overrideRecords,
            schedule_time: timeRecords,
            booking_cache: bookingCache
        };
    }

    const noMember = () => {
        const managerUid = eventRecords[0].manager_uid;
        console.log(`- 會員不存在，查詢 manager_uid=${managerUid} 的問卷`);

        const managerRecords = Database.query(`SELECT questionnaire FROM manager WHERE uid = '${managerUid}'`);
        const questionnaire = (managerRecords && managerRecords.length > 0) ? managerRecords[0].questionnaire : null;

        return {
            success: true,
            is_member: false,
            event: eventRecords[0],
            questionnaire: questionnaire
        };
    }

    // 1. 查詢 member table 是否有這個 line_uid
    const eventRecords = Database.query(`SELECT * FROM event WHERE booking_dynamic_url = '${bookingDynamicUrl}' AND website_name = '${websiteName}'`);

    if (!lineUid) {
        return hasMember();
    }

    const memberRecords = Database.query(`SELECT manager_uid FROM member WHERE line_uid = '${lineUid}'`);
    if (memberRecords && memberRecords.length > 0) {
        return hasMember();
    } else {
        return noMember();
    }

}

/**
 * 腳本 5：取消預約並同步扣減快取計數
 * 
 * 1. 根據 booking uid 取得預約資料 (manager_uid, start, end)
 * 2. 刪除 booking 主表
 * 3. 根據時段範圍，對每個 booking_cache slot 的 booked_count 減 1
 *    若 booked_count <= 0，直接刪除該 cache 紀錄
 * 
 * @param {string} bookingUid 要取消的預約 uid
 */
function cancelBooking(bookingUid, time_slot_interval, deleteType) {
    if (!bookingUid) throw new Error("必須提供 booking uid");

    const projectLock = LockService.getScriptLock();
    const cache = CacheService.getScriptCache();
    let lockKey = null;
    let isLocked = false;

    try {
        // 1. 先讀取這筆預約資料（鎖定前先查，避免持鎖過久）
        const bookingRecords = Database.query(`SELECT manager_uid, booking_start_time, booking_end_time FROM booking WHERE uid = '${bookingUid}'`);
        if (!bookingRecords || bookingRecords.length === 0) {
            return { success: true, msg: '找不到對應的預約資料' };
        }

        const booking = bookingRecords[0];
        const managerUid = booking.manager_uid;
        lockKey = 'lock_mgr_' + managerUid;

        // 2. 取得 manager_uid 具名鎖
        const timeout = 30000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (projectLock.tryLock(500)) {
                try {
                    if (!cache.get(lockKey)) {
                        cache.put(lockKey, '1', 60);
                        isLocked = true;
                        break;
                    }
                } finally {
                    projectLock.releaseLock();
                }
            }
            Utilities.sleep(Math.random() * 200 + 100);
        }
        if (!isLocked) throw new Error('伺服器忙碌中 (Manager Lock Timeout)');

        // 3. 刪除 booking 主表 //0 直接刪除 1 更新預約狀態
        if (deleteType == 0) {
            Database.delete('booking', `uid = '${bookingUid}'`);
        } else {
            Database.update('booking', { is_cancelled: true }, `uid = '${bookingUid}'`);
        }

        // 4. 遍歷時段範圍，逐一更新 booking_cache
        const tz = Session.getScriptTimeZone();
        const startDate = new Date(String(booking.booking_start_time).replace(/-/g, '/'));
        const endDate = new Date(String(booking.booking_end_time).replace(/-/g, '/'));
        let currentSlot = new Date(startDate);
        currentSlot.setMinutes(0, 0, 0);

        while (currentSlot <= endDate) {
            const slotStr = Utilities.formatDate(currentSlot, tz, "yyyy-MM-dd HH:mm");
            const cacheRecords = Database.query(`SELECT uid, booked_count FROM booking_cache WHERE manager_uid = '${managerUid}' AND booking_start_time = '${slotStr}'`);

            if (cacheRecords && cacheRecords.length > 0) {
                const rec = cacheRecords[0];
                const newCount = (Number(rec.booked_count) || 1) - 1;
                if (newCount <= 0) {
                    Database.delete('booking_cache', `uid = '${rec.uid}'`);
                } else {
                    Database.update('booking_cache', { booked_count: newCount }, `uid = '${rec.uid}'`);
                }
            }
            currentSlot.setMinutes(currentSlot.getMinutes() + time_slot_interval); // 每整點一格
        }

        return {
            success: true,
            msg: '預約已成功取消',
            data: { booking_uid: bookingUid }
        };

    } catch (e) {
        logError(`cancelBooking Procedure Error: ${e.message}`);
        return { success: false, error: '取消預約失敗: ' + e.message };
    } finally {
        if (isLocked) cache.remove(lockKey);
    }
}