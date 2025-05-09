import { CalendarEvent, RecurrenceRule } from "./types";

// Date formatting
export const formatDate = (date: Date, locale = "en-US"): string => {
  return date.toLocaleDateString(locale, { day: "numeric" });
};

export const formatMonth = (date: Date, locale = "en-US"): string => {
  return date.toLocaleDateString(locale, { month: "long" });
};

export const formatYear = (date: Date, locale = "en-US"): string => {
  return date.toLocaleDateString(locale, { year: "numeric" });
};

export const formatTime = (date: Date, locale = "en-US"): string => {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getDayName = (
  date: Date,
  locale = "en-US",
  short = false
): string => {
  return date.toLocaleDateString(locale, { weekday: short ? "short" : "long" });
};

// Date calculations
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

export const startOfWeek = (date: Date, firstDayOfWeek = 0): Date => {
  const day = date.getDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff);
};

export const endOfWeek = (date: Date, firstDayOfWeek = 0): Date => {
  const start = startOfWeek(date, firstDayOfWeek);
  return addDays(start, 6);
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const getWeekDates = (date: Date, firstDayOfWeek = 0): Date[] => {
  const start = startOfWeek(date, firstDayOfWeek);
  const dates: Date[] = [];

  for (let i = 0; i < 7; i++) {
    dates.push(addDays(start, i));
  }

  return dates;
};

export const getMonthDates = (date: Date, firstDayOfWeek = 0): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);

  // Get the first day of the month's week
  const firstWeekStart = startOfWeek(start, firstDayOfWeek);

  // Get the last day of the month's week
  const lastWeekEnd = endOfWeek(end, firstDayOfWeek);

  const dates: Date[] = [];
  let current = firstWeekStart;

  while (current <= lastWeekEnd) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
};

// Event calculations
export const getEventDuration = (event: CalendarEvent): number => {
  return event.end.getTime() - event.start.getTime();
};

export const eventOverlaps = (
  eventA: CalendarEvent,
  eventB: CalendarEvent
): boolean => {
  // Check for time overlap
  return (
    (eventA.start >= eventB.start && eventA.start < eventB.end) ||
    (eventA.end > eventB.start && eventA.end <= eventB.end) ||
    (eventA.start <= eventB.start && eventA.end >= eventB.end)
  );
};

export const findOverlappingEvents = (
  event: CalendarEvent,
  events: CalendarEvent[]
): CalendarEvent[] => {
  return events.filter((e) => e.id !== event.id && eventOverlaps(event, e));
};

export const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => {
    // Sort by start time first
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;

    // If start times are the same, sort by end time (longer events first)
    return b.end.getTime() - a.end.getTime();
  });
};

// Function to filter events for a specific day
export function filterEventsByDay(
  events: CalendarEvent[],
  date: Date,
  includeAllDay: boolean = false
): CalendarEvent[] {
  return events.filter((event) => {
    // Skip all-day events unless explicitly included
    if (event.isAllDay && !includeAllDay) {
      return false;
    }

    const eventDate = new Date(event.start);
    return (
      eventDate.getFullYear() === date.getFullYear() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getDate() === date.getDate()
    );
  });
}

// Helper function to check if the date matches the recurrence rule
export const matchesRecurrenceRule = (
  date: Date,
  start: Date,
  rule: RecurrenceRule
): boolean => {
  // Simplistic implementation - in a real app, you'd want a more robust solution
  if (rule.until && date > rule.until) return false;

  const diff = Math.floor(
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (rule.frequency === "daily") {
    const interval = rule.interval || 1;
    return diff % interval === 0;
  }

  if (rule.frequency === "weekly") {
    const interval = rule.interval || 1;
    const weekDiff = Math.floor(diff / 7);

    if (weekDiff % interval !== 0) return false;

    // Check if the day of week matches
    if (rule.byDay) {
      const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const dateDay = days[date.getDay()];
      return rule.byDay.includes(dateDay as any);
    }

    return date.getDay() === start.getDay();
  }

  if (rule.frequency === "monthly") {
    const interval = rule.interval || 1;
    const monthDiff =
      (date.getFullYear() - start.getFullYear()) * 12 +
      date.getMonth() -
      start.getMonth();

    if (monthDiff % interval !== 0) return false;

    // Check if day of month matches
    if (rule.byMonthDay) {
      return rule.byMonthDay.includes(date.getDate());
    }

    return date.getDate() === start.getDate();
  }

  if (rule.frequency === "yearly") {
    const interval = rule.interval || 1;
    const yearDiff = date.getFullYear() - start.getFullYear();

    if (yearDiff % interval !== 0) return false;

    // Check if month matches
    if (rule.byMonth) {
      const month = date.getMonth() + 1; // JavaScript months are 0-based
      if (!rule.byMonth.includes(month)) return false;
    } else if (date.getMonth() !== start.getMonth()) {
      return false;
    }

    // Check if day of month matches
    if (rule.byMonthDay) {
      return rule.byMonthDay.includes(date.getDate());
    }

    return date.getDate() === start.getDate();
  }

  return false;
};

// Convert 24-hour format to Date object
export const timeToDate = (
  date: Date,
  hours: number,
  minutes: number
): Date => {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

// Calcular la posición y altura de un evento en la cuadrícula horaria
export function getEventPosition(
  event: CalendarEvent,
  startHour: number,
  endHour: number,
  hourHeight: number
): { top: number; height: number } {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  // Obtener horas y minutos
  const startHourTime = eventStart.getHours();
  const startMinuteTime = eventStart.getMinutes();
  const endHourTime = eventEnd.getHours();
  const endMinuteTime = eventEnd.getMinutes();

  // Calcular posición superior (top)
  const eventStartHour = Math.max(startHourTime, startHour);
  const hoursFromStart = eventStartHour - startHour;
  const minutesFromHour = startHourTime < startHour ? 0 : startMinuteTime;
  const minutesPercentage = minutesFromHour / 60;

  const top = (hoursFromStart + minutesPercentage) * hourHeight;

  // Calcular altura
  const eventEndHour = Math.min(endHourTime, endHour);
  const durationHours = eventEndHour - eventStartHour;
  const durationMinutes =
    endMinuteTime - (startHourTime < startHour ? 0 : startMinuteTime);
  const totalMinutes = durationHours * 60 + durationMinutes;
  const height = (totalMinutes / 60) * hourHeight;

  // Garantizar una altura mínima para eventos muy cortos
  return { top, height: Math.max(height, 25) };
}

// Function to check if two events overlap
export function eventsOverlap(
  event1: CalendarEvent,
  event2: CalendarEvent
): boolean {
  return (
    (event1.start < event2.end && event1.end > event2.start) || // Standard overlap
    Math.abs(event1.start.getTime() - event2.end.getTime()) < 60000 || // Events almost touching (less than 1 minute apart)
    Math.abs(event1.end.getTime() - event2.start.getTime()) < 60000
  );
}

// Function to group overlapping events
export function groupOverlappingEvents(
  events: CalendarEvent[]
): CalendarEvent[][] {
  if (!events.length) return [];

  const sortedEvents = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];

  sortedEvents.forEach((event) => {
    if (
      currentGroup.length === 0 ||
      currentGroup.some((e) => eventsOverlap(e, event))
    ) {
      currentGroup.push(event);
    } else {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
      }
      currentGroup = [event];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
