import { GasPayload } from "@/types";
import { CONFIG_ENV } from "./env";

const GAS_URL = CONFIG_ENV.google.gasUrl;

export const GOOGLE_CALENDAR_COLOR_ID = {
    PURPLE: 3,
    GRAY: 8,
}

export class GoogleCalendarService {
    static async sync(payload: GasPayload) {
        if (!GAS_URL) {
            console.warn("GAS_URL is not defined, skipping Google Calendar sync.");
            return "SKIPPED";
        }

        try {
            // 1. 將 payload 轉為 JSON 字串並進行編碼
            const dataParam = encodeURIComponent(JSON.stringify(payload));

            // 2. 構建帶有資料和時間戳記（破壞快取）的 URL
            const finalUrl = `${GAS_URL}?data=${dataParam}&t=${Date.now()}`;

            const response = await fetch(finalUrl, {
                method: "GET", // 改為 GET
                headers: {
                    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.${Math.floor(Math.random() * 1000)}.0 Safari/537.36`,
                },
                redirect: "follow",
                cache: 'no-store',
            });
            const ss = await response.text()
            console.log("response", ss)
            // if (!response.ok) throw new Error(`網路回應錯誤: ${response.status}`);

            // const result = await response.json();
            // console.log("result", result)
            // if (!result.success) {
            //     throw new Error(`GAS 執行失敗: ${result.error}`);
            // }

            return ss;
        } catch (error) {
            console.error("Google Calendar 同步異常:", error);
            throw error;
        }
    }
}