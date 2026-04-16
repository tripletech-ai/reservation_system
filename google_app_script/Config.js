const CONFIG = {
  URL: PropertiesService.getScriptProperties().getProperty('NEXT_PUBLIC_SUPABASE_URL'),
  KEY: PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_ROLE_K')
};

function supabaseRequest(method, endpoint, payload = null) {
  const options = {
    method: method,
    headers: {
      "apikey": CONFIG.KEY,
      "Authorization": `Bearer ${CONFIG.KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    muteHttpExceptions: true
  };
  if (payload) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(`${CONFIG.URL}/rest/v1/${endpoint}`, options);
  return JSON.parse(response.getContentText());
}

// 通用 LINE Push 訊息
// 在 Config.gs 的 sendPush 裡面增加細節檢查
function sendPush(token, to, messages) {
  if (!token || !to) {
    console.error(`param empty`);
    return
  }
  const url = "https://api.line.me/v2/bot/message/push";
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    payload: JSON.stringify({ to: to, messages: Array.isArray(messages) ? messages : [messages] }),
    // 強烈建議開啟這個，可以看到更詳細的 LINE 報錯原因
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const resCode = response.getResponseCode();
  const resText = response.getContentText();

  if (resCode !== 200) {
    console.error(`LINE API Error: ${resText}`);
  }
}