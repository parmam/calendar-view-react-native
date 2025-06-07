import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useCalendar } from "./CalendarContext";
import {
  getMonthDates,
  isSameDay,
  isToday,
  formatDate,
  getDayName,
  matchesRecurrenceRule,
} from "./utils";
import { useScrollHandler } from "./utils/ScrollHandler";
import { useLogger } from "./utils/logger";
import { CalendarEvent } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MonthView: React.FC = () => {
  // Initialize logger
  const logger = useLogger("MonthView");

  // Initialize scroll handler
  const { scrollProps } = useScrollHandler();

  const {
    selectedDate,
    events,
    theme,
    locale,
    firstDayOfWeek,
    onEventPress,
    onTimeSlotPress,
    setSelectedDate,
    viewType,
    setViewType,
  } = useCalendar();

  // Get all dates for the current month view
  const dates = useMemo(() => {
    return getMonthDates(selectedDate, firstDayOfWeek);
  }, [selectedDate, firstDayOfWeek]);

  // Process all events including recurring events
  const processedEvents = useMemo(() => {
    logger.debug("Processing events for month view", {
      month: selectedDate.getMonth() + 1,
      year: selectedDate.getFullYear(),
      eventCount: events.length,
    });

    // Procesar todos los eventos, incluidos los recurrentes
    let allEvents: CalendarEvent[] = [];

    events.forEach((event) => {
      // Añadir el evento original
      allEvents.push(event);

      // Procesar eventos recurrentes
      if (event.recurrence) {
        const startMonth = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        );
        const endMonth = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          0
        );

        // Para cada día del mes
        for (
          let day = new Date(startMonth);
          day <= endMonth;
          day.setDate(day.getDate() + 1)
        ) {
          // Verificar si el día coincide con la regla de recurrencia
          if (matchesRecurrenceRule(day, event.start, event.recurrence)) {
            // No incluir el evento original
            if (!isSameDay(day, event.start)) {
              // Crear una instancia del evento recurrente para esta fecha
              const recurrenceStart = new Date(day);
              recurrenceStart.setHours(
                event.start.getHours(),
                event.start.getMinutes(),
                event.start.getSeconds()
              );

              const recurrenceEnd = new Date(day);
              const duration = event.end.getTime() - event.start.getTime();
              recurrenceEnd.setTime(recurrenceStart.getTime() + duration);

              // Excluir fechas de excepción
              if (
                event.recurrence.exceptions &&
                event.recurrence.exceptions.some((exc) => isSameDay(exc, day))
              ) {
                continue;
              }

              const recurrenceEvent: CalendarEvent = {
                ...event,
                id: `${event.id}-recurrence-${day.toISOString().split("T")[0]}`,
                start: recurrenceStart,
                end: recurrenceEnd,
                isRecurrence: true,
              };

              allEvents.push(recurrenceEvent);
            }
          }
        }
      }
    });

    logger.debug("Processed events", {
      total: allEvents.length,
      recurring: allEvents.length - events.length,
    });

    return allEvents;
  }, [events, selectedDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const result: Record<string, CalendarEvent[]> = {};

    dates.forEach((date) => {
      const dateStr = date.toISOString().split("T")[0];

      // Filtrar eventos para esta fecha
      const dayEvents = processedEvents.filter((event) => {
        const eventDate = new Date(event.start);
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        );
      });

      result[dateStr] = dayEvents;
    });

    return result;
  }, [dates, processedEvents]);

  // Generate week day headers
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (firstDayOfWeek + i) % 7;
      const date = new Date(2021, 0, 3 + dayIndex); // January 3, 2021 was a Sunday
      days.push(getDayName(date, locale, true));
    }
    return days;
  }, [firstDayOfWeek, locale]);

  // Handle day press
  const handleDayPress = useCallback(
    (date: Date) => {
      logger.debug("Day pressed", { date });

      setSelectedDate(date);

      // Si está en vista mensual y el usuario presiona un día
      // podemos cambiar a vista de día para ese día específico
      if (viewType === "month") {
        logger.debug("Switching to day view");
        setViewType("day");
      }

      // Si hay eventos ese día, no crear evento automáticamente
      const dateStr = date.toISOString().split("T")[0];
      const hasEvents = (eventsByDate[dateStr] || []).length > 0;

      // Si no hay eventos para este día y existe el callback, dispararlo
      if (!hasEvents && onTimeSlotPress) {
        const start = new Date(date);
        start.setHours(9, 0, 0);
        const end = new Date(date);
        end.setHours(10, 0, 0);
        logger.debug("Creating event for empty day", { start, end });
        onTimeSlotPress(start, end);
      }
    },
    [setSelectedDate, viewType, setViewType, eventsByDate, onTimeSlotPress]
  );

  // Handles when an event block is pressed
  const handleEventPress = useCallback(
    (event: CalendarEvent) => {
      logger.debug("Event pressed", { eventId: event.id, title: event.title });

      if (onEventPress) {
        onEventPress(event);

        // Opcionalmente, cambiar a vista de día para ver más detalles del evento
        const eventDate = new Date(event.start);
        setSelectedDate(eventDate);

        // Si el evento no es de todo el día y estamos en vista mensual,
        // podemos cambiar a vista diaria para mostrar el evento con detalle
        if (!event.isAllDay && viewType === "month") {
          logger.debug("Switching to day view to show event details");
          setViewType("day");
        }
      }
    },
    [onEventPress, setSelectedDate, viewType, setViewType]
  );

  // Creates chunked array of dates (for weeks)
  const weeks = useMemo(() => {
    const result = [];
    let week = [];

    for (let i = 0; i < dates.length; i++) {
      week.push(dates[i]);

      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      result.push(week);
    }

    return result;
  }, [dates]);

  // Determine if a date is in the current month
  const isCurrentMonth = useCallback(
    (date: Date) => {
      return date.getMonth() === selectedDate.getMonth();
    },
    [selectedDate]
  );

  // Determinar si es fin de semana
  const isWeekend = useCallback((date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  }, []);

  const getEventColor = useCallback(
    (event: CalendarEvent) => {
      return event.color || theme.eventColors[0];
    },
    [theme]
  );

  const calculateCellHeight = useCallback(() => {
    // Altura mínima para cada celda
    const minHeight = 80;
    // Calcular altura basada en el número de semanas
    const weeksInMonth = weeks.length;
    // Altura disponible para la grilla (restando la altura de los encabezados)
    const availableHeight = SCREEN_WIDTH * 1.2;

    return Math.max(minHeight, availableHeight / weeksInMonth);
  }, [weeks]);

  const dayCellHeight = calculateCellHeight();

  return (
    <ScrollView
      {...scrollProps}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      <View
        style={[
          styles.monthGrid,
          {
            borderLeftColor: theme.gridLineColor,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderRightColor: theme.gridLineColor,
          },
        ]}
      >
        {weeks.map((week, weekIndex) => (
          <View
            key={`week-${weekIndex}`}
            style={[
              styles.weekRow,
              {
                height: dayCellHeight,
                borderBottomColor: theme.gridLineColor,
                borderBottomWidth: 1,
              },
            ]}
          >
            {week.map((date, dayIndex) => {
              const dateStr = date.toISOString().split("T")[0];
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday_ = isToday(date);
              const inCurrentMonth = isCurrentMonth(date);
              const isWeekendDay = isWeekend(date);

              return (
                <TouchableOpacity
                  key={`day-${dayIndex}`}
                  style={[
                    styles.dayCell,
                    {
                      borderRightColor: theme.gridLineColor,
                      borderRightWidth: 1,
                    },
                    isToday_ && {
                      backgroundColor: theme.selectedDayColor,
                      borderColor: theme.todayIndicatorColor,
                      borderWidth: 1,
                    },
                    !inCurrentMonth && [
                      styles.otherMonthDay,
                      { borderColor: theme.gridLineColor },
                    ],
                    isWeekendDay && { backgroundColor: theme.weekendColor },
                  ]}
                  onPress={() => handleDayPress(date)}
                >
                  {/* Day number */}
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: theme.textColor },
                      isToday_ && {
                        color: theme.todayIndicatorColor,
                        fontWeight: "bold",
                      },
                      !inCurrentMonth && styles.otherMonthDayText,
                      isWeekendDay && { fontWeight: "500" },
                    ]}
                  >
                    {formatDate(date, locale)}
                  </Text>

                  {/* Event blocks */}
                  <View style={styles.eventContainer}>
                    {dayEvents.slice(0, 4).map((event, eventIndex) => {
                      const eventColor = getEventColor(event);

                      return (
                        <TouchableOpacity
                          key={`event-${event.id}`}
                          style={[
                            styles.eventBlock,
                            {
                              backgroundColor: eventColor,
                              opacity: event.isRecurrence ? 0.8 : 1,
                              borderWidth: 1,
                              borderColor: `${eventColor}80`, // 50% transparency
                            },
                          ]}
                          onPress={() => handleEventPress(event)}
                        >
                          <Text
                            style={[
                              styles.eventText,
                              { color: theme.eventTextColor },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {event.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* "More" indicator if there are more events */}
                    {dayEvents.length > 4 && (
                      <View style={styles.moreEventsIndicator}>
                        <Text
                          style={[
                            styles.moreEventsText,
                            { color: theme.secondaryColor },
                          ]}
                        >
                          +{dayEvents.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
  weekDaysRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  monthGrid: {
    flex: 1,
  },
  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  dayCell: {
    flex: 1,
    borderRightWidth: 1,
    padding: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  eventContainer: {
    flex: 1,
  },
  eventBlock: {
    borderRadius: 4,
    padding: 3,
    marginBottom: 3,
    minHeight: 18,
  },
  eventText: {
    fontSize: 10,
    fontWeight: "500",
  },
  moreEventsIndicator: {
    alignItems: "center",
    marginTop: 2,
  },
  moreEventsText: {
    fontSize: 10,
    fontWeight: "600",
  },
  otherMonthDay: {
    backgroundColor: "#F7F7F7",
  },
  otherMonthDayText: {
    color: "#BBBBBB",
  },
});

export default MonthView;
