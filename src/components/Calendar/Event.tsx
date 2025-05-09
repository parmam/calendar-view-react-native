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

interface EventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  top: number;
  height: number;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
}

const Event: React.FC<EventProps> = ({
  event,
  width,
  left,
  top,
  height,
  isResizing,
  setIsResizing,
}) => {
  // Initialize logger
  const logger = useLogger("Event");

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
  } = useCalendar();
  const [eventHeight, setEventHeight] = useState(height);
  const [isPressed, setIsPressed] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const [isTargetUnavailable, setIsTargetUnavailable] = useState(false);

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

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
    return unavailableHours.ranges.some(
      (range) => timeValue >= range.start && timeValue < range.end
    );
  };

  // Calcular la posición temporal al arrastrar
  const calculatePreviewPosition = (minuteDiff: number): number => {
    // Calcular las nuevas horas de inicio y fin
    const newStart = new Date(event.start);
    newStart.setMinutes(newStart.getMinutes() + minuteDiff);

    // Verificar si la nueva posición está en un rango no disponible
    const unavailable = isTimeSlotUnavailable(newStart);
    setIsTargetUnavailable(unavailable);

    // Obtener la posición visual usando la misma lógica que el evento original
    const hourHeight =
      eventHeight /
      Math.max(
        1,
        event.end.getHours() -
          event.start.getHours() +
          (event.end.getMinutes() - event.start.getMinutes()) / 60
      );

    // Calcular posición top basada en las nuevas horas
    const hoursFromRangeStart = newStart.getHours() - (timeRange?.start || 0);
    const minutesPercentage = newStart.getMinutes() / 60;
    const newTop = (hoursFromRangeStart + minutesPercentage) * hourHeight;

    // Asegurarse de que la posición esté dentro de los límites visibles
    const maxTop = (timeRange?.end || 24) - (timeRange?.start || 0);
    return Math.max(0, Math.min(newTop, maxTop * hourHeight));
  };

  // Pan responder for dragging the event
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => !isResizing,
      onPanResponderGrant: () => {
        setIsResizing(true);
        logger.debug("Event drag started", { eventId: event.id });
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
          } catch (e) {
            logger.debug("Haptic feedback failed", { error: e });
          }
        }
      },
      onPanResponderMove: (e, gestureState) => {
        // Update position
        translateY.setValue(gestureState.dy);

        // Calcular tiempo en minutos equivalente al desplazamiento
        const hourDuration = Math.max(
          1,
          event.end.getHours() -
            event.start.getHours() +
            (event.end.getMinutes() - event.start.getMinutes()) / 60
        );
        const pixelsPerMinute = eventHeight / (hourDuration * 60);
        const minuteDiff = Math.round(gestureState.dy / pixelsPerMinute);

        // Mostrar previsualización si hay cualquier movimiento
        if (Math.abs(gestureState.dy) > 5) {
          const newPreviewPosition = calculatePreviewPosition(minuteDiff);
          setPreviewPosition(newPreviewPosition);
        } else {
          setPreviewPosition(null);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
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
        if (Math.abs(gestureState.dy) > 10 && onEventUpdate) {
          // Calculate time difference based on movement
          const hourDuration = Math.max(
            1,
            event.end.getHours() -
              event.start.getHours() +
              (event.end.getMinutes() - event.start.getMinutes()) / 60
          );
          const pixelsPerMinute = eventHeight / (hourDuration * 60);
          const minuteDiff = Math.round(gestureState.dy / pixelsPerMinute);

          if (minuteDiff !== 0) {
            const newStart = new Date(event.start);
            newStart.setMinutes(newStart.getMinutes() + minuteDiff);

            const newEnd = new Date(event.end);
            newEnd.setMinutes(newEnd.getMinutes() + minuteDiff);

            // Verificar si la nueva posición está en un rango no disponible
            if (isTimeSlotUnavailable(newStart)) {
              // Si el destino no está disponible, aplicar feedback háptico de error
              if (hapticOptions?.enabled && hapticOptions.error) {
                try {
                  require("expo-haptics").notificationAsync(
                    require("expo-haptics").NotificationFeedbackType.Error
                  );
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
              logger.debug("Event move rejected - unavailable time slot", {
                eventId: event.id,
                newStart,
              });
            } else {
              logger.debug("Event moved", {
                eventId: event.id,
                minuteDiff,
                newStart,
                newEnd,
              });

              // Update event
              onEventUpdate({
                ...event,
                start: newStart,
                end: newEnd,
              });
            }
          }
        }

        // Reset translation
        translateY.setValue(0);
        setIsResizing(false);
      },
    })
  ).current;

  // Handler for event press
  const handleEventPress = useCallback(() => {
    logger.debug("Event pressed", { eventId: event.id });
    onEventPress?.(event);
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
  }, [event, onEventPress, scaleAnim]);

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

  return (
    <>
      {/* Indicador de destino cuando se arrastra el evento */}
      {previewPosition !== null && (
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
              top: previewPosition,
              height: eventHeight,
              opacity: 0.7,
              zIndex: 5,
            },
          ]}
        >
          <View style={styles.previewContent}>
            <Text
              style={[
                styles.previewTitle,
                {
                  fontSize: width < 70 ? 9 : 12,
                  color: isTargetUnavailable ? "#FFFFFF" : "#333333",
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isTargetUnavailable ? "Hora no disponible" : event.title}
            </Text>
            {eventHeight >= 40 && width >= 60 && !isTargetUnavailable && (
              <Text
                style={[styles.previewTime, { fontSize: width < 80 ? 8 : 10 }]}
                numberOfLines={1}
              >
                {eventTimeText}
              </Text>
            )}
          </View>
        </Animated.View>
      )}

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
            zIndex: isPressed ? 20 : 10, // Aumentar z-index cuando está seleccionado
            opacity: width < 60 ? 0.9 : 1, // Ligera transparencia para eventos estrechos
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
                fontSize: width < 70 ? 9 : 12, // Reducir tamaño de texto en eventos estrechos
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>

          {eventHeight >= 40 && width >= 60 && (
            <Text
              style={[
                styles.time,
                { color: textColor, fontSize: width < 80 ? 8 : 10 },
              ]}
              numberOfLines={1}
            >
              {eventTimeText}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.resizeHandle} />
      </Animated.View>
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
