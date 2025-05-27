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

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Extract preview offset from config, default to 20px if not set
  const previewOffset = calendarConfig?.dragPreviewConfig?.previewOffset || 20;
  const connectionLineWidth =
    calendarConfig?.dragPreviewConfig?.connectionLineWidth || 2;

  // Add state to track the current translateY value
  const [currentTranslateY, setCurrentTranslateY] = useState(0);

  // Add a listener to the animated value to track changes
  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      setCurrentTranslateY(value);
    });

    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

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
        // Update position - Only use vertical movement (dy)
        translateY.setValue(gestureState.dy);

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

        // Create a new date object for the snap time
        const snapTime = new Date(event.start);
        // Reset minutes completely and then add the snapped minutes
        snapTime.setHours(
          Math.floor(snappedMinutesFromMidnight / 60),
          snappedMinutesFromMidnight % 60,
          0,
          0
        );

        // Mostrar previsualización si hay cualquier movimiento significativo
        if (Math.abs(gestureState.dy) > 1) {
          // Calcular nueva posición de previsualización usando el valor exacto
          const newPreviewPosition = calculatePreviewPosition(
            gestureState.dy, // Usar directamente el desplazamiento en píxeles
            minuteDiff
          );

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
            exactMinuteDiff,
            originalMinutesFromMidnight,
            newMinutesFromMidnight,
            snappedMinutesFromMidnight,
            minuteDiff,
            snapTimeHour: snapTime.getHours(),
            snapTimeMinute: snapTime.getMinutes(),
            snapTime: snapTime.toLocaleTimeString(),
            timeInterval,
            top,
            previewOffset,
            currentTranslateY,
            newPreviewPosition,
          });

          setPreviewPosition(newPreviewPosition);
        } else {
          setPreviewPosition(null);
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
          setIsTargetUnavailable(false);

          // Handle the event update
          if (Math.abs(gestureState.dy) > 10) {
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

            if (minuteDiff !== 0) {
              // Create new date objects to avoid modifying the original
              const newStart = new Date(event.start);
              const newEnd = new Date(event.end);

              // Calculate duration in minutes
              const durationMinutes =
                event.end.getHours() * 60 +
                event.end.getMinutes() -
                (event.start.getHours() * 60 + event.start.getMinutes());

              // Set the start time to the snapped time
              newStart.setHours(
                Math.floor(snappedMinutesFromMidnight / 60),
                snappedMinutesFromMidnight % 60,
                0,
                0
              );

              // Set the end time based on the original duration
              const endMinutesFromMidnight =
                snappedMinutesFromMidnight + durationMinutes;
              newEnd.setHours(
                Math.floor(endMinutesFromMidnight / 60),
                endMinutesFromMidnight % 60,
                0,
                0
              );

              // Ensure the day is preserved (only change time)
              newStart.setFullYear(event.start.getFullYear());
              newStart.setMonth(event.start.getMonth());
              newStart.setDate(event.start.getDate());

              newEnd.setFullYear(event.end.getFullYear());
              newEnd.setMonth(event.end.getMonth());
              newEnd.setDate(event.end.getDate());

              logger.debug("Finalizando arrastre de evento", {
                eventId: event.id,
                minuteDiff,
                originalStart: event.start.toLocaleTimeString(),
                originalStartDate: event.start.toLocaleDateString(),
                originalEnd: event.end.toLocaleTimeString(),
                newStart: newStart.toLocaleTimeString(),
                newStartDate: newStart.toLocaleDateString(),
                newEnd: newEnd.toLocaleTimeString(),
                eventTitle: event.title,
                leftPosition: left, // Aseguramos que mantenemos la misma posición left
                originalMinutesFromMidnight,
                snappedMinutesFromMidnight,
                timeInterval,
                viewType,
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

                setIsResizing(false);
                return;
              }

              // Verificar si la nueva posición está en un rango no disponible
              if (isTimeSlotUnavailable(newStart)) {
                // Si el destino no está disponible, aplicar feedback háptico de error
                if (hapticOptions?.enabled && hapticOptions.error) {
                  try {
                    require("expo-haptics").notificationAsync(
                      require("expo-haptics").NotificationFeedbackType.Error
                    );
                    logger.debug("Feedback háptico de error aplicado", {
                      eventId: event.id,
                      reason: "hora no disponible",
                    });
                  } catch (e) {
                    logger.debug("Haptic feedback failed", { error: e });
                  }
                }

                // Animar de vuelta a la posición original
                Animated.spring(translateY, {
                  toValue: 0,
                  friction: 5,
                  tension: 40,
                  useNativeDriver: true,
                }).start();

                // No actualizar si está en una zona no disponible
                logger.debug(
                  "Reubicación de evento rechazada - horario no disponible",
                  {
                    eventId: event.id,
                    newStart: newStart.toLocaleTimeString(),
                    eventTitle: event.title,
                    dayOfWeek: newStart.getDay(),
                    timeValue: newStart.getHours() + newStart.getMinutes() / 60,
                  }
                );
              } else {
                logger.debug("Mostrando confirmación de cambio de horario", {
                  eventId: event.id,
                  minuteDiff,
                  newStart: newStart.toLocaleTimeString(),
                  newEnd: newEnd.toLocaleTimeString(),
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
                  viewType,
                }
              );
            }
          } else {
            logger.debug(
              "Arrastre de evento cancelado (movimiento insuficiente)",
              {
                eventId: event.id,
                dy: gestureState.dy,
                viewType,
              }
            );
          }

          // Reset translation
          translateY.setValue(0);
          setIsResizing(false);
        } catch (error: any) {
          // Critical error handling to prevent app crash
          logger.error("❌ ERROR DURING EVENT DRAG RELEASE", {
            error: error.message,
            eventId: event.id,
            viewType,
            gestureState: {
              dy: gestureState.dy,
              moveY: gestureState.moveY,
              y0: gestureState.y0,
            },
          });

          // Reset all states to recover from error
          translateY.setValue(0);
          setIsResizing(false);
          setIsPressed(false);
          setPreviewPosition(null);
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
  const backgroundColor = event.color || theme.eventColors[0];

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
      {/* Evento principal */}
      <Animated.View
        onLayout={onLayout}
        style={[
          styles.container,
          {
            backgroundColor,
            width,
            left,
            top,
            height: eventHeight,
            borderLeftWidth: 3,
            borderLeftColor: backgroundColor,
            transform: [{ translateY: translateY }, { scale: scaleAnim }],
            zIndex: isPressed || previewPosition !== null ? 50 : 10, // Aumentar z-index cuando está seleccionado o arrastrando pero menos que el preview
            opacity: previewPosition !== null ? 0.8 : width < 60 ? 0.9 : 1, // Más transparente durante el arrastre
            shadowOpacity: isPressed ? 0.4 : 0.2, // Más sombra cuando está seleccionado
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.resizeHandle} />

        <TouchableOpacity
          style={styles.contentContainer}
          onPress={handleEventPress}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.title,
              {
                color: textColor,
                fontSize: width < 50 ? 8 : width < 70 ? 9 : 12, // Ajuste dinámico del tamaño de fuente
                fontWeight: width < 50 ? "500" : "600", // Reducir peso de fuente en eventos estrechos
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>

          {/* Solo mostrar hora si hay suficiente espacio */}
          {eventHeight >= 35 && width >= 45 && (
            <Text
              style={[
                styles.time,
                {
                  color: textColor,
                  fontSize: width < 50 ? 7 : width < 80 ? 8 : 10,
                  opacity: width < 60 ? 0.7 : 0.8,
                },
              ]}
              numberOfLines={1}
            >
              {formatTime(event.start, locale)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.resizeHandle} />
      </Animated.View>

      {/* Indicador de destino cuando se arrastra el evento - rendered last for proper stacking */}
      {previewPosition !== null && (
        <>
          {/* Línea de conexión entre el evento original y la previsualización */}
          <View
            style={{
              position: "absolute",
              left: left + width / 2, // Centrado horizontalmente
              top: Math.min(
                top + currentTranslateY,
                previewPosition - previewOffset
              ),
              width: connectionLineWidth,
              height: Math.max(
                5,
                Math.abs(
                  top + currentTranslateY - (previewPosition - previewOffset)
                )
              ),
              backgroundColor: isTargetUnavailable
                ? theme.errorColor || "#F44336"
                : theme.connectionLineColor || backgroundColor,
              opacity: 0.7,
              zIndex: 99,
              elevation: 9, // Slightly lower than the preview but higher than regular events
            }}
          />

          <Animated.View
            style={[
              styles.previewContainer,
              {
                backgroundColor: isTargetUnavailable
                  ? theme.errorColor || "rgba(244, 67, 54, 0.4)"
                  : theme.dragMovePreviewColor || "rgba(33, 150, 243, 0.4)",
                borderColor: isTargetUnavailable
                  ? theme.errorColor || "#F44336"
                  : backgroundColor,
                width,
                left,
                // Posición exacta: posición original + desplazamiento del drag - offset del preview
                top: previewPosition - previewOffset,
                height: eventHeight,
                opacity: 0.7,
                zIndex: 100,
                elevation: 10,
              },
            ]}
          >
            <View style={styles.previewContent}>
              <Text
                style={[
                  styles.previewTitle,
                  {
                    fontSize: width < 50 ? 8 : width < 70 ? 9 : 12,
                    fontWeight: width < 50 ? "500" : "600",
                    color: isTargetUnavailable ? "#FFFFFF" : "#333333",
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isTargetUnavailable ? "Hora no disponible" : event.title}
              </Text>
              {eventHeight >= 35 && width >= 45 && !isTargetUnavailable && (
                <Text
                  style={[
                    styles.previewTime,
                    {
                      fontSize: width < 50 ? 7 : width < 80 ? 8 : 10,
                      opacity: width < 60 ? 0.7 : 0.8,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {formatTime(event.start, locale)}
                </Text>
              )}
            </View>
          </Animated.View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    borderRadius: 4,
    overflow: "hidden",
    margin: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
  },
  previewContainer: {
    position: "absolute",
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    margin: 1,
    pointerEvents: "none",
    elevation: 10,
  },
  previewContent: {
    flex: 1,
    padding: 4,
    justifyContent: "center",
  },
  previewTitle: {
    fontWeight: "600",
    color: "#333333",
  },
  previewTime: {
    color: "#333333",
    marginTop: 2,
    opacity: 0.7,
  },
  contentContainer: {
    flex: 1,
    padding: 4,
    justifyContent: "center",
  },
  title: {
    fontWeight: "600",
    fontSize: 12,
  },
  time: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  resizeHandle: {
    height: 6,
    width: "100%",
  },
});

export default Event;
