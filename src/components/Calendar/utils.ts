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
  // Crear fechas de inicio y fin del día para comparar
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return events.filter((event) => {
    // Skip all-day events unless explicitly included
    if (event.isAllDay && !includeAllDay) {
      return false;
    }

    // Verificar si el evento ocurre durante el día seleccionado
    // Un evento ocurre en el día si:
    // - Su inicio está en el día, o
    // - Su fin está en el día, o
    // - Su inicio es anterior al día y su fin es posterior al día (eventos de múltiples días)
    return (
      // El evento comienza este día
      (event.start >= startOfDay && event.start <= endOfDay) ||
      // El evento termina este día
      (event.end >= startOfDay && event.end <= endOfDay) ||
      // El evento abarca todo este día (comenzó antes y termina después)
      (event.start <= startOfDay && event.end >= endOfDay)
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

  // Normalizar las horas al rango visible
  let startHourTime = eventStart.getHours();
  let startMinuteTime = eventStart.getMinutes();
  let endHourTime = eventEnd.getHours();
  let endMinuteTime = eventEnd.getMinutes();

  // Para debugging
  const originalStart = { hour: startHourTime, minute: startMinuteTime };
  const originalEnd = { hour: endHourTime, minute: endMinuteTime };

  // Asegurarse de que los tiempos estén dentro del rango visible
  if (startHourTime < startHour) {
    startHourTime = startHour;
    startMinuteTime = 0;
  }

  if (endHourTime > endHour) {
    endHourTime = endHour;
    endMinuteTime = 0;
  }

  // Casos especiales: eventos que comienzan después del rango o terminan antes del rango
  if (startHourTime > endHour || endHourTime < startHour) {
    return { top: -9999, height: 0 }; // Evento fuera del rango visible
  }

  // Asegurarse de que el evento tenga al menos una duración mínima visible
  if (startHourTime === endHourTime && startMinuteTime === endMinuteTime) {
    endMinuteTime = startMinuteTime + 30; // Mínimo 30 minutos
    if (endMinuteTime >= 60) {
      endHourTime += 1;
      endMinuteTime -= 60;
    }
  }

  // Calcular posición superior (top)
  const hoursFromStart = startHourTime - startHour;
  const minutesPercentage = startMinuteTime / 60;
  const top = (hoursFromStart + minutesPercentage) * hourHeight;

  // Calcular altura
  let totalMinutes;

  if (endHourTime === startHourTime) {
    // Si el evento comienza y termina en la misma hora, calcular minutos directamente
    totalMinutes = endMinuteTime - startMinuteTime;
  } else {
    // Si el evento abarca múltiples horas
    const durationHours = endHourTime - startHourTime;
    const durationMinutes = endMinuteTime - startMinuteTime;
    totalMinutes = durationHours * 60 + durationMinutes;
  }

  const height = (totalMinutes / 60) * hourHeight;

  // Garantizar una altura mínima para eventos muy cortos
  return {
    top,
    height: Math.max(height, 25),
  };
}

// Versión optimizada para calcular posición exacta de eventos
export function getEventPositionExact(
  event: CalendarEvent,
  rangeStartHour: number,
  rangeEndHour: number,
  hourHeight: number
): { top: number; height: number } {
  // Calcular minutos totales desde el inicio del rango para la hora de inicio
  const startHourDiff = event.start.getHours() - rangeStartHour;
  const startMinutes = event.start.getMinutes();
  const startTotalMinutes = startHourDiff * 60 + startMinutes;

  // Calcular la posición superior exacta sin redondeo
  const top = (startTotalMinutes * hourHeight) / 60;

  // Calcular duración exacta en minutos
  const durationMs = event.end.getTime() - event.start.getTime();
  const durationMinutes = durationMs / (1000 * 60);

  // Calcular altura exacta proporcional a la duración
  const height = (durationMinutes * hourHeight) / 60;

  return { top, height };
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

// Función mejorada para agrupar eventos solapados
export function groupOverlappingEvents(
  events: CalendarEvent[]
): CalendarEvent[][] {
  if (!events.length) return [];

  // Ordenar eventos primero por hora de inicio y luego por duración
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;

    // Para eventos que comienzan al mismo tiempo, priorizar los más largos
    return (
      b.end.getTime() -
      b.start.getTime() -
      (a.end.getTime() - a.start.getTime())
    );
  });

  // Matriz de adyacencia para representar las colisiones entre eventos
  const overlapMatrix: boolean[][] = Array(sortedEvents.length)
    .fill(null)
    .map(() => Array(sortedEvents.length).fill(false));

  // Completar la matriz de colisiones
  for (let i = 0; i < sortedEvents.length; i++) {
    for (let j = i + 1; j < sortedEvents.length; j++) {
      if (eventsOverlap(sortedEvents[i], sortedEvents[j])) {
        overlapMatrix[i][j] = overlapMatrix[j][i] = true;
      }
    }
  }

  // Utilizar algoritmo de búsqueda en profundidad para encontrar grupos conectados
  const visited = Array(sortedEvents.length).fill(false);
  const groups: CalendarEvent[][] = [];

  function dfs(index: number, currentGroup: number[]) {
    visited[index] = true;
    currentGroup.push(index);

    for (let i = 0; i < sortedEvents.length; i++) {
      if (overlapMatrix[index][i] && !visited[i]) {
        dfs(i, currentGroup);
      }
    }
  }

  // Encontrar todos los grupos conectados
  for (let i = 0; i < sortedEvents.length; i++) {
    if (!visited[i]) {
      const currentGroup: number[] = [];
      dfs(i, currentGroup);
      groups.push(currentGroup.map((idx) => sortedEvents[idx]));
    }
  }

  return groups;
}

// Función auxiliar para encontrar el número máximo de eventos simultáneos
export function findMaxConcurrentEvents(events: CalendarEvent[]): number {
  if (events.length <= 1) return events.length;

  // Extraer puntos de tiempo (inicio y fin) de todos los eventos
  type TimePoint = { time: number; isStart: boolean };
  const timePoints: TimePoint[] = [];

  events.forEach((event) => {
    timePoints.push({ time: event.start.getTime(), isStart: true });
    timePoints.push({ time: event.end.getTime(), isStart: false });
  });

  // Ordenar puntos de tiempo
  timePoints.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    // Si los tiempos son iguales, los finales van primero para manejar eventos contiguos
    return a.isStart ? 1 : -1;
  });

  let concurrent = 0;
  let maxConcurrent = 0;

  // Recorrer puntos para encontrar el máximo de eventos simultáneos
  timePoints.forEach((point) => {
    if (point.isStart) {
      concurrent++;
    } else {
      concurrent--;
    }
    maxConcurrent = Math.max(maxConcurrent, concurrent);
  });

  return maxConcurrent;
}
