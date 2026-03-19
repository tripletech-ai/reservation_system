const GAS_URL = import.meta.env.VITE_GAS_DATABASE_URL;

export interface GasPayload {
    action: "select" | "insert" | "update" | "delete" | "call";
    table?: string;
    data?: any | any[];
    sql?: string;
    where?: string;
    procedure?: string;
    params?: any[];
}

export interface GasResponse<T = any> {
    status: "success" | "fail";
    message?: string;
    data?: T;
}

/**
 * 核心 API 呼叫函式
 */
export async function callGasApi<T = any>(payload: GasPayload): Promise<T | null> {
    try {
        console.log("payload: ", payload)
        const response = await fetch(GAS_URL, {
            method: "POST",
            // 由於 GAS 對 POST 的 Content-Type 處理限制，通常用 text/plain 傳遞 JSON
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: GasResponse<T> = await response.json();
        console.log("result: ", result)
        if (result.status === "fail") {
            console.error("API 錯誤:", result.message);
            return null;
        }

        if (result.status === "success") {
            return result.data ?? null; // 回傳標準化後的資料
        }
        return result.data ?? null; // 回傳標準化後的資料
    } catch (error) {
        console.error("網路或系統錯誤:", error);
        return null;
    }
}
