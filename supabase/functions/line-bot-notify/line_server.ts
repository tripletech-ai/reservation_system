import { formatDateTime } from "./tool.ts";


/**
 * LINE 訊息服務 (Supabase Edge Function / Deno 版本)
 */
export const LineService = {
    /**
     * 回覆訊息 (Reply Message)
     */
    reply: async function (supabase?: any, replyData?: any) {
        const { accessToken, replyToken, responseText, searchData, procedureData } = replyData;
        if (!accessToken || !replyToken) return;

        const messages: any[] = [];

        // 1. 基本文字訊息
        if (responseText && searchData.has_text) {
            let text = responseText
            if (responseText === '[]' || responseText === '{}') {
                text = "查無資料"
            }
            messages.push({
                type: "text",
                text: text
            });
        }

        // 2. 判斷是否需要 Flex Message (基於 searchData 和資料庫)
        if (searchData && supabase) {
            const flexMsg = await getFlexMessage(supabase, searchData, procedureData);
            if (flexMsg) {
                messages.push(flexMsg);
            }
        }

        const payload = {
            replyToken: replyToken,
            messages: messages.slice(0, 5) // LINE 限制最多 5 筆
        };

        const response = await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        return response.ok;
    },

    /**
     * 主動推播訊息 (Push Message)
     */
    push: async function (supabase?: any, replyData?: any) {
        const { accessToken, lineUid, responseText, searchData } = replyData;
        if (!accessToken || !lineUid) return;

        const messages: any[] = [];

        // 1. 基本文字訊息
        if (responseText) {
            messages.push({
                type: "text",
                text: responseText
            });
        }

        // 2. 判斷是否需要 Flex Message (基於 searchData 和資料庫)
        if (searchData && supabase) {
            const flexMsg = await getFlexMessage(supabase, searchData, null);
            if (flexMsg) {
                messages.push(flexMsg);
            }
        }

        const payload = {
            to: lineUid,
            messages: messages.slice(0, 5)
        };



        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        return response.ok;
    },
};



/**
 * 主控：根據 searchData 的配置，決定回傳哪種 Flex Message
 */
const getFlexMessage = async (supabase: any, searchData: any, procedureData?: any) => {
    // 取得所有程序配置以便查找按鈕 Label
    const allProcedures = await getLineNotifyProcedureData(supabase);
    if (!allProcedures) return null;

    // 找到當前執行程序的完整配置 (包含 flex_message_type)
    const currentConfig = allProcedures.find((p: any) => p.procedure_name === searchData.procedure_name);
    const flexType = currentConfig?.flex_message_type;

    let flex = null;

    switch (flexType) {
        case 2:
            flex = createBookingHistoryFlex(searchData, procedureData);
            break;
        case 1:
            flex = createBookingFlex_(searchData, procedureData);
            break;
        default:
            break;
    }

    // 2. 如果 searchData 沒觸發主體 Flex，但有 more_keys，則發送快速選單
    if (!flex && searchData.more_keys && searchData.more_keys.length > 0) {
        flex = createQuickActionsFlex_(searchData.more_keys);
    }

    return flex;
}



const getLineNotifyProcedureData = async (supabase: any) => {

    const { data: managerData, error } = await supabase
        .from("line_notify_procedure")
        .select("*");

    if (error) {
        console.error("查詢 Manager 失敗:", error);
        return null;
    }
    return managerData;
};




