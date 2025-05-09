import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Platform,
} from "react-native";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  State,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { CalendarProvider, useCalendar } from "./CalendarContext";
import CalendarHeader from "./CalendarHeader";
import AllDayEvents from "./AllDayEvents";
import TimeGrid from "./TimeGrid";
import MonthView from "./MonthView";
import { useLogger } from "./utils/logger";
import {
  addDays,
  subtractDays,
  startOfWeek,
  addDays as addDaysUtil,
  timeToDate,
  getEventPosition,
} from "./utils";
import {
  CalendarEvent,
  CalendarViewType,
  TimeRange,
  CalendarTheme,
  UnavailableHours,
  HapticOptions,
} from "./types";

interface CalendarProps {
  events?: CalendarEvent[];
  initialViewType?: CalendarViewType;
  initialDate?: Date;
  timeRange?: TimeRange;
  theme?: Partial<CalendarTheme>;
  locale?: string;
  firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  visibleDays?: number[]; // Days to show (0 = Sunday, 1 = Monday, etc.)
  timeInterval?: number; // In minutes
  unavailableHours?: UnavailableHours;
  timezone?: string;
  hapticOptions?: Partial<HapticOptions>;
  initialZoomLevel?: number;
  initialDragEnabled?: boolean;
  onEventPress?: (event: CalendarEvent) => void;
  onTimeSlotPress?: (start: Date, end: Date) => void;
  onEventCreate?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onViewChange?: (viewType: CalendarViewType) => void;
  onDateChange?: (date: Date) => void;
  onZoomChange?: (zoomLevel: number) => void;
}

// Default theme
const defaultTheme: CalendarTheme = {
  backgroundColor: "#FFFFFF",
  calendarBackgroundColor: "#FFFFFF",
  textColor: "#333333",
  primaryColor: "#2196F3",
  secondaryColor: "#F5F5F5",
  todayIndicatorColor: "#2196F3",
  selectedDayColor: "#E3F2FD",
  eventColors: ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336"],
  hourIndicatorColor: "#FF5722",
  gridLineColor: "#E0E0E0",
  headerBackgroundColor: "#FFFFFF",
  unavailableHoursColor: "rgba(0, 0, 0, 0.05)",
  weekendColor: "#F5F5F5",
  eventTextColor: "#FFFFFF",
  dragCreateIndicatorColor: "rgba(33, 150, 243, 0.3)",
  dragMovePreviewColor: "rgba(33, 150, 243, 0.3)",
  overlapIndicatorColor: "rgba(33, 150, 243, 0.15)",
  connectionLineColor: "#2196F3", // Color para la línea de conexión
  successColor: "#4CAF50",
  errorColor: "#F44336",
  warningColor: "#FF9800",
};

