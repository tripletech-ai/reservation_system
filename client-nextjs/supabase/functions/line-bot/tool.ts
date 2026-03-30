import dayjs from "https://esm.sh/dayjs@1.11.10";
import utc from "https://esm.sh/dayjs@1.11.10/plugin/utc";
import timezone from "https://esm.sh/dayjs@1.11.10/plugin/timezone";
// 必須延伸插件才能使用時區功能
dayjs.extend(utc);
dayjs.extend(timezone);

export const formatDateTime = (date: string) => {
    return dayjs(date).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm");
}