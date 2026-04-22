import { GasPayload } from "@/types";
import { CONFIG_ENV } from "./env";
import axios from "axios";

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
            console.log("payload", payload);
            console.log("GAS_URL", GAS_URL);
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload),
                redirect: 'follow',  // 明確跟隨 redirect
            });

            const text = await response.text();   // 先用 text() 不要用 json()
            console.log("raw response:", text);
            const result = JSON.parse(text);

            if (!result.success) {
                throw new Error(`GAS 執行失敗: ${result.error}`);
            }

            return result.result; // 回傳 eventId 或 "OK"

        } catch (error: any) {
            // Axios 會自動捕捉 4xx, 5xx 或網路錯誤
            const errorMessage = error.response?.data?.error || error.message;
            console.error("請求發生錯誤:", errorMessage);
            throw new Error(errorMessage);
        }
    }
}
