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

// Get upcoming Monday (start of upcoming week)
export const getUpcomingWeekStart = (dateObj = new Date()) => {
  const current = new Date(dateObj);
  const day = current.getDay(); // 0 (Sun) to 6 (Sat)
  
  let daysUntilMonday = 1 - day;
  if (day === 0) daysUntilMonday = 1; // From Sun to Mon is +1
  else if (day === 6) daysUntilMonday = 2; // From Sat to Mon is +2
  else if (daysUntilMonday <= 0) daysUntilMonday += 7;

  const upcomingMonday = new Date(current);
  upcomingMonday.setDate(current.getDate() + daysUntilMonday);
  upcomingMonday.setHours(0, 0, 0, 0);

  return upcomingMonday;
};

// Generate array of 7 dates for upcoming Monday -> Sunday
export const getUpcomingWeekDays = (dateObj = new Date()) => {
  const monday = getUpcomingWeekStart(dateObj);
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

export const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
