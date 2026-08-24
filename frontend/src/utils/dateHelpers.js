/**
 * Utility functions for date calculations matching backend logic.
 */

/**
 * Convert a Date object to a local YYYY-MM-DD string.
 * IMPORTANT: Do NOT use toISOString().split('T')[0] because
 * toISOString() converts to UTC, which shifts the date back by
 * 1 day for timezones ahead of UTC (e.g. IST UTC+5:30).
 */
export const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Determine whether current selection window is open (Saturday = 5, Sunday = 6)
export const isSelectionWindowOpen = (dateObj = new Date()) => {
  const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
  return day === 0 || day === 6;
};

// Get current Monday (start of current week)
export const getCurrentWeekStart = (dateObj = new Date()) => {
  const current = new Date(dateObj);
  const day = current.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(current);
  currentMonday.setDate(current.getDate() + diff);
  currentMonday.setHours(0, 0, 0, 0);
  return currentMonday;
};

// Get upcoming Monday (start of upcoming week)
export const getUpcomingWeekStart = (dateObj = new Date()) => {
  const currentMonday = getCurrentWeekStart(dateObj);
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
};

// Generate array of 7 dates for a Monday -> Sunday week
export const getWeekDays = (startMonday) => {
  const monday = new Date(startMonday);
  const days = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toLocalDateStr(d);

    days.push({
      dayName: dayNames[i],
      dateStr: dateStr,
      formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return days;
};

// Generate array of 7 dates for current Monday -> Sunday
export const getCurrentWeekDays = (dateObj = new Date()) => {
  return getWeekDays(getCurrentWeekStart(dateObj));
};

// Generate array of 7 dates for upcoming Monday -> Sunday
export const getUpcomingWeekDays = (dateObj = new Date()) => {
  return getWeekDays(getUpcomingWeekStart(dateObj));
};

export const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
