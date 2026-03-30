/**
 * Google 日曆整合服務v0.0.1
 */
const CalendarService = {

    /**
     * 建立日曆行程
     * const eventId = CalendarService.createEvent(data.manager_uid, data);
     */
    createEvent: function (googleCalendarId, bookingData) {
        const calId = googleCalendarId;
        if (!calId) return null;

        const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
        if (!calendar) return null;

        const startTime = new Date(bookingData.booking_start_time);
        const endTime = new Date(bookingData.booking_end_time);
        const title = `預約: ${bookingData.name} - ${bookingData.service_item}`;
        const description = `電話: ${bookingData.phone}\n`;

        const event = calendar.createEvent(title, startTime, endTime, {
            description: description,
            location: 'Reservation System'
        });

        return event.getId();
    },

    /**
     * 更新日曆行程 (若時間或標題變更時)
     */
    updateEvent: function (googleCalendarId, eventId, updatedData) {
        const calId = googleCalendarId;
        if (!calId || !eventId) return;

        const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
        const event = calendar.getEventById(eventId);
        if (!event) return;

        if (updatedData.booking_start_time && updatedData.booking_end_time) {
            const start = new Date(updatedData.booking_start_time);
            const end = new Date(updatedData.booking_end_time);
            event.setTime(start, end);
        }

        if (updatedData.name || updatedData.service_item) {
            event.setTitle(`預約: ${updatedData.name || '客戶'} - ${updatedData.service_item || '服務'}`);
        }
    },

    /**
     * 刪除日曆行程
     */
    deleteEvent: function (googleCalendarId, eventId) {
        const calId = googleCalendarId;
        if (!calId || !eventId) return;

        const calendar = CalendarApp.getCalendarById(calId) || CalendarApp.getDefaultCalendar();
        const event = calendar.getEventById(eventId);
        if (event) event.deleteEvent();
    }
};
