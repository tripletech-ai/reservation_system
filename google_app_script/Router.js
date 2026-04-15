/**
 * 路由中心：判斷 action 並呼叫對應的 Service
 */
const Router = {
    handle: function (params) {
        const { action, googleCalendarId, data, eventId } = params;
        log("action",action)
        // 封裝 Action 與 Service 的對應關係
        const routes = {
            'CREATE': () => CalendarService.createEvent(googleCalendarId, data),
            'UPDATE': () => CalendarService.updateEvent(googleCalendarId, eventId, data),
            'DELETE': () => CalendarService.deleteEvent(googleCalendarId, eventId),
        };

        if (typeof routes[action] !== 'function') {
            throw new Error(`未定義的 Action: ${action}`);
        }

        return routes[action]();
    }
};