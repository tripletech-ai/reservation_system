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
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`網路回應錯誤: ${response.status}`);

            const result = await response.json();

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
