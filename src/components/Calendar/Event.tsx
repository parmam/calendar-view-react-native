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

  const { onEventPress, onEventUpdate, theme, locale, hapticOptions } =
    useCalendar();
  const [eventHeight, setEventHeight] = useState(height);
  const [isPressed, setIsPressed] = useState(false);

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
      },
      onPanResponderMove: (e, gestureState) => {
        // Update position
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (e, gestureState) => {
        // Reset the animation
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();

        setIsPressed(false);

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
