import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./constant.ts";
import { LineService } from "./line_server.ts";
import { formatDateTime } from "./tool.ts";

//npx supabase functions deploy line-bot --project-ref rqczzxaxyntjdyqifalj --no-verify-jwt

// 初始化 Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // 1. 驗證是否為 POST 請求
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = await req.json()
    const { name, phone, email, service_item, booking_start_time, booking_end_time, line_uid, manager_uid, action } = payload


    console.log("payload", payload)

    let responseText = "";
    const managerData = await getManagerData(manager_uid);
    if (!managerData) {
      responseText = "查無此官方帳號";
    }

    let notifyJson
    try {
      notifyJson = JSON.parse(managerData.line_notify_content)
    } catch (parseError) {
      console.log("JSON 解析失敗:", parseError);
      responseText = "系統資料格式錯誤。";
    }

    const searchData = notifyJson.find(item => item.key === action)


    //取得回復文字
    if (managerData) {
      responseText = getResponseText(searchData, managerData)
    }



    if (searchData && searchData.has_text) {
      responseText = replaceResponseText(responseText, {
        ...payload,
        line_uid: line_uid,
        booking_start_time: formatDateTime(booking_start_time),
        booking_end_time: formatDateTime(booking_end_time)
      })
    }

    const replyData = {
      accessToken: managerData.line_channel_access_token,
      lineUid: line_uid,
      responseText: responseText,
      searchData: searchData
    }

    console.log("replyData:", replyData);

    // 3. 發送回覆給 Line
    await LineService.push(supabase, replyData);

    return new Response(JSON.stringify({ message: "success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});


const getManagerData = async (uid: string | null) => {
  if (!uid) return null;

  const { data: managerData, error } = await supabase
    .from("manager")
    .select("line_notify_content, line_notify_default, line_channel_access_token") // <-- 務必加入這一項
    .eq("uid", uid)
    .single();

  if (error) {
    console.error("查詢 Manager 失敗:", error);
    return null;
  }
  return managerData;
};


const getResponseText = (data: any, managerData: any) => {
  if (data) {
    return data.value || '';
  } else {
    return managerData.line_notify_default || "查無此關鍵字，請重新輸入。";
  }

}


const replaceResponseText = (text: string, responseData: any) => {
  // 1. 安全檢查：確保 responseData 存在且是物件
  if (!responseData || typeof responseData !== 'object') return text;

  // 2. 進行變數替換
  // 直接將 responseData 作為資料來源
  const result = text.replace(/{(\w+)}/g, (match, key) => {
    const value = responseData[key];

    // 針對 status 特別處理
    if (key === 'status') {
      // 確保只有在 value 真正存在（或明確為布林值）時才轉換
      return value === true ? "已綁定" : "未綁定";
    }

    // 如果 key 存在且不是 undefined，則替換；否則保留 {key}
    return value !== undefined ? value : match;
  });

  return result;
};
