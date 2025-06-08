import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Platform,
} from 'react-native';
import { throttle } from 'lodash';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CalendarProvider, useCalendar } from './CalendarContext';
import CalendarHeader from './CalendarHeader';
import TimeGrid from './TimeGrid';
import MonthView from './MonthView';
import { useLogger } from './utils/logger';
import {
  addDays,
  subtractDays,
  startOfWeek,
  addDays as addDaysUtil,
  timeToDate,
  getEventPosition,
} from './utils';
import {
  CalendarEvent,
  CalendarViewType,
  TimeRange,
  CalendarTheme,
  UnavailableHours,
  HapticOptions,
  CalendarConfig,
  SnapLineIndicator,
} from './types';
import { useLayoutConfig } from './config';
import TimeChangeConfirmationModal from './TimeChangeConfirmationModal';

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
  calendarConfig?: Partial<CalendarConfig>;
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
  backgroundColor: '#FFFFFF',
  calendarBackgroundColor: '#FFFFFF',
  textColor: '#333333',
  primaryColor: '#2196F3',
  secondaryColor: '#F5F5F5',
  todayIndicatorColor: '#2196F3',
  selectedDayColor: '#E3F2FD',
  eventColors: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'],
  hourIndicatorColor: '#FF5722',
  gridLineColor: '#E0E0E0',
  headerBackgroundColor: '#FFFFFF',
  unavailableHoursColor: 'rgba(0, 0, 0, 0.05)',
  weekendColor: '#F5F5F5',
  eventTextColor: '#FFFFFF',
  dragCreateIndicatorColor: 'rgba(33, 150, 243, 0.3)',
  dragMovePreviewColor: 'rgba(33, 150, 243, 0.3)',
  overlapIndicatorColor: 'rgba(33, 150, 243, 0.15)',
  connectionLineColor: '#2196F3', // Color para la línea de conexión
  successColor: '#4CAF50',
  errorColor: '#F44336',
  warningColor: '#FF9800',
};

