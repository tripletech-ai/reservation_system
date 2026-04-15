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

        const calendar = CalendarApp.getCalendarById(calId);
        if (!calendar) return null;

        const startTime = new Date(bookingData.booking_start_time);
        const endTime = new Date(bookingData.booking_end_time);
        const title = `預約: ${bookingData.name} - ${bookingData.service_item}`;
        const description = `電話: ${bookingData.phone}\n`;

        const event = calendar.createEvent(title, startTime, endTime, {
            description: description,
            location: 'Reservation System'
        });

        this._setColor(event, bookingData.color_id);

        return event.getId();
    },

    /**
     * 更新日曆行程 (若時間或標題變更時)
     */
  updateEvent: function (googleCalendarId, eventId, updatedData) {
      // 1. 基本檢查與日誌
      if (!googleCalendarId || !eventId) return null;
      const calendar = CalendarApp.getCalendarById(googleCalendarId);
      const event = calendar.getEventById(eventId);  
      if (!event) return null;

      this._setColor(event, updatedData.color_id);

      if (updatedData.booking_start_time && updatedData.booking_end_time) {
          const start = new Date(updatedData.booking_start_time);
          const end = new Date(updatedData.booking_end_time);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              event.setTime(start, end);
          }
      }

      if (updatedData.name && updatedData.service_item) {
          event.setTitle(`預約: ${updatedData.name} - ${updatedData.service_item}`);
      }

      return event.getId(); // 建議回傳 event 物件供後續操作
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
    },


    _setColor: function (event, colorId) {
        if (event && colorId) {
            event.setColor(colorId.toString());
        }
    }
};
