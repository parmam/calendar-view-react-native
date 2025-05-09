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
import { formatTime } from "./utils";
import { CalendarEvent } from "./types";
import { useLogger } from "./utils/logger";

interface EventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
}

const Event: React.FC<EventProps> = ({
  event,
  width,
  left,
  isResizing,
  setIsResizing,
}) => {
  // Initialize logger
  const logger = useLogger("Event");

  const { onEventPress, onEventUpdate, theme, locale, hapticOptions } =
    useCalendar();
  const [eventHeight, setEventHeight] = useState(0);

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  // Pan responder for dragging the event
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => !isResizing,
      onPanResponderGrant: () => {
        setIsResizing(true);
        logger.debug("Event drag started", { eventId: event.id });

        // Highlight the event when being dragged
        Animated.timing(scaleAnim, {
          toValue: 1.05,
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

        // Handle the event update
        if (Math.abs(gestureState.dy) > 10 && onEventUpdate) {
          // Calculate time difference based on movement
          const pixelsPerMinute =
            eventHeight /
            (60 * (event.end.getHours() - event.start.getHours()));
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

  // Handle layout change to get the event height
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (eventHeight === 0) {
        setEventHeight(e.nativeEvent.layout.height);
      }
    },
    [eventHeight]
  );

  // Handler for event press
  const handleEventPress = useCallback(() => {
    logger.debug("Event pressed", { eventId: event.id });
    onEventPress?.(event);

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
    ]).start();
  }, [event, onEventPress, scaleAnim]);

  // Format event times
  const eventTimeText = `${formatTime(event.start, locale)} - ${formatTime(
    event.end,
    locale
  )}`;

  // Background color based on the event color or default color
  const backgroundColor = event.color || theme.eventColors[0];

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor,
          width,
          left,
          borderLeftWidth: 3,
          borderLeftColor: backgroundColor,
          transform: [{ translateY: translateY }, { scale: scaleAnim }],
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
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {event.title}
        </Text>

        <Text style={styles.time} numberOfLines={1}>
          {eventTimeText}
        </Text>
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
    elevation: 2,
    flexDirection: "column",
  },
  contentContainer: {
    flex: 1,
    padding: 4,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  time: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  resizeHandle: {
    height: 3,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default Event;
