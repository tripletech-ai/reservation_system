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
            const response = await fetch(GAS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                    // 隨機切換 User-Agent
                    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.${Math.floor(Math.random() * 1000)}.0 Safari/537.36`,
                    // 強制不緩存，並加入一個隨機參數在 URL 上，繞過 Google 的網關緩存
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                },
                body: JSON.stringify(payload),
                redirect: "follow",
                cache: 'no-store', // 強制不使用緩存
            });
            console.log("response", response)
            if (!response.ok) throw new Error(`網路回應錯誤: ${response.status}`);

            const result = await response.json();
            console.log("result0", result)
            if (!result.success) {
                throw new Error(`GAS 執行失敗: ${result.error}`);
            }

            return result.result; // 回傳 eventId 或 "OK"
        } catch (error) {
            console.error("Google Calendar 同步異常:", error);
            throw error;
        }
    }
}