const CalendarContent: React.FC = () => {
  // Initialize logger
  const logger = useLogger("Calendar");

  const {
    events,
    viewType,
    selectedDate,
    theme,
    timeRange,
    zoomLevel,
    isDragEnabled,
    unavailableHours,
    hapticOptions,
    onEventCreate,
    onEventUpdate,
    setViewType,
    setSelectedDate,
    setZoomLevel,
  } = useCalendar();

  // Refs para los gestos
  const pinchRef = useRef(null);
  const dragStartTime = useRef<Date | null>(null);
  const dragCurrentTime = useRef<Date | null>(null);

  // Navigate to previous period
  const handlePrevious = useCallback(() => {
    if (hapticOptions?.enabled && hapticOptions.viewChange) {
      triggerHapticFeedback(hapticOptions.viewChange);
    }

    // Get the new date
    let newDate;
    switch (viewType) {
      case "day":
        newDate = subtractDays(selectedDate, 1);
        break;
      case "3day":
        newDate = subtractDays(selectedDate, 3);
        break;
      case "week":
      case "workWeek":
        newDate = subtractDays(selectedDate, 7);
        break;
      case "month":
        const month = selectedDate.getMonth();
        newDate = new Date(selectedDate);
        newDate.setMonth(month - 1);
        break;
      default:
        newDate = subtractDays(selectedDate, 1);
    }

    logger.debug("Navigating to previous period", {
      viewType,
      previousDate: selectedDate,
      newDate,
    });

    setSelectedDate(newDate);
  }, [viewType, selectedDate, setSelectedDate, hapticOptions]);

  // Navigate to next period
  const handleNext = useCallback(() => {
    if (hapticOptions?.enabled && hapticOptions.viewChange) {
      triggerHapticFeedback(hapticOptions.viewChange);
    }

    // Get the new date
    let newDate;
    switch (viewType) {
      case "day":
        newDate = addDays(selectedDate, 1);
        break;
      case "3day":
        newDate = addDays(selectedDate, 3);
        break;
      case "week":
      case "workWeek":
        newDate = addDays(selectedDate, 7);
        break;
      case "month":
        const month = selectedDate.getMonth();
        newDate = new Date(selectedDate);
        newDate.setMonth(month + 1);
        break;
      default:
        newDate = addDays(selectedDate, 1);
    }

    logger.debug("Navigating to next period", {
      viewType,
      previousDate: selectedDate,
      newDate,
    });

    setSelectedDate(newDate);
  }, [viewType, selectedDate, setSelectedDate, hapticOptions]);

  // Navigate to today
  const handleToday = useCallback(() => {
    if (hapticOptions?.enabled && hapticOptions.viewChange) {
      triggerHapticFeedback(hapticOptions.viewChange);
    }

    logger.debug("Navigating to today");
    setSelectedDate(new Date());
  }, [setSelectedDate, hapticOptions]);

  // Change view type
  const handleViewTypeChange = useCallback(
    (newViewType: CalendarViewType) => {
      if (hapticOptions?.enabled && hapticOptions.viewChange) {
        triggerHapticFeedback(hapticOptions.viewChange);
      }

      logger.debug("Changing view type", {
        previousViewType: viewType,
        newViewType,
      });

      setViewType(newViewType);
    },
    [setViewType, hapticOptions, viewType]
  );

  // Manejo del gesto de pinch para zoom
  const onPinchGestureEvent = useCallback(
    (event: PinchGestureHandlerGestureEvent) => {
      // Ajusta el nivel de zoom basado en la escala del gesto
      const newZoomLevel = Math.max(
        0.5,
        Math.min(2, zoomLevel * event.nativeEvent.scale)
      );

      logger.debug("Pinch gesture zoom", {
        scale: event.nativeEvent.scale,
        previousZoom: zoomLevel,
        newZoom: newZoomLevel,
      });

      setZoomLevel(newZoomLevel);
    },
    [zoomLevel, setZoomLevel]
  );

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback(
    (intensity: "light" | "medium" | "heavy") => {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        switch (intensity) {
          case "light":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case "medium":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case "heavy":
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      }
    },
    []
  );

  // Handle drag create event
  const handleDragCreateEvent = useCallback(
    (start: Date, end: Date) => {
      if (!onEventCreate) return;

      logger.debug("Creating event via drag", { start, end });

      // Minimum duration of 30 minutes
      if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
        end = new Date(start.getTime() + 30 * 60 * 1000);
      }

      // Create the event
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        title: "New Event",
        start,
        end,
        color:
          theme.eventColors[
            Math.floor(Math.random() * theme.eventColors.length)
          ],
      };

      // Call the handler
      onEventCreate(newEvent);
    },
    [onEventCreate, theme]
  );

  // Configurar los handlers de drag
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDragEnabled,
    onMoveShouldSetPanResponder: () => isDragEnabled,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      // Guardar la hora de inicio del drag
      const { locationX, locationY } = e.nativeEvent;
      // Aquí se necesitaría convertir la posición a fecha y recurso
      // Esta lógica dependería de la implementación específica de la grilla
      dragStartTime.current = new Date(); // Ejemplo, reemplazar con lógica real
      dragCurrentTime.current = new Date(); // Inicializa con el mismo valor
    },
    onPanResponderMove: (
      e: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      // Actualizar tiempo actual durante el drag
      // Ajustar dragCurrentTime.current según el movimiento
    },
    onPanResponderRelease: () => {
      // Finalizar creación del evento
      if (dragStartTime.current && dragCurrentTime.current) {
        // Ordenar las fechas para que start sea siempre anterior a end
        const start = new Date(
          Math.min(
            dragStartTime.current.getTime(),
            dragCurrentTime.current.getTime()
          )
        );
        const end = new Date(
          Math.max(
            dragStartTime.current.getTime(),
            dragCurrentTime.current.getTime()
          )
        );

        // Crear el evento
        handleDragCreateEvent(start, end);

        // Limpiar refs
        dragStartTime.current = null;
        dragCurrentTime.current = null;
      }
    },
  });

  // Handle dragging events
  const handleEventDrag = useCallback(
    (event: CalendarEvent, minuteDiff: number): boolean => {
      // Calcular nuevas fechas
      const newStart = new Date(event.start);
      newStart.setMinutes(newStart.getMinutes() + minuteDiff);

      const newEnd = new Date(event.end);
      newEnd.setMinutes(newEnd.getMinutes() + minuteDiff);

      logger.debug("Validando arrastre de evento", {
        eventId: event.id,
        eventTitle: event.title,
        originalStart: event.start.toLocaleTimeString(),
        newStart: newStart.toLocaleTimeString(),
        minuteDiff,
        hasUnavailableHours: !!unavailableHours,
      });

      // Verificar si el destino es válido
      if (unavailableHours) {
        // Obtener día de la semana
        const dayOfWeek = newStart.getDay();

        // Verificar si este día está incluido en días no disponibles
        const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6];
        if (daysToCheck.includes(dayOfWeek)) {
          // Verificar si la hora cae dentro de algún rango no disponible
          const timeValue = newStart.getHours() + newStart.getMinutes() / 60;

          logger.debug("Verificando restricciones horarias", {
            eventId: event.id,
            dayOfWeek,
            timeValue,
            day: [
              "Domingo",
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
            ][dayOfWeek],
            unavailableRanges: unavailableHours.ranges,
          });

          const isUnavailable = unavailableHours.ranges.some(
            (range) => timeValue >= range.start && timeValue < range.end
          );

          if (isUnavailable) {
            logger.debug("Arrastre bloqueado por horario no disponible", {
              eventId: event.id,
              dayOfWeek,
              timeValue,
              day: [
                "Domingo",
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ][dayOfWeek],
              newStart: newStart.toLocaleTimeString(),
              minuteDiff,
            });
            return false; // No permitir arrastrar a esta zona
          }
        }
      }

      logger.debug("Arrastre de evento permitido", {
        eventId: event.id,
        newStart: newStart.toLocaleTimeString(),
        newEnd: newEnd.toLocaleTimeString(),
        minuteDiff,
      });

      return true; // Permitir arrastrar
    },
    [unavailableHours]
  );

  const renderContent = () => {
    switch (viewType) {
      case "day":
      case "3day":
      case "week":
      case "workWeek":
        return (
          <>
            <AllDayEvents />
            <TimeGrid
              viewType={viewType}
              panHandlers={isDragEnabled ? panResponder.panHandlers : undefined}
              onEventDrag={handleEventDrag}
            />
          </>
        );
      case "month":
        return <MonthView />;
      default:
        return (
          <TimeGrid
            viewType={viewType}
            panHandlers={isDragEnabled ? panResponder.panHandlers : undefined}
            onEventDrag={handleEventDrag}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <CalendarHeader
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewTypeChange={handleViewTypeChange}
      />

      <PinchGestureHandler ref={pinchRef} onGestureEvent={onPinchGestureEvent}>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </PinchGestureHandler>
    </View>
  );
};

const Calendar: React.FC<CalendarProps> = ({
  events = [],
  initialViewType = "week",
  initialDate = new Date(),
  timeRange = { start: 8, end: 20 }, // 8 AM to 8 PM
  theme = {},
  locale = "en-US",
  firstDayOfWeek = 0, // Sunday
  visibleDays = [0, 1, 2, 3, 4, 5, 6], // All days
  timeInterval = 30, // 30 minutes
  unavailableHours,
  timezone,
  hapticOptions,
  initialZoomLevel = 1,
  initialDragEnabled = true,
  onEventPress,
  onTimeSlotPress,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onViewChange,
  onDateChange,
  onZoomChange,
}) => {
  // Track the view type and selected date internally to provide callback handlers
  const [viewType, setViewType] = useState<CalendarViewType>(initialViewType);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  // Handle view type change
  const handleViewTypeChange = useCallback(
    (newViewType: CalendarViewType) => {
      setViewType(newViewType);
      onViewChange?.(newViewType);
    },
    [onViewChange]
  );

  // Handle date change
  const handleDateChange = useCallback(
    (newDate: Date) => {
      setSelectedDate(newDate);
      onDateChange?.(newDate);
    },
    [onDateChange]
  );

  // Handle zoom change
  const handleZoomChange = useCallback(
    (level: number) => {
      onZoomChange?.(level);
    },
    [onZoomChange]
  );

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <CalendarProvider
        initialEvents={events}
        initialViewType={viewType}
        initialSelectedDate={selectedDate}
        initialTimeRange={timeRange}
        theme={theme}
        locale={locale}
        firstDayOfWeek={firstDayOfWeek}
        visibleDays={visibleDays}
        timeInterval={timeInterval}
        unavailableHours={unavailableHours}
        timezone={timezone}
        hapticOptions={hapticOptions}
        initialZoomLevel={initialZoomLevel}
        initialDragEnabled={initialDragEnabled}
        onEventPress={onEventPress}
        onTimeSlotPress={onTimeSlotPress}
        onEventCreate={onEventCreate}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
        onZoomChange={handleZoomChange}
        setViewType={handleViewTypeChange}
        setSelectedDate={handleDateChange}
      >
        <CalendarContent />
      </CalendarProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    flex: 1,
  },
});

export default Calendar;