//預約歷史紀錄 flex_message_type = 2
const createBookingHistoryFlex = (searchData: any, procedureData?: any) => {
    const bookings = procedureData || [];

    if (bookings.length === 0) {
        const buttons = createButtons_(searchData.no_data_keys);
        return {
            "type": "flex", "altText": "您目前沒有預約紀錄。",
            "contents": {
                "type": "bubble",
                "body": {
                    "type": "box", "layout": "vertical", "spacing": "md",
                    "contents": [
                        { "type": "text", "text": "查無預約紀錄", "weight": "bold", "size": "xl", "align": "center" },
                        { "type": "text", "text": "您目前沒有任何預約紀錄喔！", "wrap": true, "align": "center", "color": "#888888" }
                    ]
                },
                "footer": {
                    "type": "box", "layout": "vertical", "spacing": "sm",
                    // 如果 buttons 存在且有內容，才展開這個屬性
                    ...(buttons && buttons.length > 0 ? { "contents": buttons } : {})

                }
            }
        };
    }

    const bubbles = bookings.map((b: any) => {
        const showTime = formatDateTime(b.booking_date)
        const statusText = statusMap[String(b.status)] || { text: '', color: '' };
        return {
            "type": "bubble",
            "header": {
                "type": "box", "layout": "vertical", "backgroundColor": statusText.color,
                "contents": [{ "type": "text", "text": `預約狀態：${statusText.text}`, "color": "#FFFFFF", "weight": "bold", "size": "md" }]
            },
            "body": {
                "type": "box", "layout": "vertical", "spacing": "md",
                "contents": [
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [{ "type": "text", "text": "時間", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": showTime, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
                    { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [{ "type": "text", "text": "服務", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": b.service_name, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] }
                ]
            }
        };
    });

    return { "type": "flex", "altText": `預約紀錄`, "contents": { "type": "carousel", "contents": bubbles.slice(0, 10) } };
}


//取得預約資料 flex_message_type = 1
function createBookingFlex_(searchData: any, procedureData?: any) {
    const bookings = procedureData || [];
    // const cancellableBookings = bookings.filter((b: any) => String(b.status) === '1');

    if (bookings.length === 0) {
        const buttons = createButtons_(searchData.no_data_keys);
        return {
            "type": "flex", "altText": "您目前沒有可取消的預約。",
            "contents": {
                "type": "bubble",
                "body": {
                    "type": "box", "layout": "vertical", "spacing": "md", "contents": [
                        { "type": "text", "text": "查無可取消的預約", "weight": "bold", "size": "xl", "align": "center" },
                        { "type": "text", "text": "目前沒有任何可以取消的預約。", "wrap": true, "align": "center", "color": "#888888", "margin": "md" }
                    ]
                },
                "footer": {
                    "type": "box", "layout": "vertical", "spacing": "sm",
                    "contents": buttons
                }
            }
        };
    }
    let bubbles = []
    if (bookings) {
        bubbles = bookings.map((b: any) => {

            const showTime = formatDateTime(b.booking_date)
            return {
                "type": "bubble",
                "header": {
                    "type": "box", "layout": "vertical", "backgroundColor": "#D9534F",
                    "contents": [{ "type": "text", "text": "選擇取消這筆預約", "color": "#FFFFFF", "weight": "bold", "size": "md" }]
                },
                "body": {
                    "type": "box", "layout": "vertical", "spacing": "md",
                    "contents": [
                        { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [{ "type": "text", "text": "時間", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": showTime, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] },
                        { "type": "box", "layout": "baseline", "spacing": "sm", "contents": [{ "type": "text", "text": "服務", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": b.service_item || "未提供", "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }] }
                    ]
                },
                "footer": {
                    "type": "box", "layout": "vertical",
                    "contents": [{ "type": "button", "style": "primary", "color": "#D9534F", "height": "sm", "action": { "type": "message", "label": "申請取消這筆", "text": `取消預約 ${b.uid}` } }]
                }
            };
        });
    } else {
        return { "type": "flex", "altText": "系統忙碌中，請稍後再試" };
    }


    return { "type": "flex", "altText": "請選擇您要取消的預約", "contents": { "type": "carousel", "contents": bubbles.slice(0, 10) } };
}


//還需要其他服務嗎
function createQuickActionsFlex_(more_keys: string[] = []) {
    const buttons = createButtons_(more_keys, false);
    if (buttons.length === 0) return null;

    return {
        "type": "flex",
        "altText": "需要其他服務嗎？",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    { "type": "text", "text": "需要其他服務嗎？", "weight": "bold", "size": "lg", "margin": "md" },
                    { "type": "text", "text": "您可以選擇以下功能：", "size": "sm", "color": "#666666", "wrap": true, "margin": "md" }
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "spacing": "sm",
                "contents": buttons
            }
        }
    };
}

/**
 * 通用工具：將關鍵字列轉為 LINE 按鈕物件
 */
function createButtons_(keys: string[], isPrimary = true) {
    if (!keys || keys.length === 0) return [];

    // 將 key 陣列轉為按鈕物件
    return keys.map(key => {
        return {
            "type": "button",
            "action": {
                "type": "message",
                "label": key,
                "text": key
            },
            // --- 這裡開始根據 flag 切換 ---
            "style": isPrimary ? "primary" : "link",
            "color": isPrimary ? "#463ec9" : null,      // link 模式下通常不設背景色
            "cornerRadius": isPrimary ? "md" : null,   // link 模式不支援圓角
            "height": "sm",
            "margin": "md"
        };
    });
}


// 1. 定義 Map，Key 使用字串
const statusMap: Record<string, { text: string, color: string }> = {
    '1': {
        text: '預約中',
        color: '#1877F2'
    },
    '2': {
        text: '完成',
        color: '#888888'
    },
    '0': {
        text: '取消預約',
        color: '#FF4B4B'
    }
};



