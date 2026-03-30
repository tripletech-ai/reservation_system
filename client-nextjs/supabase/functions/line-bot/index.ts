import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./constant.ts";
import { LineService } from "./line_server.ts";
import { executeProcedure } from "./action.ts";

//npx supabase functions deploy line-bot --project-ref rqczzxaxyntjdyqifalj --no-verify-jwt

// 初始化 Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // 1. 驗證是否為 POST 請求
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(req.url);
    const uid = url.searchParams.get("uid"); //manager id

    const { events } = await req.json();
    const lineId = events?.[0]?.source?.userId;

    // 2. 遍歷 Line 傳來的事件
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMsg = event.message.text.trim();
        const replyToken = event.replyToken;
        let responseText = "";

        const managerData = await getManagerData(uid);

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

        const searchData = notifyJson.find(item => item.key === userMsg)
        //取得回復文字
        if (managerData) {
          responseText = getResponseText(searchData, {
            ...managerData,
            line_uid: lineId
          })
        }


        let procedureData = []
        // --- 邏輯 A: 判斷是否需要呼叫 Procedure ---
        if (searchData && searchData.procedure_name) {
          procedureData = await executeProcedure(searchData, supabase, { lineId: lineId }) || [];
          if (hasContent(procedureData) && searchData.has_text) {
            responseText = replaceResponseText(responseText, procedureData)
          } else {
            responseText = JSON.stringify(procedureData)
          }
        }

        if (lineId) {
          responseText = replaceResponseText(responseText, { line_uid: lineId })
        }



        const replyData = {
          accessToken: managerData.line_channel_access_token,
          replyToken: replyToken,
          responseText: responseText,
          searchData: searchData,
          procedureData: procedureData
        }

        // 3. 發送回覆給 Line
        await LineService.reply(supabase, replyData);
      }
    }

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

const hasContent = (data) => {
  if (!data) return false; // 排除 null, undefined
  if (Array.isArray(data)) return data.length > 0; // 排除 []
  if (typeof data === 'object') return Object.keys(data).length > 0; // 排除 {}
  return true;
};