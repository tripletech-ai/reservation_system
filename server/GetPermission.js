function getGoogleCalendarPermission() {
    const calendar = CalendarApp.getDefaultCalendar();
    console.log("日曆名稱: " + calendar.getName());
}