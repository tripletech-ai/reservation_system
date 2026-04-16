/**
 * 產生顧客預約提醒的 Flex Message (保留原本的邏輯)
 */
function getCustomerReminderFlex(title, color, bk, day, note) {
  const rawParkingUrl = "https://maps.app.goo.gl/ZQmrC1nkcchFv8KD8";
  const rawStoreUrl = "https://maps.app.goo.gl/7tYZUuniXaugiSXY6?g_st=ipc";
  const STORE_ADDRESS = "桃園市龜山區頂興路136號";

  const PARKING_URL = encodeURI(rawParkingUrl);
  const STORE_URL = encodeURI(rawStoreUrl);

  const timeStr = Utilities.formatDate(new Date(bk.booking_start_time), "GMT+8", "MM/dd HH:mm");

  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: color,
        contents: [{ type: "text", text: title, color: "#ffffff", weight: "bold", size: "lg" }]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: `親愛的 ${bk.name} 您好：溫馨提醒您，${day}有服務預約喔！`, wrap: true },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              { type: "text", text: `🗓️ 時間：${timeStr}`, size: "sm" },
              { type: "text", text: `🛠️ 服務：${bk.service_item}`, size: "sm", wrap: true },
              { type: "text", text: `📍 地址：${STORE_ADDRESS}`, size: "sm", color: "#1E90FF", wrap: true }
            ]
          },
          { type: "separator" },
          { type: "text", text: note, size: "xs", color: "#aaaaaa", wrap: true }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "🅿️ 停車導航", uri: PARKING_URL },
            style: "primary", color: "#4e73df"
          },
          {
            type: "button",
            action: { type: "uri", label: "📍 店家位置", uri: STORE_URL },
            style: "primary", color: "#1cc88a"
          }
        ]
      }
    }
  };
}

/**
 * 產生管理員摘要卡片 (完全對齊截圖的新版設計)
 */
function createDigestBubble(dateStr, apps) {
  // 1. 將 yyyy-MM-dd 轉換為 4/13 (一) 的格式
  const [yyyy, MM, dd] = dateStr.split('-');
  const dateObj = new Date(yyyy, MM - 1, dd);
  const dayNames = ["(日)", "(一)", "(二)", "(三)", "(四)", "(五)", "(六)"];
  const displayDate = `${parseInt(MM)}/${parseInt(dd)} ${dayNames[dateObj.getDay()]}`;

  // 2. 處理預約清單
  const rows = [];
  if (apps.length > 0) {
    apps.forEach((a, index) => {
      // 處理時間 (若資料庫有 booking_end_time 就組成 11:30-12:30，沒有就單純顯示開始時間)
      const startStr = Utilities.formatDate(new Date(a.booking_start_time), "GMT+8", "HH:mm");
      const endStr = a.booking_end_time ? Utilities.formatDate(new Date(a.booking_end_time), "GMT+8", "HH:mm") : "";
      const timeDisplay = endStr ? `${startStr}–${endStr}` : startStr;

      rows.push({
        type: "box",
        layout: "vertical",
        margin: index === 0 ? "none" : "lg", // 第二筆以上增加上方間距
        spacing: "sm",
        contents: [
          {
            // [第一列] 時間 與 定金狀態
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: timeDisplay, weight: "bold", size: "md", color: "#111111" },
              {
                type: "text",
                text: a.is_deposit_received ? "已付定金" : "未付定金",
                color: a.is_deposit_received ? "#00bb00" : "#ff0000",
                size: "sm",
                weight: "bold",
                align: "end"
              }
            ]
          },
          {
            // [第二列] 姓名 與 電話 (假設資料庫電話欄位為 phone)
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              { type: "text", text: a.name || "無姓名", weight: "bold", size: "sm", color: "#111111", flex: 0 },
              { type: "text", text: a.phone || "", size: "sm", color: "#888888" }
            ]
          },
          {
            // [第三列] 服務項目
            type: "text",
            text: `服務：${a.service_item || "未指定"}`,
            size: "sm",
            color: "#666666",
            wrap: true
          }
        ]
      });

      // 如果不是最後一筆，就加入一條淡灰色的分隔線
      if (index < apps.length - 1) {
        rows.push({ type: "separator", margin: "lg", color: "#eeeeee" });
      }
    });
  } else {
    // 當天無預約的畫面
    rows.push({
      type: "text",
      text: "本日目前無預約 🌴",
      align: "center",
      color: "#aaaaaa",
      size: "sm",
      margin: "md"
    });
  }

  // 3. 組裝並回傳 Bubble 物件
  return {
    type: "bubble",
    size: "mega", // 讓卡片寬度足夠顯示完整資訊
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#27406C",
      paddingTop: "xl",
      paddingBottom: "lg",
      contents: [
        {
          type: "text",
          text: displayDate,
          color: "#ffffff",
          weight: "bold",
          size: "xl",
          align: "center"
        },
        {
          type: "text",
          text: `共 ${apps.length} 筆預約`,
          color: "#ffffff",
          size: "sm",
          align: "center",
          margin: "sm"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingTop: "lg",
      contents: rows
    }
  };
}