const CalendarContent: React.FC = () => {
  // Initialize logger
  const logger = useLogger('Calendar');

  // Get layout config for height constants
  const { layoutConfig } = useLayoutConfig();
  const HOUR_HEIGHT = layoutConfig.HOUR_HEIGHT;

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
    timeInterval,
  } = useCalendar();

  // Refs para los gestos (pinchRef ya no es necesario con el nuevo Gesture API)
  const dragStartTime = useRef<Date | null>(null);
  const dragCurrentTime = useRef<Date | null>(null);

  // State for snap line indicator
  const [snapLineIndicator, setSnapLineIndicator] = useState<SnapLineIndicator | null>(null);

  // Navigate to previous period
  const handlePrevious = useCallback(() => {
    if (hapticOptions?.enabled && hapticOptions.viewChange) {
      triggerHapticFeedback(hapticOptions.viewChange);
    }

    // Get the new date
    let newDate;
    switch (viewType) {
      case 'day':
        newDate = subtractDays(selectedDate, 1);
        break;
      case '3day':
        newDate = subtractDays(selectedDate, 3);
        break;
      case 'week':
      case 'workWeek':
        newDate = subtractDays(selectedDate, 7);
        break;
      case 'month':
        const month = selectedDate.getMonth();
        newDate = new Date(selectedDate);
        newDate.setMonth(month - 1);
        break;
      default:
        newDate = subtractDays(selectedDate, 1);
    }

    logger.debug('Navigating to previous period', {
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
      case 'day':
        newDate = addDays(selectedDate, 1);
        break;
      case '3day':
        newDate = addDays(selectedDate, 3);
        break;
      case 'week':
      case 'workWeek':
        newDate = addDays(selectedDate, 7);
        break;
      case 'month':
        const month = selectedDate.getMonth();
        newDate = new Date(selectedDate);
        newDate.setMonth(month + 1);
        break;
      default:
        newDate = addDays(selectedDate, 1);
    }

    logger.debug('Navigating to next period', {
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

    logger.debug('Navigating to today');
    setSelectedDate(new Date());
  }, [setSelectedDate, hapticOptions]);

  // Change view type
  const handleViewTypeChange = useCallback(
    (newViewType: CalendarViewType) => {
      if (hapticOptions?.enabled && hapticOptions.viewChange) {
        triggerHapticFeedback(hapticOptions.viewChange);
      }

      logger.debug('Changing view type', {
        previousViewType: viewType,
        newViewType,
      });

      setViewType(newViewType);
    },
    [setViewType, hapticOptions, viewType]
  );

  // Manejo del gesto de pinch para zoom usando el nuevo Gesture API
  const pinchGesture = Gesture.Pinch().onUpdate(event => {
    // Ajusta el nivel de zoom basado en la escala del gesto
    const newZoomLevel = Math.max(0.5, Math.min(2, zoomLevel * event.scale));

    logger.debug('Pinch gesture zoom', {
      scale: event.scale,
      previousZoom: zoomLevel,
      newZoom: newZoomLevel,
    });

    setZoomLevel(newZoomLevel);
  });

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      switch (intensity) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  }, []);

  // Handle drag create event
  const handleDragCreateEvent = useCallback(
    (start: Date, end: Date) => {
      if (!onEventCreate) return;

      logger.debug('Creating event via drag', { start, end });

      // Minimum duration of 30 minutes
      if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
        end = new Date(start.getTime() + 30 * 60 * 1000);
      }

      // Create the event
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        title: 'New Event',
        start,
        end,
        color: theme.eventColors[Math.floor(Math.random() * theme.eventColors.length)],
      };

      // Call the handler
      onEventCreate(newEvent);
    },
    [onEventCreate, theme]
  );

  // Refs para el control de auto-scroll
  const isAutoScrolling = useRef(false);
  const lastAutoScrollTimestamp = useRef(0);
  const AUTO_SCROLL_COOLDOWN = 300; // ms para evitar bucles de auto-scroll

  // Configurar los handlers de drag usando gestión de estado mejorada
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDragEnabled,
    onMoveShouldSetPanResponder: () => isDragEnabled,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      // Guardar la hora de inicio del drag
      const { locationX, locationY } = e.nativeEvent;

      // Calcular la hora real basada en la posición Y
      const hourHeight = HOUR_HEIGHT * zoomLevel;
      const minutesPerPixel = 60 / hourHeight;
      const timeOffset = locationY * minutesPerPixel;

      // Crear fecha base desde las horas de inicio configuradas
      const baseDate = new Date();
      baseDate.setHours(timeRange.start, 0, 0, 0);

      // Agregar el offset de tiempo calculado
      const startTime = new Date(baseDate.getTime() + timeOffset * 60 * 1000);

      // Almacenar en refs
      dragStartTime.current = startTime;
      dragCurrentTime.current = startTime;

      // Reiniciar estado de auto-scroll
      isAutoScrolling.current = false;

      logger.debug('Drag started', {
        location: { x: locationX, y: locationY },
        startTime: startTime.toLocaleTimeString(),
        zoomLevel,
        hourHeight,
      });
    },
    onPanResponderMove: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      // Actualizar tiempo actual durante el drag
      if (!dragStartTime.current) return;

      // Calculate minutes per pixel considering zoom level
      const hourHeight = HOUR_HEIGHT * zoomLevel;
      const minutesPerPixel = 60 / hourHeight;

      // Get raw minute difference from drag
      const rawMinuteDiff = gestureState.dy * minutesPerPixel;

      // Get original time in minutes from midnight
      const startTimeMinutes =
        dragStartTime.current.getHours() * 60 + dragStartTime.current.getMinutes();

      // Calculate new time in minutes from midnight
      const newTimeMinutes = startTimeMinutes + rawMinuteDiff;

      // Snap to nearest interval grid point
      const snappedTimeMinutes = Math.round(newTimeMinutes / timeInterval) * timeInterval;

      // Create a date object for the snap position
      const snapTime = new Date(dragStartTime.current);
      snapTime.setHours(Math.floor(snappedTimeMinutes / 60), snappedTimeMinutes % 60, 0, 0);

      // Update current time only if it has changed to prevenir re-renders innecesarios
      if (!dragCurrentTime.current || dragCurrentTime.current.getTime() !== snapTime.getTime()) {
        dragCurrentTime.current = snapTime;

        // Update the snap line indicator
        setSnapLineIndicator({
          time: snapTime,
          visible: true,
          color: theme.successColor || '#4CAF50',
        });

        // Evitar iniciar auto-scroll si uno acaba de terminar (previene bucles)
        const now = Date.now();
        if (now - lastAutoScrollTimestamp.current < AUTO_SCROLL_COOLDOWN) {
          isAutoScrolling.current = true;
          logger.debug('Auto-scroll prevented during cooldown', {
            lastScroll: lastAutoScrollTimestamp.current,
            now,
            diff: now - lastAutoScrollTimestamp.current,
          });
        }
      }
    },
    onPanResponderRelease: () => {
      // Finalizar creación del evento
      if (dragStartTime.current && dragCurrentTime.current) {
        // Ordenar las fechas para que start sea siempre anterior a end
        const start = new Date(
          Math.min(dragStartTime.current.getTime(), dragCurrentTime.current.getTime())
        );
        const end = new Date(
          Math.max(dragStartTime.current.getTime(), dragCurrentTime.current.getTime())
        );

        // Validar que existe una duración mínima
        if (end.getTime() - start.getTime() > 60000) {
          // Al menos 1 minuto
          // Crear el evento
          handleDragCreateEvent(start, end);
        } else {
          logger.debug('Drag cancelled - too short duration', {
            start: start.toLocaleTimeString(),
            end: end.toLocaleTimeString(),
            duration: (end.getTime() - start.getTime()) / 60000 + ' minutes',
          });
        }

        // Limpiar refs
        dragStartTime.current = null;
        dragCurrentTime.current = null;

        // Registrar fin de auto-scroll
        lastAutoScrollTimestamp.current = Date.now();
        isAutoScrolling.current = false;

        // Hide the snap line
        setSnapLineIndicator(null);

        // Call onDragEnd callback
        handleDragEnd();
      }
    },
    // Mejorar el manejo de cancelación
    onPanResponderTerminate: () => {
      // Limpiar refs
      dragStartTime.current = null;
      dragCurrentTime.current = null;

      // Registrar fin de auto-scroll
      lastAutoScrollTimestamp.current = Date.now();
      isAutoScrolling.current = false;

      // Hide the snap line
      setSnapLineIndicator(null);

      // Call onDragEnd callback
      handleDragEnd();

      logger.debug('Drag terminated');
    },
  });

  // Throttled snap line update para reducir re-renders
  const throttledSnapLineUpdate = useCallback(
    throttle((snapTime: Date, color: string) => {
      setSnapLineIndicator({
        time: snapTime,
        visible: true,
        color: color,
      });
    }, 50), // Throttle a 50ms para mantener buena UI sin excesivos re-renders
    []
  );

  // Handle dragging events with performance optimizations
  const handleEventDrag = useCallback(
    (event: CalendarEvent, minuteDiff: number, snapTime?: Date): boolean => {
      // Evitar procesamiento si estamos en periodo de cooldown de auto-scroll
      if (isAutoScrolling.current) {
        return false;
      }

      // Calcular nuevas fechas de manera más eficiente
      const newStart = new Date(event.start.getTime() + minuteDiff * 60000);
      const newEnd = new Date(event.end.getTime() + minuteDiff * 60000);

      // Verificación rápida de rango válido de tiempo
      const startHour = newStart.getHours() + newStart.getMinutes() / 60;
      if (startHour < timeRange.start || startHour > timeRange.end - 0.25) {
        return false; // Fuera del rango visible
      }

      // Update snap line indicator if a snap time is provided - usando throttling
      if (snapTime) {
        throttledSnapLineUpdate(snapTime, theme.successColor || '#4CAF50');
      }

      // Verificar si el destino es válido con optimizaciones
      if (unavailableHours) {
        // Obtener día de la semana
        const dayOfWeek = newStart.getDay();

        // Verificar si este día está incluido en días no disponibles
        const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6];
        if (daysToCheck.includes(dayOfWeek)) {
          // Verificar si la hora cae dentro de algún rango no disponible
          const timeValue = startHour; // Ya calculado antes

          // Verificación rápida usando caché o verificación optimizada
          const isUnavailable = unavailableHours.ranges.some(
            range => timeValue >= range.start && timeValue < range.end
          );

          if (isUnavailable) {
            return false; // No permitir arrastrar a esta zona
          }
        }
      }

      return true; // Permitir arrastrar
    },
    [unavailableHours, theme.successColor, timeRange, throttledSnapLineUpdate]
  );

  // Function to handle the end of drag events
  const handleDragEnd = useCallback(() => {
    // Registrar fin de auto-scroll
    lastAutoScrollTimestamp.current = Date.now();
    isAutoScrolling.current = false;

    // Hide the snap line when drag ends
    setSnapLineIndicator(null);

    logger.debug('Drag end handler called', {
      timestamp: new Date().toISOString(),
    });
  }, []);

  const renderContent = () => {
    switch (viewType) {
      case 'day':
      case '3day':
      case 'week':
      case 'workWeek':
        return (
          <TimeGrid
            viewType={viewType}
            panHandlers={isDragEnabled ? panResponder.panHandlers : undefined}
            onEventDrag={handleEventDrag}
            onDragEnd={handleDragEnd}
            snapLineIndicator={snapLineIndicator}
            timeInterval={timeInterval}
          />
        );
      case 'month':
        return <MonthView />;
      default:
        return (
          <TimeGrid
            viewType={viewType}
            panHandlers={isDragEnabled ? panResponder.panHandlers : undefined}
            onEventDrag={handleEventDrag}
            onDragEnd={handleDragEnd}
            snapLineIndicator={snapLineIndicator}
            timeInterval={timeInterval}
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

      <GestureDetector gesture={pinchGesture}>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </GestureDetector>

      {/* Time change confirmation modal */}
      <TimeChangeConfirmationModal />
    </View>
  );
};

const Calendar: React.FC<CalendarProps> = ({
  events = [],
  initialViewType = 'week',
  initialDate = new Date(),
  timeRange = { start: 8, end: 20 }, // 8 AM to 8 PM
  theme = {},
  locale = 'en-US',
  firstDayOfWeek = 0, // Sunday
  visibleDays = [0, 1, 2, 3, 4, 5, 6], // All days
  timeInterval = 30, // 30 minutes
  unavailableHours,
  timezone,
  hapticOptions,
  calendarConfig,
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
        calendarConfig={calendarConfig}
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
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
});

export default Calendar;
