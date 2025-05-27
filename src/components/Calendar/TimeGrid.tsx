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
  getEventPositionExact,
  timeToDate,
  isToday,
  getDayName,
  eventsOverlap,
  groupOverlappingEvents,
} from "./utils";
import { useScrollHandler } from "./utils/ScrollHandler";
import { useLogger } from "./utils/logger";
import Event from "./Event";
import { CalendarEvent, CalendarViewType, SnapLineIndicator } from "./types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLayoutConfig, useOverlapConfig } from "./config";

// Definir constantes de cuadrícula
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TimeGridProps {
  viewType: CalendarViewType;
  panHandlers?: GestureResponderHandlers;
  onEventDrag?: (
    event: CalendarEvent,
    minuteDiff: number,
    snapTime?: Date
  ) => boolean;
  onDragEnd?: () => void;
  snapLineIndicator?: SnapLineIndicator | null;
  timeInterval?: number;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  viewType,
  panHandlers,
  onEventDrag,
  onDragEnd,
  snapLineIndicator,
  timeInterval: propTimeInterval,
}) => {
  // Initialize logger
  const logger = useLogger("TimeGrid");

  // Obtener configuraciones de layout y overlap
  const { layoutConfig } = useLayoutConfig();
  const { overlapConfig } = useOverlapConfig();

  // Usar valores de la configuración
  const HOUR_HEIGHT = layoutConfig.HOUR_HEIGHT;
  const TIME_LABEL_WIDTH = layoutConfig.TIME_LABEL_WIDTH;

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
    onTimeSlotPress,
    onEventCreate,
    onEventPress,
    zoomLevel,
    unavailableHours,
    timeInterval: contextTimeInterval,
  } = useCalendar();

  // Use provided timeInterval or fall back to context value
  const timeInterval = propTimeInterval || contextTimeInterval || 30;

  const [gridWidth, setGridWidth] = useState(SCREEN_WIDTH - TIME_LABEL_WIDTH);
  const [isResizingEvent, setIsResizingEvent] = useState(false);
  const [newEventCoords, setNewEventCoords] = useState<{
    startY: number;
    currentY: number;
    dayIndex: number;
    isCreating: boolean;
  } | null>(null);

  // Estado para rastrear la zona de destino durante el arrastre
  const [dragTarget, setDragTarget] = useState<{
    dayIndex: number;
    hour: number;
    minute: number;
  } | null>(null);

  // Forzar recálculo de posiciones cuando hay cambios en los eventos
  const [refreshKey, setRefreshKey] = useState(0);

  // Efecto para detectar cambios en eventos y forzar recálculo
  useEffect(() => {
    // Incrementar la key para forzar el recálculo de posiciones
    setRefreshKey((prev) => prev + 1);
    logger.debug("Events updated, forcing recalculation", {
      eventCount: events.length,
      refreshKey: refreshKey + 1,
    });
  }, [events]);

  // Efecto para hacer debug del refreshKey
  useEffect(() => {
    logger.debug("Refresh triggered", { refreshKey });
  }, [refreshKey]);

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

    // Utilizamos el algoritmo de agrupación mejorado de utils
    const overlapGroups = groupOverlappingEvents(sortedEvents);

    // Calcular posición y ancho para cada evento
    const positionedEvents: Array<
      CalendarEvent & { left: number; width: number }
    > = [];

    overlapGroups.forEach((group) => {
      if (group.length === 1) {
        // Si solo hay un evento en el grupo, ocupa todo el ancho
        positionedEvents.push({
          ...group[0],
          left: 5,
          width: columnWidth - 10,
        });
        return;
      }

      // Para grupos con múltiples eventos, necesitamos resolver colisiones
      // Paso 1: Crear una matriz de colisiones
      const collisionMatrix: boolean[][] = [];
      for (let i = 0; i < group.length; i++) {
        collisionMatrix[i] = [];
        for (let j = 0; j < group.length; j++) {
          if (i === j) {
            collisionMatrix[i][j] = false;
            continue;
          }

          // Verificar colisiones entre eventos
          const eventA = group[i];
          const eventB = group[j];

          // Un evento se solapa con otro si comparten algún intervalo de tiempo
          collisionMatrix[i][j] = eventsOverlap(eventA, eventB);
        }
      }

      // Paso 2: Asignar columnas a los eventos usando un algoritmo más eficiente
      const eventColumns: number[] = Array(group.length).fill(-1);
      const maxColumnsPerEvent: number[] = Array(group.length).fill(1);

      // Primero, asignar columnas basadas en colisiones
      for (let i = 0; i < group.length; i++) {
        // Obtener todas las columnas ya ocupadas por eventos que se solapan con este
        const usedColumns = new Set<number>();
        for (let j = 0; j < i; j++) {
          if (collisionMatrix[i][j] && eventColumns[j] !== -1) {
            usedColumns.add(eventColumns[j]);
          }
        }

        // Encontrar la primera columna disponible
        let column = 0;
        while (usedColumns.has(column)) {
          column++;
        }

        eventColumns[i] = column;
      }

      // Identificar el número máximo de columnas necesarias
      const maxColumn = Math.max(...eventColumns);
      // Usar MAX_COLUMNS del overlapConfig para limitar el número de columnas
      const maxAllowedColumns = overlapConfig.MAX_COLUMNS;
      const totalColumns = Math.min(maxColumn + 1, maxAllowedColumns);

      // Log para debugging
      logger.debug("Event columns assignment", {
        groupSize: group.length,
        maxColumn,
        totalColumns,
        eventColumns,
        events: group.map((e) => e.title),
        startTimes: group.map((e) => e.start.toLocaleTimeString()),
        endTimes: group.map((e) => e.end.toLocaleTimeString()),
      });

      // Paso 3: Calcular ancho y posición para cada evento
      // Definir márgenes y espaciado
      const marginLeft = 2;
      const marginRight = 2;
      const marginBetween = 1; // Espacio reducido entre eventos

      // Calcular ancho disponible para todos los eventos en esta columna
      const availableWidth = columnWidth - (marginLeft + marginRight);

      // Ancho base para cada columna
      const columnBaseWidth = availableWidth / totalColumns;

      // Determinar el ancho mínimo para cada evento
      const minEventWidth = Math.min(35, columnBaseWidth); // Permitir eventos más estrechos cuando hay muchas columnas

      // Log de debugging para dimensiones
      logger.debug("Event layout calculations", {
        availableWidth,
        totalColumns,
        columnBaseWidth,
        groupSize: group.length,
        minEventWidth,
      });

      // Asignar anchos y posiciones
      for (let i = 0; i < group.length; i++) {
        // Calcular posición izquierda base
        const leftPosition = marginLeft + eventColumns[i] * columnBaseWidth;

        // Establecer márgenes mínimos y máximos para mantener los eventos dentro de la columna
        const startMargin = marginLeft + (eventColumns[i] === 0 ? 2 : 0);
        const endMargin = marginRight + (eventColumns[i] === maxColumn ? 2 : 0);

        // Calcular ancho disponible para este evento en su posición
        const maxWidthAtPosition = columnWidth - leftPosition - endMargin;

        // Calcular ancho base ajustado al número de columnas
        const baseWidth = Math.max(
          columnBaseWidth - marginBetween,
          minEventWidth
        );

        // Asegurar que el ancho no exceda el espacio disponible
        const constrainedWidth = Math.min(baseWidth, maxWidthAtPosition);

        // Mantener un ancho mínimo legible
        const width = Math.max(constrainedWidth, minEventWidth);

        // Ajustar la posición izquierda para asegurarnos de que no se sale de la columna
        const maxLeftPosition = columnWidth - width - endMargin;
        const adjustedLeft = Math.min(leftPosition, maxLeftPosition);

        // Si el evento está en la última columna o es muy estrecho, darle un poco más de espacio
        let finalWidth = width;
        if (
          (width < 40 && totalColumns <= 3) ||
          eventColumns[i] === maxColumn
        ) {
          // Intentar expandir un poco los eventos pequeños, sin exceder límites
          const expandedWidth = width * 1.1;
          if (adjustedLeft + expandedWidth <= columnWidth - endMargin) {
            finalWidth = expandedWidth;
          }
        }

        positionedEvents.push({
          ...group[i],
          left: adjustedLeft,
          width: finalWidth,
        });
      }
    });

    logger.debug("Positioned events with improved overlap algorithm", {
      totalEvents: positionedEvents.length,
      positions: positionedEvents.map((e) => ({
        id: e.id,
        title: e.title,
        left: e.left,
        width: e.width,
        start: e.start.toLocaleTimeString(),
        end: e.end.toLocaleTimeString(),
      })),
    });

    return positionedEvents;
  };

  // Reemplazar getEventPosition en TimeGrid.renderEvents
  const renderEvents = (dayIndex: number) => {
    // Filtrar eventos para este día
    const date = dates[dayIndex];
    const allEvents = filterEventsByDay(events, date);

    // Depuración de eventos
    logger.debug(`Rendering events for day ${dayIndex}`, {
      date: date.toISOString(),
      eventCount: allEvents.length,
      refreshKey,
      events: allEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
      })),
    });

    if (allEvents.length === 0) return null;

    // Calcular posición y dimensiones para cada evento
    const positionedEvents = positionEventsWithOverlap(allEvents);

    logger.debug(`Positioned events for day ${dayIndex}`, {
      count: positionedEvents.length,
      refreshKey,
      positioned: positionedEvents.map((e) => ({
        id: e.id,
        title: e.title,
        left: e.left,
        width: e.width,
      })),
    });

    return (
      <>
        {positionedEvents.map((item) => {
          // Usar la función de posición exacta para mayor precisión
          const { top, height } = getEventPositionExact(
            item,
            timeRange.start,
            timeRange.end,
            HOUR_HEIGHT * zoomLevel
          );

          logger.debug(`Event position for ${item.id}`, {
            title: item.title,
            startHour: item.start.getHours(),
            startMinute: item.start.getMinutes(),
            endHour: item.end.getHours(),
            endMinute: item.end.getMinutes(),
            top,
            height,
            left: item.left,
            width: item.width,
            hourHeight: HOUR_HEIGHT * zoomLevel,
            rangeStart: timeRange.start,
            rangeEnd: timeRange.end,
            zoomLevel,
            refreshKey,
          });

          // Add a function to handle event drag with snap time
          const handleEventDragWithSnap = (
            event: CalendarEvent,
            minuteDiff: number,
            snapTime: Date
          ): boolean => {
            // Call the provided onEventDrag handler with the snap time
            if (onEventDrag) {
              return onEventDrag(event, minuteDiff, snapTime);
            }
            return true;
          };

          // Add a function to handle event drag end
          const handleEventDragEnd = () => {
            if (onDragEnd) {
              onDragEnd();
            }
          };

          return (
            <Event
              key={`${item.id}-${refreshKey}`}
              event={item}
              top={top}
              left={item.left}
              width={item.width}
              height={height}
              isResizing={isResizingEvent}
              setIsResizing={setIsResizingEvent}
              onEventDragWithSnap={handleEventDragWithSnap}
              onEventDragEnd={handleEventDragEnd}
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

    // Calculate total minutes from timeRange.start
    const totalMinutesFromRangeStart = (adjustedY / HOUR_HEIGHT) * 60;

    // Calculate total minutes from midnight
    const minutesFromMidnight =
      timeRange.start * 60 + totalMinutesFromRangeStart;

    // Snap to the nearest timeInterval
    const snappedMinutesFromMidnight =
      Math.round(minutesFromMidnight / timeInterval) * timeInterval;

    // Convert back to hours and minutes
    const hour = Math.floor(snappedMinutesFromMidnight / 60);
    const minutes = snappedMinutesFromMidnight % 60;

    logger.debug("Time conversion from y-coordinate", {
      y,
      adjustedY,
      totalMinutesFromRangeStart,
      minutesFromMidnight,
      snappedMinutesFromMidnight,
      hour,
      minutes,
      timeInterval,
    });

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

  // Función para resaltar la zona de destino durante el arrastre
  const highlightDropZone = (
    dayIndex: number,
    hour: number,
    minute: number
  ) => {
    if (isResizingEvent) {
      logger.debug("Resaltando zona de destino", {
        dayIndex,
        date: dates[dayIndex].toLocaleDateString(),
        hour,
        minute,
        fullTime: `${hour}:${minute.toString().padStart(2, "0")}`,
        isResizingEvent,
      });

      setDragTarget({ dayIndex, hour, minute });
    } else {
      setDragTarget(null);
    }
  };

  // Limpiar la zona de destino cuando se suelta el evento
  useEffect(() => {
    if (!isResizingEvent) {
      if (dragTarget) {
        logger.debug("Limpiando zona de destino", {
          previousTarget: dragTarget
            ? {
                dayIndex: dragTarget.dayIndex,
                date:
                  dates[dragTarget.dayIndex]?.toLocaleDateString() || "unknown",
                time: `${dragTarget.hour}:${dragTarget.minute
                  .toString()
                  .padStart(2, "0")}`,
              }
            : null,
        });
      }
      setDragTarget(null);
    }
  }, [isResizingEvent, dragTarget, dates]);

  // Render time labels (left column)
  const renderTimeLabels = () => (
    <View
      style={[
        styles.timeLabelsContainer,
        {
          width: TIME_LABEL_WIDTH,
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

  // Function to render the snap line indicator during drag
  const renderSnapLineIndicator = () => {
    if (!snapLineIndicator || !snapLineIndicator.visible) {
      return null;
    }

    // Calculate position based on the time
    const hours = snapLineIndicator.time.getHours();
    const minutes = snapLineIndicator.time.getMinutes();

    // Calculate position from time
    let position = 0;
    if (hours >= timeRange.start && hours <= timeRange.end) {
      position = (hours - timeRange.start) * HOUR_HEIGHT * zoomLevel;
      position += (minutes / 60) * HOUR_HEIGHT * zoomLevel;
    }

    return (
      <View
        style={[
          styles.snapLineIndicator,
          {
            top: position,
            borderColor: snapLineIndicator.color,
          },
        ]}
      />
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

              // Check if this slot is the current drag target
              const isCurrentDragTarget =
                dragTarget !== null &&
                dragTarget.dayIndex === dayIndex &&
                dragTarget.hour === hour &&
                dragTarget.minute === minute;

              if (isCurrentDragTarget) {
                logger.debug("Renderizando slot resaltado", {
                  dayIndex,
                  date: date.toLocaleDateString(),
                  hour,
                  minute,
                  isUnavailable,
                  top: slotTop,
                  height: slotHeight,
                });
              }

              return (
                <TouchableWithoutFeedback
                  key={`slot-${slotIndex}-day-${dayIndex}`}
                  onPress={() => handleTimeSlotPress(dayIndex, hour, minute)}
                  onPressIn={() => highlightDropZone(dayIndex, hour, minute)}
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
                      isCurrentDragTarget && {
                        backgroundColor:
                          theme.dragMovePreviewColor ||
                          "rgba(33, 150, 243, 0.15)",
                        borderWidth: 1,
                        borderColor: theme.primaryColor,
                        borderStyle: "dashed",
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

              {/* Snap line indicator */}
              {renderSnapLineIndicator()}
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
    width: 50, // Valor por defecto, se sobreescribirá dinámicamente
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
  snapLineIndicator: {
    position: "absolute",
    height: 2,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: "solid",
    zIndex: 20,
  },
});

export default TimeGrid;
