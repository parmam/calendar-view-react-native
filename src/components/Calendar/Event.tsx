import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderInstance,
  LayoutChangeEvent,
  TouchableOpacity,
} from "react-native";
import { useCalendar } from "./CalendarContext";
import { formatTime, getEventPosition } from "./utils";
import { CalendarEvent } from "./types";
import { useLogger } from "./utils/logger";
import { useLayoutConfig } from "./config";

interface EventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  top: number;
  height: number;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
  onEventDragWithSnap?: (
    event: CalendarEvent,
    minuteDiff: number,
    snapTime: Date
  ) => boolean;
  onEventDragEnd?: () => void;
  onDragNearEdge?: (distanceFromEdge: number, direction: "up" | "down") => void;
  viewHeight?: number;
  scrollPosition: { x: number; y: number };
  columnWidth?: number;
  dayIndex?: number;
  dates?: Date[];
}

const Event: React.FC<EventProps> = ({
  event,
  width,
  left,
  top,
  height,
  isResizing,
  setIsResizing,
  onEventDragWithSnap,
  onEventDragEnd,
  onDragNearEdge,
  viewHeight,
  scrollPosition,
  columnWidth,
  dayIndex,
  dates,
}) => {
  // Initialize logger
  const logger = useLogger("Event");

  // Obtener configuración de layout
  const { layoutConfig } = useLayoutConfig();
  const HOUR_HEIGHT = layoutConfig.HOUR_HEIGHT;

  // Log event details for debugging
  useEffect(() => {
    logger.debug(`Event rendering: ${event.id}`, {
      title: event.title,
      width,
      left,
      top,
      height,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    });
  }, [event, width, left, top, height]);

  const {
    onEventPress,
    onEventUpdate,
    theme,
    locale,
    hapticOptions,
    timeRange,
    unavailableHours,
    calendarConfig,
    timeInterval,
    showTimeChangeConfirmation,
    viewType,
  } = useCalendar();
  const [eventHeight, setEventHeight] = useState(height);
  const [isPressed, setIsPressed] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isTargetUnavailable, setIsTargetUnavailable] = useState(false);
  const [horizontalPreviewPosition, setHorizontalPreviewPosition] = useState<
    number | null
  >(null);

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Extract preview offset from config, default to 20px if not set
  const previewOffset = calendarConfig?.dragPreviewConfig?.previewOffset || 20;
  const connectionLineWidth =
    calendarConfig?.dragPreviewConfig?.connectionLineWidth || 2;

  // Add state to track the current translateY value
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);

  // Add a listener to the animated values to track changes
  useEffect(() => {
    const idY = translateY.addListener(({ value }) => {
      setCurrentTranslateY(value);
    });

    const idX = translateX.addListener(({ value }) => {
      setCurrentTranslateX(value);
    });

    return () => {
      translateY.removeListener(idY);
      translateX.removeListener(idX);
    };
  }, [translateY, translateX]);

  // Animate event when selected
  useEffect(() => {
    // Scale animation on mount
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Update height when prop changes
  useEffect(() => {
    if (height > 0) {
      setEventHeight(height);
    }
  }, [height]);

  // Handle layout change to get the event height
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const layoutHeight = e.nativeEvent.layout.height;
      if (layoutHeight > 0) {
        logger.debug(`Event layout update: ${event.id}`, {
          id: event.id,
          layoutHeight,
          prevHeight: eventHeight,
        });
        setEventHeight(Math.max(layoutHeight, 25)); // Ensure min height
      }
    },
    [event.id, eventHeight]
  );

  // Verificar si la hora de destino está en un rango no disponible
  const isTimeSlotUnavailable = (date: Date): boolean => {
    if (!unavailableHours) return false;

    // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
    const dayOfWeek = date.getDay();

    // Verificar si este día está incluido en días no disponibles
    const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6]; // Por defecto, todos los días
    if (!daysToCheck.includes(dayOfWeek)) return false;

    // Crear un valor decimal de tiempo (por ej., 9.5 para 9:30)
    const timeValue = date.getHours() + date.getMinutes() / 60;

    // Verificar si la hora cae dentro de algún rango no disponible
    const isUnavailable = unavailableHours.ranges.some(
      (range) => timeValue >= range.start && timeValue < range.end
    );

    logger.debug("Verificando disponibilidad de horario", {
      date: date.toISOString(),
      dayOfWeek,
      timeValue,
      isUnavailable,
      eventId: event.id,
      eventTitle: event.title,
    });

    return isUnavailable;
  };

  // Calculate day difference based on horizontal movement
  const calculateDayDiff = (dx: number): number => {
    // If no column width or multi-day view props are provided, return 0
    if (
      !columnWidth ||
      typeof dayIndex !== "number" ||
      !dates ||
      viewType === "day"
    ) {
      return 0;
    }

    // Calculate how many columns we've moved
    const columnsMoved = Math.round(dx / columnWidth);

    // Don't allow moving beyond available dates
    const newDayIndex = Math.max(
      0,
      Math.min(dates.length - 1, dayIndex + columnsMoved)
    );

    // Calculate actual day difference
    const dayDiff = newDayIndex - dayIndex;

    return dayDiff;
  };

  // Pan responder for dragging the event
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => !isResizing,
      onPanResponderGrant: () => {
        setIsResizing(true);
        logger.debug("Inicio de arrastre de evento", {
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.start.toLocaleTimeString(),
          endTime: event.end.toLocaleTimeString(),
          position: { top, left },
        });
        setIsPressed(true);

        // Highlight the event when being dragged
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }).start();

        // Aumentar opacidad para destacar el evento activo
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();

        // Aplicar feedback háptico si está habilitado
        if (hapticOptions?.enabled && hapticOptions.eventMove) {
          try {
            require("expo-haptics").impactAsync(
              hapticOptions.eventMove === "light"
                ? require("expo-haptics").ImpactFeedbackStyle.Light
                : hapticOptions.eventMove === "medium"
                ? require("expo-haptics").ImpactFeedbackStyle.Medium
                : require("expo-haptics").ImpactFeedbackStyle.Heavy
            );
            logger.debug("Feedback háptico aplicado", {
              eventId: event.id,
              intensity: hapticOptions.eventMove,
            });
          } catch (e) {
            logger.debug("Haptic feedback failed", { error: e });
          }
        }
      },
      onPanResponderMove: (e, gestureState) => {
        // Update both vertical and horizontal position
        translateY.setValue(gestureState.dy);

        // Only update horizontal position in multi-day views
        if (
          viewType !== "day" &&
          columnWidth &&
          typeof dayIndex === "number" &&
          dates
        ) {
          translateX.setValue(gestureState.dx);
        }

        // Calculate current position in the view
        const currentPositionY = top + gestureState.dy;
        const absolutePositionY = currentPositionY + scrollPosition.y;

        // Check if we're near the edges and should trigger auto-scrolling
        if (viewHeight && onDragNearEdge) {
          // Distance from top edge
          const distanceFromTop = absolutePositionY;

          // Distance from bottom edge
          const distanceFromBottom =
            viewHeight - (absolutePositionY + eventHeight);

          // Edge detection threshold (in pixels)
          const edgeThreshold = 100;

          // Log edge proximity info (reduce frecuencia de logs)
          if (Math.abs(gestureState.dy) > 20 && Math.random() < 0.03) {
            logger.debug("📏 EVENT DRAG POSITION:", {
              eventId: event.id,
              eventTitle: event.title,
              top: top.toFixed(1),
              dy: gestureState.dy.toFixed(1),
              dx: gestureState.dx.toFixed(1),
              currentPosition: currentPositionY.toFixed(1),
              absolutePosition: absolutePositionY.toFixed(1),
              scrollPosition: scrollPosition.y.toFixed(1),
              viewHeight,
              distanceFromTop: distanceFromTop.toFixed(1),
              distanceFromBottom: distanceFromBottom.toFixed(1),
              nearTopEdge: distanceFromTop < edgeThreshold,
              nearBottomEdge: distanceFromBottom < edgeThreshold,
              pagingScrollEnabled:
                calendarConfig?.dragPreviewConfig?.enablePagingScroll,
            });
          }

          // Check if we're near the top edge
          if (distanceFromTop < edgeThreshold) {
            // Si estamos usando scroll paginado, necesitamos un trigger más agresivo
            // porque el scrolleo ocurrirá de una vez, no continuamente
            const pagingScrollEnabled =
              calendarConfig?.dragPreviewConfig?.enablePagingScroll;
            const triggerThreshold = pagingScrollEnabled ? edgeThreshold : 50;

            if (distanceFromTop < triggerThreshold) {
              logger.debug("⬆️ NEAR TOP EDGE:", {
                eventId: event.id,
                distance: distanceFromTop.toFixed(1),
                threshold: edgeThreshold,
                pagingScrollEnabled,
              });
              onDragNearEdge(distanceFromTop, "up");
            }
          }
          // Check if we're near the bottom edge
          else if (distanceFromBottom < edgeThreshold) {
            // Igual que arriba, usamos un trigger más agresivo para scroll paginado
            const pagingScrollEnabled =
              calendarConfig?.dragPreviewConfig?.enablePagingScroll;
            const triggerThreshold = pagingScrollEnabled ? edgeThreshold : 50;

            if (distanceFromBottom < triggerThreshold) {
              logger.debug("⬇️ NEAR BOTTOM EDGE:", {
                eventId: event.id,
                distance: distanceFromBottom.toFixed(1),
                threshold: edgeThreshold,
                pagingScrollEnabled,
              });
              onDragNearEdge(distanceFromBottom, "down");
            }
          }
        }

        // Constante para conversión de píxeles a minutos
        const pixelsPerMinute = HOUR_HEIGHT / 60; // 1 pixel por minuto si HOUR_HEIGHT es 60

        // Usar el valor exacto de dy sin redondeo para cálculos de posición
        const exactMinuteDiff = gestureState.dy / pixelsPerMinute;

        // Snap to precise timeInterval grid
        // First get total minutes from start of day for the original event
        const originalMinutesFromMidnight =
          event.start.getHours() * 60 + event.start.getMinutes();

        // Calculate new raw minutes
        const newMinutesFromMidnight =
          originalMinutesFromMidnight + exactMinuteDiff;

        // Snap to nearest timeInterval grid point
        const snappedMinutesFromMidnight =
          Math.round(newMinutesFromMidnight / timeInterval) * timeInterval;

        // Calculate the final minute difference that maintains the timeInterval grid
        const minuteDiff =
          snappedMinutesFromMidnight - originalMinutesFromMidnight;

        // Calculate day difference from horizontal movement
        const dayDiff = calculateDayDiff(gestureState.dx);

        // Create a new date object for the snap time
        const snapTime = new Date(event.start);

        // If we have day difference, apply it first
        if (dayDiff !== 0) {
          snapTime.setDate(snapTime.getDate() + dayDiff);
        }

        // Reset minutes completely and then add the snapped minutes
        snapTime.setHours(
          Math.floor(snappedMinutesFromMidnight / 60),
          snappedMinutesFromMidnight % 60,
          0,
          0
        );

        // Mostrar previsualización si hay cualquier movimiento significativo
        if (Math.abs(gestureState.dy) > 1 || Math.abs(gestureState.dx) > 10) {
          // Calcular nueva posición de previsualización usando el valor exacto
          const newPreviewPosition = calculatePreviewPosition(
            gestureState.dy, // Usar directamente el desplazamiento en píxeles
            minuteDiff
          );

          // Calculate horizontal preview position if in multi-day view
          let newHorizontalPosition = null;
          if (viewType !== "day" && columnWidth && dayDiff !== 0) {
            newHorizontalPosition = dayDiff * columnWidth;
            setHorizontalPreviewPosition(newHorizontalPosition);
          } else {
            setHorizontalPreviewPosition(null);
          }

          // Call the parent event drag handler with the snap time
          if (onEventUpdate) {
            // This will only validate if dragging is allowed and update the snap line
            const isValid = validateEventDrag(event, minuteDiff, snapTime);
            setIsTargetUnavailable(!isValid);
          }

          // Registrar información detallada para depuración
          logger.debug("Movimiento durante arrastre", {
            eventId: event.id,
            eventTitle: event.title,
            dy: gestureState.dy,
            dx: gestureState.dx,
            exactMinuteDiff,
            dayDiff,
            originalMinutesFromMidnight,
            newMinutesFromMidnight,
            snappedMinutesFromMidnight,
            minuteDiff,
            snapTimeHour: snapTime.getHours(),
            snapTimeMinute: snapTime.getMinutes(),
            snapTime: snapTime.toLocaleTimeString(),
            snapDate: snapTime.toLocaleDateString(),
            timeInterval,
            top,
            previewOffset,
            currentTranslateY,
            currentTranslateX,
            newPreviewPosition,
            newHorizontalPosition,
          });

          setPreviewPosition(newPreviewPosition);
        } else {
          setPreviewPosition(null);
          setHorizontalPreviewPosition(null);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        try {
          // Llamar al drag end handler inmediatamente para parar cualquier autoscroll
          if (onEventDragEnd) {
            onEventDragEnd();
          }

          // Reset the animation
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();

          setIsPressed(false);
          setPreviewPosition(null);
          setHorizontalPreviewPosition(null);
          setIsTargetUnavailable(false);

          // Handle the event update
          if (
            Math.abs(gestureState.dy) > 10 ||
            Math.abs(gestureState.dx) > 10
          ) {
            // Calculate minutes using the same grid-snapping logic as in onPanResponderMove
            const pixelsPerMinute = HOUR_HEIGHT / 60;
            const exactMinuteDiff = gestureState.dy / pixelsPerMinute;

            // Get original minutes from midnight
            const originalMinutesFromMidnight =
              event.start.getHours() * 60 + event.start.getMinutes();

            // Calculate new total minutes
            const newMinutesFromMidnight =
              originalMinutesFromMidnight + exactMinuteDiff;

            // Snap to nearest timeInterval grid point
            const snappedMinutesFromMidnight =
              Math.round(newMinutesFromMidnight / timeInterval) * timeInterval;

            // Calculate the final minute difference that maintains the timeInterval grid
            const minuteDiff =
              snappedMinutesFromMidnight - originalMinutesFromMidnight;

            // Calculate day difference from horizontal movement
            const dayDiff = calculateDayDiff(gestureState.dx);

            // Crear nuevas fechas de inicio y fin con los cambios
            const newStart = new Date(event.start);
            const newEnd = new Date(event.end);

            // Apply day change first if needed
            if (dayDiff !== 0) {
              newStart.setDate(newStart.getDate() + dayDiff);
              newEnd.setDate(newEnd.getDate() + dayDiff);
            }

            // Apply minute change
            const durationMs = event.end.getTime() - event.start.getTime();

            // Reset hours and minutes for precise time
            newStart.setHours(
              Math.floor(snappedMinutesFromMidnight / 60),
              snappedMinutesFromMidnight % 60,
              0,
              0
            );

            // Set end time based on original duration
            newEnd.setTime(newStart.getTime() + durationMs);

            logger.debug("Finalizando arrastre de evento", {
              eventId: event.id,
              minuteDiff,
              dayDiff,
              originalStart: event.start.toLocaleTimeString(),
              originalStartDate: event.start.toLocaleDateString(),
              originalEnd: event.end.toLocaleTimeString(),
              newStart: newStart.toLocaleTimeString(),
              newStartDate: newStart.toLocaleDateString(),
              newEnd: newEnd.toLocaleTimeString(),
              newEndDate: newEnd.toLocaleDateString(),
              eventTitle: event.title,
              leftPosition: left,
              originalMinutesFromMidnight,
              snappedMinutesFromMidnight,
              timeInterval,
              viewType,
              dx: gestureState.dx,
              dy: gestureState.dy,
            });

            // Safety check - make sure showTimeChangeConfirmation exists
            if (!showTimeChangeConfirmation) {
              logger.error(
                "❌ Cannot show time change confirmation - function not available",
                {
                  viewType,
                  eventId: event.id,
                }
              );

              // Reset position smoothly
              Animated.spring(translateY, {
                toValue: 0,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }).start();

              // Reset horizontal position
              Animated.spring(translateX, {
                toValue: 0,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }).start();

              setIsResizing(false);
              return;
            }

            // Validar que el destino sea una zona permitida
            const isValid = validateEventDrag(event, minuteDiff, newStart);

            if (!isValid) {
              logger.debug(
                "Arrastre de evento cancelado (destino no disponible)",
                {
                  eventId: event.id,
                  newStart: newStart.toLocaleTimeString(),
                  newStartDate: newStart.toLocaleDateString(),
                  minuteDiff,
                  dayDiff,
                  viewType,
                }
              );

              // Reset position smoothly
              Animated.spring(translateY, {
                toValue: 0,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }).start();

              // Reset horizontal position
              Animated.spring(translateX, {
                toValue: 0,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }).start();

              setIsResizing(false);
            } else {
              logger.debug("Mostrando confirmación de cambio de horario", {
                eventId: event.id,
                minuteDiff,
                dayDiff,
                newStart: newStart.toLocaleTimeString(),
                newStartDate: newStart.toLocaleDateString(),
                newEnd: newEnd.toLocaleTimeString(),
                newEndDate: newEnd.toLocaleDateString(),
                eventTitle: event.title,
                viewType,
              });

              // Instead of directly updating the event, show confirmation modal
              showTimeChangeConfirmation(event, newStart, newEnd);
            }
          } else {
            logger.debug(
              "Arrastre de evento cancelado (movimiento insuficiente)",
              {
                eventId: event.id,
                dy: gestureState.dy,
                dx: gestureState.dx,
                viewType,
              }
            );
          }

          // Reset translation
          translateY.setValue(0);
          translateX.setValue(0);
          setIsResizing(false);
        } catch (error: any) {
          // Critical error handling to prevent app crash
          logger.error("❌ ERROR DURING EVENT DRAG RELEASE", {
            error: error.message,
            eventId: event.id,
            viewType,
            gestureState: {
              dy: gestureState.dy,
              dx: gestureState.dx,
              moveY: gestureState.moveY,
              y0: gestureState.y0,
            },
          });

          // Reset all states to recover from error
          translateY.setValue(0);
          translateX.setValue(0);
          setIsResizing(false);
          setIsPressed(false);
          setPreviewPosition(null);
          setHorizontalPreviewPosition(null);
          setIsTargetUnavailable(false);

          // Call drag end to ensure parent components are updated
          if (onEventDragEnd) {
            try {
              onEventDragEnd();
            } catch (innerError: any) {
              logger.error("❌ Additional error in drag end handler", {
                error: innerError.message,
              });
            }
          }
        }
      },
    })
  ).current;

  // Calcular la posición temporal al arrastrar
  const calculatePreviewPosition = (
    dy: number, // Valor en píxeles del desplazamiento
    roundedMinuteDiff: number // Solo para verificación de disponibilidad
  ): number => {
    // Crear una copia de la fecha de inicio original para verificación de disponibilidad
    const newStart = new Date(event.start);
    newStart.setMinutes(newStart.getMinutes() + roundedMinuteDiff);

    // Importante: Mantener el mismo día, solo cambiamos la hora
    newStart.setFullYear(event.start.getFullYear());
    newStart.setMonth(event.start.getMonth());
    newStart.setDate(event.start.getDate());

    // Verificar si la nueva posición está en un rango no disponible
    const unavailable = isTimeSlotUnavailable(newStart);
    setIsTargetUnavailable(unavailable);

    // POSICIONAMIENTO DIRECTO: simplemente desplazar la posición original
    // por la cantidad exacta de píxeles del dy
    const directPosition = top + dy;

    // Registrar información detallada para depuración
    logger.debug("Preview position calculation details", {
      eventId: event.id,
      eventTitle: event.title,
      dy,
      roundedMinuteDiff,
      directPosition,
      originalTop: top,
      previewOffset,
      finalPreviewTop: directPosition - previewOffset,
      distanceToEvent: Math.abs(directPosition - previewOffset - (top + dy)),
      originalDay: event.start.getDate(),
      newDay: newStart.getDate(), // Debería ser igual que el original
    });

    // Asegurarse de que la posición esté dentro de los límites visibles
    const maxHours = (timeRange?.end || 24) - (timeRange?.start || 0);
    const maxPosition = maxHours * HOUR_HEIGHT;

    const limitedPosition = Math.max(0, Math.min(directPosition, maxPosition));

    return limitedPosition;
  };

  // Handler for event press
  const handleEventPress = useCallback(() => {
    try {
      logger.debug("Event pressed", { eventId: event.id, viewType });

      if (onEventPress) {
        onEventPress(event);
      }

      setIsPressed(true);

      // Provide visual feedback with animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsPressed(false);
      });
    } catch (error: any) {
      logger.error("❌ Error handling event press", {
        error: error.message,
        eventId: event.id,
        viewType,
      });
      // Reset state to prevent UI getting stuck
      setIsPressed(false);
    }
  }, [event, onEventPress, scaleAnim, viewType]);

  // Format event times
  const eventTimeText = `${formatTime(event.start, locale)} - ${formatTime(
    event.end,
    locale
  )}`;

  // Background color based on the event color or default color
  const backgroundColor = event.color || theme.primaryColor;

  // Ajustar oscuridad del texto basado en el color de fondo
  const getContrastText = (bgColor: string) => {
    // Extraer componentes RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    // Calcular luminancia (fórmula simplificada)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Retornar color de texto basado en luminancia
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  const textColor = getContrastText(backgroundColor);

  // Add logging for the preview configuration
  useEffect(() => {
    logger.debug("Preview configuration", {
      previewOffset,
      connectionLineWidth,
      eventId: event.id,
    });
  }, [previewOffset, connectionLineWidth, event.id]);

  // Modify the validateEventDrag function to use the onEventDragWithSnap prop
  const validateEventDrag = (
    event: CalendarEvent,
    minuteDiff: number,
    snapTime: Date
  ): boolean => {
    try {
      // Add debug logging for day view
      if (viewType === "day") {
        logger.debug("🔍 Validating event drag in day view", {
          eventId: event.id,
          minuteDiff,
          viewType,
          hasEventDragHandler: !!onEventDragWithSnap,
        });
      }

      // Safety check
      if (!onEventDragWithSnap) {
        logger.warn("⚠️ No event drag handler available", {
          viewType,
          eventId: event.id,
        });
        return true; // Default to allowing drag if no handler
      }

      // Use the onEventDragWithSnap prop if provided
      return onEventDragWithSnap(event, minuteDiff, snapTime);
    } catch (error: any) {
      logger.error("❌ Error validating event drag", {
        error: error.message,
        viewType,
        eventId: event.id,
      });
      return false;
    }
  };

  return (
    <>
      {/* Snap line preview */}
      {previewPosition !== null && (
        <View
          style={[
            styles.previewLine,
            {
              top: previewPosition,
              borderColor: isTargetUnavailable
                ? theme.errorColor
                : theme.primaryColor,
              width: width - 4, // Slightly smaller than the event
              left: left + 2,
              borderWidth: connectionLineWidth,
            },
          ]}
        />
      )}

      {/* Horizontal preview for day changes */}
      {horizontalPreviewPosition !== null && (
        <View
          style={[
            styles.horizontalPreviewLine,
            {
              top: top + height / 2,
              borderColor: isTargetUnavailable
                ? theme.errorColor
                : theme.primaryColor,
              width: columnWidth ? Math.abs(horizontalPreviewPosition) : 0,
              left:
                horizontalPreviewPosition && horizontalPreviewPosition > 0
                  ? left + width
                  : horizontalPreviewPosition
                  ? left + horizontalPreviewPosition
                  : left,
              borderWidth: connectionLineWidth,
            },
          ]}
        />
      )}

      {/* Connection line for preview */}
      {previewPosition !== null && (
        <View
          style={[
            styles.connectionLine,
            {
              top:
                previewPosition < top + height / 2
                  ? previewPosition
                  : top + height / 2,
              height: Math.abs(previewPosition - (top + height / 2)),
              left: left + width / 2 - connectionLineWidth / 2,
              borderWidth: connectionLineWidth,
              borderColor: isTargetUnavailable
                ? theme.errorColor
                : theme.primaryColor,
              // If previewPosition is above the event, align from top
              // Otherwise align from bottom
              alignItems: "center",
              justifyContent:
                previewPosition < top + height / 2 ? "flex-start" : "flex-end",
            },
          ]}
        />
      )}

      <Animated.View
        onLayout={(e: LayoutChangeEvent) => {
          setEventHeight(e.nativeEvent.layout.height);
        }}
        {...panResponder.panHandlers}
        style={[
          styles.event,
          {
            width,
            left,
            top,
            height,
            backgroundColor: event.color || theme.primaryColor,
            // Apply transforms and opacity based on interactions
            transform: [
              { translateY },
              { translateX }, // Add horizontal transform
              { scale: scaleAnim },
            ],
            opacity: isTargetUnavailable ? 0.5 : opacityAnim,
            // Add borders and shadows for pressed state
            ...(isPressed
              ? {
                  borderWidth: 2,
                  borderColor: isTargetUnavailable
                    ? theme.errorColor
                    : theme.successColor,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 5,
                }
              : {}),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.eventContent}
          onPress={handleEventPress}
          activeOpacity={0.7}
          disabled={isResizing}
        >
          <Text
            style={[
              styles.eventTitle,
              { color: getContrastText(event.color || theme.primaryColor) },
            ]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text
            style={[
              styles.eventTime,
              { color: getContrastText(event.color || theme.primaryColor) },
            ]}
            numberOfLines={1}
          >
            {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  event: {
    position: "absolute",
    borderRadius: 4,
    overflow: "hidden",
    zIndex: 10,
  },
  eventContent: {
    flex: 1,
    padding: 4,
    justifyContent: "center",
  },
  eventTitle: {
    fontWeight: "bold",
    fontSize: 12,
  },
  eventTime: {
    fontSize: 10,
  },
  previewLine: {
    position: "absolute",
    borderStyle: "dashed",
    height: 0,
    zIndex: 8,
  },
  // Add horizontal preview line style
  horizontalPreviewLine: {
    position: "absolute",
    borderStyle: "dashed",
    height: 0,
    zIndex: 8,
  },
  connectionLine: {
    position: "absolute",
    borderLeftWidth: 1,
    borderStyle: "dashed",
    zIndex: 7,
  },
});

export default Event;
