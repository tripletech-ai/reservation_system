// 兩天前提醒 (cronSendTwoDaysReminders)
function cronSendTwoDaysReminders() {
  const target = new Date();
  target.setDate(target.getDate() + 2);
  const dateStr = Utilities.formatDate(target, "GMT+8", "yyyy-MM-dd");

  const list = supabaseRequest('get', `booking?select=*,manager(*)&status=eq.13&is_reminded_3d=eq.false&booking_start_time=gte.${dateStr}T00:00:00&booking_start_time=lte.${dateStr}T23:59:59`);
  console.log(list)

  list.forEach(bk => {
    // 【修改】加入 try...catch 包裝發送邏輯
    try {
      const flex = getCustomerReminderFlex("📅 預約提醒", "#28a745", bk, "後天", "期待您的光臨～若需更改或取消，請盡快與我們聯繫！取消改約『不』影響定金扣除。");

      sendPush(bk.manager.line_channel_access_token, bk.line_uid, flex);
      supabaseRequest('patch', `booking?uid=eq.${bk.uid}`, { is_reminded_3d: true });
    } catch (e) {
      console.error(`兩天前提醒發送失敗 (Booking UID: ${bk.uid}, Line: ${bk.line_uid})，錯誤：${e.message}`);
    }
  });
}

// 明天提醒 (cronSendTomorrowReminders)
function cronSendTomorrowReminders() {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  const dateStr = Utilities.formatDate(target, "GMT+8", "yyyy-MM-dd");

  const list = supabaseRequest('get', `booking?select=*,manager(*)&status=eq.13&is_reminded_1d=eq.false&booking_start_time=gte.${dateStr}T00:00:00&booking_start_time=lte.${dateStr}T23:59:59`);

  list.forEach(bk => {
    // 【修改】加入 try...catch
    try {
      const flex = getCustomerReminderFlex("📅 明日預約提醒", "#960f0f", bk, "明天", "48小時內取消改約，定金將會沒收扣除喔！敬請體諒🥹");
      sendPush(bk.manager.line_channel_access_token, bk.line_uid, flex);
      supabaseRequest('patch', `booking?uid=eq.${bk.uid}`, { is_reminded_1d: true });
    } catch (e) {
      console.error(`明天提醒發送失敗 (Booking UID: ${bk.uid}, Line: ${bk.line_uid})，錯誤：${e.message}`);
    }
  });
}

// ③ 定金催繳提醒 (每小時執行)
function cronRemindDeposits() {
  const now = new Date();
  // 篩選：未收定金、非取消狀態
  const list = supabaseRequest('get', `booking?select=*,manager(*)&is_deposit_received=eq.false&status=eq.10`);

  list.forEach(bk => {
    const start = new Date(bk.booking_start_time);
    const diff = (start - now) / (1000 * 60 * 60);

    // 距離預約前 48 小時內且未標記已催繳
    if (diff <= 48 && diff > 0 && !bk.is_deposit_reminded) {
      // 【修改】加入 try...catch
      try {
        const msg = `📣 定金提醒\n親愛的 ${bk.name} 您好：\n服務：${bk.service_item}\n您的預約將在 ${Math.floor(diff)} 小時內開始，請盡快完成定金繳納。\n\n💰 定金金額：NT$300\n🏦 匯款資訊：${bk.manager.bank_name}\n📄 戶名：${bk.manager.bank_account_owner}\n🔢 帳號：${bk.manager.bank_account}\n\n⏰ 最晚請於 24 小時內完成匯款，並回覆「末五碼」以便對帳。`;

        console.log("bk,", bk.line_uid);
        sendPush(bk.manager.line_channel_access_token, bk.line_uid, { type: "text", text: msg });
        supabaseRequest('patch', `booking?uid=eq.${bk.uid}`, { is_deposit_reminded: true });
      } catch (e) {
        console.error(`定金催繳發送失敗 (Booking UID: ${bk.uid}, Line: ${bk.line_uid})，錯誤：${e.message}`);
      }
    }
  });
}

// 管理員通知與摘要
// ⑥ 每日預約摘要 (週三、週日 09:00)
// 管理員通知與摘要
// ⑥ 每日預約摘要 (週三、週日 09:00)
function cronDailyDigest() {
  const managers = supabaseRequest('get', 'manager');

  managers.forEach(m => {
    // 【新增防呆檢查】如果資料庫裡這位管理員沒有 LINE Token，就跳過他，避免出現 param empty
    if (!m.line_channel_access_token || !m.line_official_account) {
      console.warn(`⚠️ 找不到管理員 (UID: ${m.uid}) 的 LINE Token，已跳過發送。`);
      return; // 提早結束這位管理員的動作，繼續處理下一位
    }

    let bubbles = [];
    const days = [1, 2, 3]; // 明、後、大後天

    // 這裡我們也加上 try...catch，避免 Supabase 查詢時出錯
    try {
      days.forEach(dOffset => {
        const date = new Date();
        date.setDate(date.getDate() + dOffset);
        const ds = Utilities.formatDate(date, "GMT+8", "yyyy-MM-dd");
        const apps = supabaseRequest('get', `booking?manager_uid=eq.${m.uid}&booking_start_time=gte.${ds}T00:00:00&booking_start_time=lte.${ds}T23:59:59&status=gte.10&order=booking_start_time.asc`);
        bubbles.push(createDigestBubble(ds, apps));
      });
    } catch (e) {
      console.error(`撈取管理員 (UID: ${m.uid}) 預約資料失敗，錯誤：${e.message}`);
      return; // 如果撈資料就出錯，就不往下發送了
    }


    // 傳送給管理員 (保留你寫死的 ID)
    try {

      m.line_official_account.split(",").forEach(id => {

        sendPush(m.line_channel_access_token, id, {
          type: "flex", altText: "預約摘要", contents: { type: "carousel", contents: bubbles }
        });
      })
    } catch (e) {
      console.error(`管理員摘要發送失敗 (Manager UID: ${m.uid})，錯誤：${e.message}`);
    }
  });
}