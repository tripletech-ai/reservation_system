import { CANCELLED } from "dns";

export const QUERY_CONFIG = {
    STALE_TIME: 1000 * 60 * 5, // 5 分鐘
    LONG_STALE_TIME: 1000 * 60 * 10, // 10 分鐘
    CACHE_TIME: 1000 * 60 * 30, // 30 分鐘
};


export const TIME_SLOT_INTERVAL = 30; // 30 分鐘

export const CACHE_TIME = 1000; // 1 小時

export const BOOKING_STATUS = {
    CANCELLED: 0,
    APPLY_CANCELED: 3,
    REVIEW: 10,
    BOOKING_SUCCESS: 13,

}


export const MANAGER_LEVEL = {
    SUPER: 1,
    ADMIN: 0,
}