import { useState, useRef, useCallback } from 'react';
import {
  Animated,
  PanResponderInstance,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useCalendar } from '../CalendarContext';
import { CalendarEvent } from '../types';
import { useLogger } from '../utils/logger';

interface DragAndDropOptions {
  event: CalendarEvent;
  top: number;
  left: number;
  width: number;
  height: number;
  timeInterval: number;
  hourHeight: number;
  setIsResizing: (isResizing: boolean) => void;
  onEventDragWithSnap?: (event: CalendarEvent, minuteDiff: number, snapTime: Date) => boolean;
  onEventDragEnd?: () => void;
  onDragNearEdge?: (distanceFromEdge: number, direction: 'up' | 'down') => void;
  viewHeight?: number;
  scrollPosition: { x: number; y: number };
  columnWidth?: number;
  dayIndex?: number;
  dates?: Date[];
  viewType: string;
}

interface DragAndDropResult {
  panResponder: PanResponderInstance;
  translateY: Animated.Value;
  translateX: Animated.Value;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  isTargetUnavailable: boolean;
  previewPosition: number | null;
  horizontalPreviewPosition: number | null;
  clearPreviewElements: () => void;
  calculatePreviewPosition: (dy: number, minuteDiff: number) => number;
  getHorizontalPreviewPosition: (dayDiff: number) => number | null;
}

/**
 * Hook personalizado para gestionar el drag and drop de eventos de calendario
 */
