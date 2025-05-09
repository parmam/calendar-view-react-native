import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  GestureResponderHandlers,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useCalendar } from "./CalendarContext";
import {
  addDays,
  formatTime,
  getWeekDates,
  filterEventsByDay,
  getEventPosition,
  timeToDate,
  isToday,
  getDayName,
  eventsOverlap,
  groupOverlappingEvents,
} from "./utils";
import { useScrollHandler } from "./utils/ScrollHandler";
import { useLogger } from "./utils/logger";
import Event from "./Event";
import { CalendarEvent, CalendarViewType } from "./types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const HOUR_HEIGHT = 60;
const TIME_LABEL_WIDTH = 50;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TimeGridProps {
  viewType: CalendarViewType;
  panHandlers?: GestureResponderHandlers;
}

const TimeGrid: React.FC<TimeGridProps> = ({ viewType, panHandlers }) => {
  // Initialize logger
  const logger = useLogger("TimeGrid");

  // Initialize scroll handler hook
  const { scrollPosition, scrollTo, scrollProps } = useScrollHandler();

  const {
    selectedDate,
    events,
    timeRange,
    theme,
    locale,
    firstDayOfWeek,
    visibleDays,
    timeInterval,
    onTimeSlotPress,
    onEventCreate,
    onEventPress,
    zoomLevel,
    unavailableHours,
  } = useCalendar();

  const [gridWidth, setGridWidth] = useState(SCREEN_WIDTH - TIME_LABEL_WIDTH);
  const [isResizingEvent, setIsResizingEvent] = useState(false);
  const [newEventCoords, setNewEventCoords] = useState<{
    startY: number;
    currentY: number;
    dayIndex: number;
    isCreating: boolean;
  } | null>(null);

  // Generate hours based on time range
  const hours = useMemo(() => {
    const result = [];
    for (let hour = timeRange.start; hour < timeRange.end; hour++) {
      result.push(hour);
    }
    return result;
  }, [timeRange]);

  // Calculate dates to display based on view type
  const dates = useMemo(() => {
    switch (viewType) {
      case "day":
        return [selectedDate];
      case "3day": {
        const result = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() + i);
          result.push(date);
        }
        return result;
      }
      case "week":
        return getWeekDates(selectedDate, firstDayOfWeek).filter((_, i) =>
          visibleDays.includes(i)
        );
      case "workWeek":
        // Solo mostrar días laborables (lunes a viernes)
        return getWeekDates(selectedDate, 1).slice(0, 5);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  // Calculate column width based on grid width and number of days
  const columnWidth = gridWidth / dates.length;

  // Calculate now indicator position for today
  const nowIndicatorPosition = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < timeRange.start || hours > timeRange.end) {
      return null;
    }

    const position = (hours - timeRange.start) * HOUR_HEIGHT;
    const minutePosition = (minutes / 60) * HOUR_HEIGHT;

    return position + minutePosition;
  }, [timeRange]);

  // Scroll to current time on first render
  useEffect(() => {
    if (nowIndicatorPosition) {
      const position = Math.max(0, nowIndicatorPosition - 100);
      logger.debug("Scrolling to current time", { position });

      // Use setTimeout to ensure component is mounted
      setTimeout(() => {
        scrollTo({ y: position, animated: true });
      }, 500);
    }
  }, [nowIndicatorPosition, viewType, selectedDate, scrollTo]);

  // Actualizar el scroll cada minuto para seguir la línea de tiempo actual
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (
        hours >= timeRange.start &&
        hours <= timeRange.end &&
        isToday(dates[0])
      ) {
        const position =
          (hours - timeRange.start + minutes / 60) * HOUR_HEIGHT * zoomLevel;
        const scrollPosition = Math.max(0, position - 100); // Centrar un poco por encima

        logger.debug("Auto-scrolling to current time", { scrollPosition });
        scrollTo({ y: scrollPosition, animated: true });
      }
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [timeRange, zoomLevel, dates, selectedDate, scrollTo]);

  // Grid layout
  const onGridLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setGridWidth(width);
  };

  // Función mejorada para posicionar los eventos y manejar solapamientos
  const positionEventsWithOverlap = (
    dayEvents: CalendarEvent[]
  ): Array<CalendarEvent & { left: number; width: number }> => {
    if (!dayEvents.length) return [];

    // Ordenar eventos por hora de inicio y luego por duración
    const sortedEvents = [...dayEvents].sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff !== 0) return startDiff;

      // Si la hora de inicio es la misma, ordenar por duración (más corta primero)
      return (
        a.end.getTime() -
        a.start.getTime() -
        (b.end.getTime() - b.start.getTime())
      );
    });

    // Identificar grupos de eventos que se solapan
    const overlapGroups: CalendarEvent[][] = [];
    let currentGroup: CalendarEvent[] = [];

    sortedEvents.forEach((event) => {
      // Si el grupo está vacío o el evento actual se solapa con alguno del grupo actual
      if (
        currentGroup.length === 0 ||
        currentGroup.some(
          (e) =>
            (event.start < e.end && event.end > e.start) || // Solapamiento clásico
            Math.abs(event.start.getTime() - e.end.getTime()) < 60000 || // Eventos que casi se tocan (menos de 1 minuto)
            Math.abs(event.end.getTime() - e.start.getTime()) < 60000
        )
      ) {
        currentGroup.push(event);
      } else {
        // Si no hay solapamiento, guardar el grupo actual y empezar uno nuevo
        if (currentGroup.length > 0) {
          overlapGroups.push([...currentGroup]);
        }
        currentGroup = [event];
      }
    });

    // Añadir el último grupo si no está vacío
    if (currentGroup.length > 0) {
      overlapGroups.push(currentGroup);
    }

    // Calcular posición y ancho para cada evento
    const positionedEvents: Array<
      CalendarEvent & { left: number; width: number }
    > = [];

    overlapGroups.forEach((group) => {
      // Para cada grupo, distribuir los eventos horizontalmente
      const totalWidth = columnWidth - 10; // Dejar un pequeño margen
      const eventWidth =
        group.length > 1 ? totalWidth / group.length : totalWidth - 10;

      group.forEach((event, index) => {
        // Calcular posición izquierda basada en el índice
        const left = index * eventWidth + 5; // 5px de margen izquierdo

        positionedEvents.push({
          ...event,
          left,
          width: eventWidth - 5, // 5px de margen derecho
        });
      });
    });

    return positionedEvents;
  };

  // Mejorar la función renderEvents para usar el posicionamiento calculado
  const renderEvents = (dayIndex: number) => {
    // Filtrar eventos para este día
    const date = dates[dayIndex];
    const allEvents = filterEventsByDay(events, date);

    if (allEvents.length === 0) return null;

    // Calcular posición y dimensiones para cada evento
    const positionedEvents = positionEventsWithOverlap(allEvents);

    return (
      <>
        {positionedEvents.map((event) => {
          // Calcular posición y dimensiones basadas en el tiempo
          const { top, height } = getEventPosition(
            event,
            timeRange.start,
            timeRange.end,
            HOUR_HEIGHT * zoomLevel
          );

          // Omitir eventos fuera del área visible
          if (
            top < 0 ||
            top > HOUR_HEIGHT * zoomLevel * (timeRange.end - timeRange.start)
          ) {
            return null;
          }

          return (
            <Event
              key={event.id}
              event={event}
              width={event.width}
              left={event.left}
              isResizing={isResizingEvent}
              setIsResizing={setIsResizingEvent}
            />
          );
        })}
      </>
    );
  };

  // Check if a specific time slot is unavailable
  const isTimeSlotUnavailable = (
    date: Date,
    hour: number,
    minute: number
  ): boolean => {
    if (!unavailableHours) return false;

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();

    // Check if this day is included in unavailable days
    const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6]; // Default to all days
    if (!daysToCheck.includes(dayOfWeek)) return false;

    // Create a decimal time value (e.g. 9.5 for 9:30)
    const timeValue = hour + minute / 60;

    // Check if time falls within any unavailable range
    return unavailableHours.ranges.some(
      (range) => timeValue >= range.start && timeValue < range.end
    );
  };

  // Handle time slot press, checking for unavailability
  const handleTimeSlotPress = (
    dayIndex: number,
    hour: number,
    minutes: number
  ) => {
    if (isResizingEvent || !onTimeSlotPress) return;

    // Don't create event if already creating one
    if (newEventCoords?.isCreating) return;

    // Create start and end dates
    const date = dates[dayIndex];

    // Check if the time slot is unavailable
    if (isTimeSlotUnavailable(date, hour, minutes)) {
      logger.debug("Time slot is unavailable", { date, hour, minutes });
      return; // Don't allow interaction with unavailable time slots
    }

    const start = new Date(date);
    start.setHours(hour, minutes, 0, 0);

    // End time is 1 hour after start by default
    const end = new Date(start);
    end.setHours(hour + 1, minutes, 0, 0);

    // Call the callback
    logger.debug("Time slot pressed", { start, end });
    onTimeSlotPress(start, end);
  };

  // Function to create an event using drag gesture
  const createEventWithDrag = (start: Date, end: Date, dayIndex: number) => {
    if (!newEventCoords || !onEventCreate) return;

    // Ensure end time is after start time
    if (end <= start) {
      end = new Date(start);
      end.setHours(start.getHours() + 1);
    }

    // Create event object
    const newEvent: CalendarEvent = {
      id: `temp-event-${Date.now()}`,
      title: "Nuevo evento",
      start,
      end,
      color:
        theme.eventColors[Math.floor(Math.random() * theme.eventColors.length)],
    };

    // Call the callback
    logger.debug("Creating event with drag", newEvent);
    onEventCreate(newEvent);

    // Reset coordinates
    setNewEventCoords(null);
  };

  // Function to convert y coordinate to time
  const yToTime = (y: number): { hour: number; minutes: number } => {
    // Adjust for zoom level
    const adjustedY = y / zoomLevel;

    // Calculate hour
    const hourDecimal = adjustedY / HOUR_HEIGHT;
    const hour = Math.floor(hourDecimal) + timeRange.start;

    // Calculate minutes
    const minuteDecimal = (hourDecimal - Math.floor(hourDecimal)) * 60;
    let minutes = Math.floor(minuteDecimal);

    // Snap to nearest timeInterval
    minutes = Math.round(minutes / timeInterval) * timeInterval;

    return { hour, minutes };
  };

  // Animated styles
  const createEventOpacity = new Animated.Value(0);

  // Show creation indicator
  const showEventIndicator = () => {
    Animated.timing(createEventOpacity, {
      toValue: 0.7,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Hide creation indicator
  const hideEventIndicator = () => {
    Animated.timing(createEventOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Create event gesture
  const createEventGesture = Gesture.Pan()
    .activateAfterLongPress(200) // Solo activar después de mantener presionado
    .onStart((e) => {
      if (isResizingEvent) return;

      const dayIndex = Math.floor(e.x / columnWidth);
      if (dayIndex < 0 || dayIndex >= dates.length) return;

      logger.debug("Starting event creation gesture", { x: e.x, y: e.y });

      setNewEventCoords({
        startY: e.y + scrollPosition.y,
        currentY: e.y + scrollPosition.y,
        dayIndex,
        isCreating: true,
      });

      showEventIndicator();
    })
    .onUpdate((e) => {
      if (!newEventCoords || isResizingEvent) return;

      setNewEventCoords({
        ...newEventCoords,
        currentY: e.y + scrollPosition.y,
      });
    })
    .onEnd((e) => {
      if (!newEventCoords || isResizingEvent) return;

      logger.debug("Ending event creation gesture", {
        startY: newEventCoords.startY,
        endY: newEventCoords.currentY,
      });

      const { startY, currentY, dayIndex } = newEventCoords;
      const startCoord = Math.min(startY, currentY);
      const endCoord = Math.max(startY, currentY);

      const startTime = yToTime(startCoord);
      const endTime = yToTime(endCoord);

      const date = dates[dayIndex];
      const start = new Date(date);
      start.setHours(startTime.hour, startTime.minutes, 0, 0);

      const end = new Date(date);
      end.setHours(endTime.hour, endTime.minutes, 0, 0);

      // Ensure minimum duration (30 minutes)
      if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
        end.setMinutes(start.getMinutes() + 30);
      }

      createEventWithDrag(start, end, dayIndex);
      hideEventIndicator();
      setNewEventCoords(null);
    })
    .simultaneousWithExternalGesture(); // Allow scrolling while panning without specifying Gesture.Scroll

  // Render time labels (left column)
  const renderTimeLabels = () => (
    <View
      style={[
        styles.timeLabelsContainer,
        {
          borderRightColor: theme.gridLineColor,
          borderRightWidth: 1,
          borderLeftColor: theme.gridLineColor,
          borderLeftWidth: 1,
        },
      ]}
    >
      {hours.map((hour) => (
        <View
          key={`time-${hour}`}
          style={[
            styles.timeLabel,
            {
              height: HOUR_HEIGHT * zoomLevel,
              borderBottomColor: theme.gridLineColor,
              borderBottomWidth: 1,
            },
          ]}
        >
          <Text style={[styles.timeLabelText, { color: theme.textColor }]}>
            {formatTime(new Date(new Date().setHours(hour, 0, 0, 0)), locale)}
          </Text>
        </View>
      ))}
    </View>
  );

  // Render grid lines
  const renderGridLines = () => (
    <View
      style={[
        styles.gridLinesContainer,
        {
          height: hours.length * HOUR_HEIGHT * zoomLevel,
        },
      ]}
    >
      {hours.map((hour) => (
        <View
          key={`grid-${hour}`}
          style={[
            styles.gridLine,
            {
              top: (hour - timeRange.start) * HOUR_HEIGHT * zoomLevel,
              borderTopColor: theme.gridLineColor,
              borderTopWidth: 1,
            },
          ]}
        />
      ))}

      {/* Half-hour lines (lighter) */}
      {hours.map((hour) => (
        <View
          key={`grid-half-${hour}`}
          style={[
            styles.gridLine,
            {
              top: (hour - timeRange.start + 0.5) * HOUR_HEIGHT * zoomLevel,
              borderTopColor: theme.gridLineColor,
              borderTopWidth: 0.5,
            },
          ]}
        />
      ))}
    </View>
  );

  // Render now indicator (red line)
  const renderNowIndicator = () => {
    if (!nowIndicatorPosition || !dates.some((date) => isToday(date))) {
      return null;
    }

    // Find all columns that are today
    const todayIndices = dates
      .map((date, index) => (isToday(date) ? index : -1))
      .filter((index) => index !== -1);

    return (
      <>
        {todayIndices.map((columnIndex) => (
          <View
            key={`now-indicator-${columnIndex}`}
            style={[
              styles.nowIndicator,
              {
                top: nowIndicatorPosition * zoomLevel,
                left: columnIndex * columnWidth,
                width: columnWidth,
                borderColor: theme.hourIndicatorColor,
              },
            ]}
          >
            <View
              style={[
                styles.nowIndicatorCircle,
                { backgroundColor: theme.hourIndicatorColor },
              ]}
            />
          </View>
        ))}
      </>
    );
  };

  // Render time slots (clickable areas)
  const renderTimeSlots = () => {
    // Generate time intervals between hours (e.g., every 30 minutes)
    const timeSlots: Array<{ hour: number; minute: number }> = [];

    for (let hour of hours) {
      for (let minute = 0; minute < 60; minute += timeInterval) {
        timeSlots.push({ hour, minute });
      }
    }

    return (
      <View style={styles.timeSlotsContainer}>
        {dates.map((date, dayIndex) => (
          <View
            key={`day-${dayIndex}`}
            style={[
              styles.dayColumn,
              {
                width: columnWidth,
                left: dayIndex * columnWidth,
                height: hours.length * HOUR_HEIGHT * zoomLevel,
                borderRightColor: theme.gridLineColor,
                borderRightWidth: dayIndex < dates.length - 1 ? 1 : 0,
              },
              isWeekend(date) && {
                backgroundColor: theme.weekendColor,
              },
              isToday(date) && {
                backgroundColor: theme.selectedDayColor,
              },
            ]}
          >
            {/* Events for this day */}
            {renderEvents(dayIndex)}

            {/* Time slots - transparent clickable areas */}
            {timeSlots.map(({ hour, minute }, slotIndex) => {
              // Calculate slot position
              const slotTop =
                ((hour - timeRange.start) * 60 + minute) *
                (HOUR_HEIGHT / 60) *
                zoomLevel;
              const slotHeight =
                ((timeInterval * HOUR_HEIGHT) / 60) * zoomLevel;

              // Check if time slot is unavailable
              const isUnavailable = isTimeSlotUnavailable(date, hour, minute);

              return (
                <TouchableWithoutFeedback
                  key={`slot-${slotIndex}-day-${dayIndex}`}
                  onPress={() => handleTimeSlotPress(dayIndex, hour, minute)}
                  disabled={isUnavailable}
                >
                  <View
                    style={[
                      styles.timeSlot,
                      {
                        top: slotTop,
                        height: slotHeight,
                      },
                      isUnavailable && {
                        backgroundColor: theme.unavailableHoursColor,
                      },
                    ]}
                  />
                </TouchableWithoutFeedback>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Helper function to check if a date is a weekend
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  // Main render
  return (
    <GestureDetector gesture={createEventGesture}>
      <View style={styles.container}>
        <ScrollView
          {...scrollProps}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            {
              height: hours.length * HOUR_HEIGHT * zoomLevel,
              minHeight: "100%",
            },
          ]}
          onScrollEndDrag={() => {
            // Ayuda a mantener el rastreo de la posición actual de desplazamiento
            logger.debug("Scroll end drag");
          }}
          directionalLockEnabled={true} // Bloquear a scroll vertical
          showsVerticalScrollIndicator={true}
          scrollEnabled={true} // Aseguramos que el scroll esté habilitado
        >
          <View style={styles.timeGrid}>
            {/* Time labels */}
            {renderTimeLabels()}

            {/* Grid container for time slots and events */}
            <View style={styles.gridContainer} onLayout={onGridLayout}>
              {/* Background grid lines */}
              {renderGridLines()}

              {/* Time slots */}
              {renderTimeSlots()}

              {/* Now indicator */}
              {renderNowIndicator()}

              {/* New event creation indicator */}
              {newEventCoords && (
                <Animated.View
                  style={[
                    styles.newEventIndicator,
                    {
                      top: Math.min(
                        newEventCoords.startY,
                        newEventCoords.currentY
                      ),
                      height: Math.abs(
                        newEventCoords.currentY - newEventCoords.startY
                      ),
                      left: newEventCoords.dayIndex * columnWidth,
                      width: columnWidth,
                      backgroundColor: theme.dragCreateIndicatorColor,
                      borderColor: theme.primaryColor,
                      opacity: createEventOpacity,
                    },
                  ]}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E5EA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  timeGrid: {
    flexDirection: "row",
    flex: 1,
  },
  timeLabelsContainer: {
    width: TIME_LABEL_WIDTH,
  },
  timeLabel: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: "500",
  },
  gridContainer: {
    flex: 1,
    position: "relative",
  },
  gridLinesContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  verticalGridLine: {
    position: "absolute",
    top: 0,
  },
  timeSlotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dayColumn: {
    position: "absolute",
    top: 0,
  },
  timeSlot: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  nowIndicator: {
    position: "absolute",
    height: 2,
    borderTopWidth: 2,
    zIndex: 10,
  },
  nowIndicatorCircle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -4,
    left: 0,
  },
  newEventIndicator: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    zIndex: 5,
  },
});

export default TimeGrid;