export const useDragAndDrop = ({
  event,
  top,
  left,
  width,
  height,
  timeInterval,
  hourHeight,
  setIsResizing,
  onEventDragWithSnap,
  onEventDragEnd,
  onDragNearEdge,
  viewHeight,
  scrollPosition,
  columnWidth,
  dayIndex,
  dates,
  viewType,
}: DragAndDropOptions): DragAndDropResult => {
  const logger = useLogger('DragAndDrop');
  const { hapticOptions, timeRange, unavailableHours, onEventUpdate, showTimeChangeConfirmation } =
    useCalendar();

  // Estados para preview y disponibilidad
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isTargetUnavailable, setIsTargetUnavailable] = useState(false);
  const [horizontalPreviewPosition, setHorizontalPreviewPosition] = useState<number | null>(null);

  // Referencias para control de arrastre
  const longPressTimeout = useRef<number | null>(null);
  const longPressActive = useRef<boolean>(false);
  const longPressStartPosition = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef<boolean>(false);

  // Valores animados
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Función para limpiar elementos de vista previa
  const clearPreviewElements = useCallback(() => {
    setPreviewPosition(null);
    setHorizontalPreviewPosition(null);
    setIsTargetUnavailable(false);
  }, []);

  // Verificar si la hora de destino está en un rango no disponible
  const isTimeSlotUnavailable = useCallback(
    (date: Date): boolean => {
      if (!unavailableHours) return false;

      const dayOfWeek = date.getDay();
      const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6];
      if (!daysToCheck.includes(dayOfWeek)) return false;

      const timeValue = date.getHours() + date.getMinutes() / 60;
      return unavailableHours.ranges.some(
        range => timeValue >= range.start && timeValue < range.end
      );
    },
    [unavailableHours]
  );

  // Calcular diferencia de días basado en movimiento horizontal
  const calculateDayDiff = useCallback(
    (dx: number): number => {
      if (!columnWidth || typeof dayIndex !== 'number' || !dates || viewType === 'day') {
        return 0;
      }

      const columnsMoved = Math.round(dx / columnWidth);
      const newDayIndex = Math.max(0, Math.min(dates.length - 1, dayIndex + columnsMoved));
      return newDayIndex - dayIndex;
    },
    [columnWidth, dayIndex, dates, viewType]
  );

  // Obtener posición de vista previa horizontal
  const getHorizontalPreviewPosition = useCallback(
    (dayDiff: number): number | null => {
      if (dayDiff === 0 || !columnWidth) return null;
      return columnWidth * dayDiff;
    },
    [columnWidth]
  );

  // Calcular posición de vista previa vertical
  const calculatePreviewPosition = useCallback(
    (dy: number, roundedMinuteDiff: number): number => {
      // Verificar disponibilidad
      const newStart = new Date(event.start);
      newStart.setMinutes(newStart.getMinutes() + roundedMinuteDiff);

      // Mantener mismo día, solo cambiar hora
      newStart.setFullYear(event.start.getFullYear());
      newStart.setMonth(event.start.getMonth());
      newStart.setDate(event.start.getDate());

      const unavailable = isTimeSlotUnavailable(newStart);
      setIsTargetUnavailable(unavailable);

      // Posición directa
      const directPosition = top + dy;

      // Limitar a rango visible
      const maxHours = (timeRange?.end || 24) - (timeRange?.start || 0);
      const maxPosition = maxHours * hourHeight;

      return Math.max(0, Math.min(directPosition, maxPosition));
    },
    [event.start, hourHeight, isTimeSlotUnavailable, timeRange, top]
  );

  // Validar si el arrastre es permitido
  const validateEventDrag = useCallback(
    (event: CalendarEvent, minuteDiff: number, snapTime: Date): boolean => {
      if (!onEventDragWithSnap) {
        return true;
      }

      return onEventDragWithSnap(event, minuteDiff, snapTime);
    },
    [onEventDragWithSnap]
  );

  // Configurar el pan responder para el arrastre
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (longPressActive.current) return true;
        if (isDragging.current) return false;
        return false;
      },
      onPanResponderGrant: (e, gestureState) => {
        // Evitar múltiples inicios de arrastre
        if (longPressActive.current || isDragging.current) return;

        // Limpiar timeout previo si existe
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }

        // Guardar posición inicial para detectar movimientos
        longPressStartPosition.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        };

        // Iniciar longpress después de 200ms
        longPressTimeout.current = setTimeout(() => {
          // Validar el evento
          if (!event || !event.id) return;

          // Activar modo arrastre
          longPressActive.current = true;
          isDragging.current = true;
          setIsResizing(true);

          clearPreviewElements();

          // Animar para feedback visual
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 150,
            useNativeDriver: true,
          }).start();

          // Aplicar feedback háptico si está habilitado
          if (hapticOptions?.enabled && hapticOptions.eventMove) {
            try {
              require('expo-haptics').impactAsync(
                hapticOptions.eventMove === 'light'
                  ? require('expo-haptics').ImpactFeedbackStyle.Light
                  : hapticOptions.eventMove === 'medium'
                    ? require('expo-haptics').ImpactFeedbackStyle.Medium
                    : require('expo-haptics').ImpactFeedbackStyle.Heavy
              );
            } catch (e) {}
          }
        }, 200) as unknown as number;
      },
      onPanResponderMove: handleMove,
      onPanResponderRelease: handleRelease,
      onPanResponderTerminate: () => {
        // Limpiar timeout si existe
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }

        // Resetear estados y animaciones
        translateY.setValue(0);
        translateX.setValue(0);
        longPressActive.current = false;
        isDragging.current = false;
        setIsResizing(false);
        clearPreviewElements();

        // Detener auto-scroll
        if (onEventDragEnd) {
          onEventDragEnd();
        }
      },
    })
  ).current;

  // Manejar el movimiento durante el arrastre
  function handleMove(e: GestureResponderEvent, gestureState: PanResponderGestureState) {
    // Cancelar longpress si hay movimiento significativo antes de que se active
    if (!longPressActive.current && longPressStartPosition.current) {
      const dx = Math.abs(gestureState.moveX - longPressStartPosition.current.x);
      const dy = Math.abs(gestureState.moveY - longPressStartPosition.current.y);

      if (dx > 10 || dy > 10) {
        if (longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
        }
        return;
      }
    }

    // Solo procesar si estamos en modo arrastre
    if (!longPressActive.current) return;

    // Actualizar posición visual
    translateY.setValue(gestureState.dy);
    if (viewType !== 'day' && columnWidth && typeof dayIndex === 'number' && dates) {
      translateX.setValue(gestureState.dx);
    }

    // Verificar si estamos cerca de los bordes para auto-scroll
    if (viewHeight && onDragNearEdge) {
      const currentPositionY = top + gestureState.dy;
      const absolutePositionY = currentPositionY + scrollPosition.y;

      const topQuarter = viewHeight * 0.25;
      const bottomQuarter = viewHeight * 0.75;

      if (absolutePositionY < topQuarter) {
        const effectiveDistance = Math.max(1, absolutePositionY);
        onDragNearEdge(effectiveDistance, 'up');
      } else if (absolutePositionY > bottomQuarter) {
        const effectiveDistance = Math.max(1, viewHeight - (absolutePositionY + height));
        onDragNearEdge(effectiveDistance, 'down');
      } else if (onEventDragEnd) {
        onEventDragEnd(); // Detener auto-scroll en zona central
      }
    }

    // Cálculos para mostrar la vista previa
    try {
      if (!event || !event.start || !event.end) return;

      // Convertir píxeles a minutos
      const pixelsPerMinute = hourHeight / 60;
      const exactMinuteDiff = gestureState.dy / pixelsPerMinute;

      // Minutos desde medianoche para el evento original
      const originalMinutesFromMidnight = event.start.getHours() * 60 + event.start.getMinutes();

      // Calcular nuevos minutos totales
      const newMinutesFromMidnight = originalMinutesFromMidnight + exactMinuteDiff;

      // Ajustar a la rejilla de timeInterval
      const snappedMinutesFromMidnight =
        Math.round(newMinutesFromMidnight / timeInterval) * timeInterval;

      // Calcular la diferencia final que mantiene la rejilla
      const minuteDiff = snappedMinutesFromMidnight - originalMinutesFromMidnight;

      // Calcular diferencia de día por movimiento horizontal
      const dayDiff = calculateDayDiff(gestureState.dx);

      // Crear fecha para tiempo de ajuste
      const snapTime = new Date(event.start);

      // Aplicar diferencia de día si existe
      if (dayDiff !== 0) {
        snapTime.setDate(snapTime.getDate() + dayDiff);
      }

      // Configurar hora ajustada
      snapTime.setHours(
        Math.floor(snappedMinutesFromMidnight / 60),
        snappedMinutesFromMidnight % 60,
        0,
        0
      );

      // Umbral para cuando mostrar vistas previas
      const VERTICAL_MOVEMENT_THRESHOLD = 5;
      const HORIZONTAL_MOVEMENT_THRESHOLD = 10;
      const shouldShowVerticalPreview = Math.abs(gestureState.dy) > VERTICAL_MOVEMENT_THRESHOLD;
      const shouldShowHorizontalPreview = Math.abs(gestureState.dx) > HORIZONTAL_MOVEMENT_THRESHOLD;

      if (shouldShowVerticalPreview || shouldShowHorizontalPreview) {
        // Calcular posición de vista previa vertical
        let newPreviewPosition = null;
        if (shouldShowVerticalPreview) {
          newPreviewPosition = calculatePreviewPosition(gestureState.dy, minuteDiff);
        }

        // Calcular posición de vista previa horizontal
        let newHorizontalPosition = null;
        if (shouldShowHorizontalPreview && viewType !== 'day' && dayDiff !== 0) {
          newHorizontalPosition = getHorizontalPreviewPosition(dayDiff);
        }

        // Verificar si el destino es válido
        if (onEventDragWithSnap) {
          const isValid = validateEventDrag(event, minuteDiff, snapTime);
          setIsTargetUnavailable(!isValid);
        }

        // Actualizar posiciones de vista previa
        setPreviewPosition(newPreviewPosition);
        setHorizontalPreviewPosition(newHorizontalPosition);
      } else {
        clearPreviewElements();
      }
    } catch (error) {
      clearPreviewElements();
    }
  }

  // Manejar el final del arrastre
  function handleRelease(e: GestureResponderEvent, gestureState: PanResponderGestureState) {
    // Limpiar timeout de longpress
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    // Solo procesar si estamos en modo arrastre
    if (!longPressActive.current) return;

    // Limpiar vistas previas
    clearPreviewElements();

    // Restaurar animaciones
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Detener auto-scroll
    if (onEventDragEnd) {
      onEventDragEnd();
    }

    // Verificar si hubo movimiento suficiente
    const MOVEMENT_THRESHOLD = 5;
    const hasMovedEnough =
      Math.abs(gestureState.dx) > MOVEMENT_THRESHOLD ||
      Math.abs(gestureState.dy) > MOVEMENT_THRESHOLD;

    if (hasMovedEnough && isDragging.current) {
      try {
        // Verificar requisitos para la nueva posición
        if (!event || !event.start || !event.end) {
          throw new Error('Evento inválido');
        }

        // Calcular la diferencia de tiempo en minutos
        const pixelsPerMinute = hourHeight / 60;
        const exactMinuteDiff = gestureState.dy / pixelsPerMinute;

        // Calcular los minutos desde medianoche
        const originalMinutesFromMidnight = event.start.getHours() * 60 + event.start.getMinutes();

        // Calcular los nuevos minutos totales
        const newMinutesFromMidnight = originalMinutesFromMidnight + exactMinuteDiff;

        // Ajustar a la rejilla de timeInterval
        const snappedMinutesFromMidnight =
          Math.round(newMinutesFromMidnight / timeInterval) * timeInterval;

        // Calcular la diferencia de minutos ajustada
        const minuteDiff = snappedMinutesFromMidnight - originalMinutesFromMidnight;

        // Calcular diferencia de día
        const dayDiff = calculateDayDiff(gestureState.dx);

        // Si hay cambio real (minutos o días)
        if (minuteDiff !== 0 || dayDiff !== 0) {
          // Crear nuevas fechas de inicio y fin
          const newStart = new Date(event.start);
          const newEnd = new Date(event.end);

          // Aplicar cambio de día si existe
          if (dayDiff !== 0) {
            newStart.setDate(newStart.getDate() + dayDiff);
            newEnd.setDate(newEnd.getDate() + dayDiff);
          }

          // Aplicar cambio de tiempo si existe
          if (minuteDiff !== 0) {
            newStart.setMinutes(newStart.getMinutes() + minuteDiff);
            newEnd.setMinutes(newEnd.getMinutes() + minuteDiff);
          }

          // Verificar si el destino es válido
          const isValid = validateEventDrag(event, minuteDiff, newStart);

          if (isValid) {
            if (onEventUpdate) {
              // Actualizar directamente
              onEventUpdate({
                ...event,
                start: newStart,
                end: newEnd,
              });
            } else if (showTimeChangeConfirmation) {
              // Mostrar confirmación si está disponible
              showTimeChangeConfirmation(event, newStart, newEnd);
            }
          }
        }
      } catch (error) {
        // Resetear en caso de error
        translateY.setValue(0);
        translateX.setValue(0);
      }
    } else {
      // Resetear valores de traducción si no hubo movimiento suficiente
      translateY.setValue(0);
      translateX.setValue(0);
    }

    // Restablecer estado de arrastre
    longPressActive.current = false;
    isDragging.current = false;
    setIsResizing(false);
  }

  return {
    panResponder,
    translateY,
    translateX,
    scaleAnim,
    opacityAnim,
    isTargetUnavailable,
    previewPosition,
    horizontalPreviewPosition,
    clearPreviewElements,
    calculatePreviewPosition,
    getHorizontalPreviewPosition,
  };
};

export default useDragAndDrop;
