import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useCalendar } from './CalendarContext';
import { formatTime } from './utils';
import { CalendarEvent } from './types';
import { useDraggableEvent } from './hooks/useDraggableEvent';
import { useLogger } from './utils/logger';

interface DraggableEventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  top: number;
  height: number;
  columnWidth: number;
  dayIndex: number;
  onEventUpdate?: (event: CalendarEvent) => void;
}

const DraggableEvent: React.FC<DraggableEventProps> = ({
  event,
  width,
  left,
  top,
  height,
  columnWidth,
  dayIndex,
  onEventUpdate,
}) => {
  const { onEventPress, theme, locale, hourHeight, timeInterval, showTimeChangeConfirmation } =
    useCalendar();

  const logger = useLogger('DraggableEvent');
  const [isValidDrop, setIsValidDrop] = useState(true);

  // Explicitly ensure isDraggable is set
  const eventWithDraggable = {
    ...event,
    isDraggable: event.isDraggable !== false,
  };

  // Log on mount
  useEffect(() => {
    logger.debug(
      `DraggableEvent mounted: ${event.id}, dragEnabled: ${eventWithDraggable.isDraggable}`
    );
    return () => {
      logger.debug(`DraggableEvent unmounted: ${event.id}`);
    };
  }, [event.id, eventWithDraggable.isDraggable, logger]);

  // Calculate text color based on background
  const getTextColor = (bg: string): string => {
    try {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000' : '#FFF';
    } catch {
      return '#FFF';
    }
  };

  const backgroundColor = event.color || theme.primaryColor;
  const textColor = getTextColor(backgroundColor);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    logger.debug('Drag started', { eventId: event.id });
  }, [event.id, logger]);

  // Handle drag move
  const handleDragMove = useCallback(
    (deltaX: number, deltaY: number) => {
      // Calculate time difference
      const minutesPerPixel = 60 / hourHeight;
      const minuteDiff = Math.round((deltaY * minutesPerPixel) / timeInterval) * timeInterval;

      // Calculate day difference
      const dayDiff = Math.round(deltaX / columnWidth);

      // Validate the new position
      const newStart = new Date(event.start);
      newStart.setMinutes(newStart.getMinutes() + minuteDiff);

      // Simple validation: check if within reasonable hours
      const hours = newStart.getHours();
      const isValid = hours >= 6 && hours <= 22; // 6 AM to 10 PM
      setIsValidDrop(isValid);

      logger.debug('Drag move', {
        eventId: event.id,
        deltaX,
        deltaY,
        minuteDiff,
        dayDiff,
        isValid,
      });
    },
    [event.id, event.start, hourHeight, timeInterval, columnWidth, logger]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (deltaX: number, deltaY: number) => {
      logger.debug('Drag end reached', {
        eventId: event.id,
        deltaX,
        deltaY,
        isValidDrop,
        hasUpdateHandler: !!onEventUpdate,
      });

      if (!isValidDrop) {
        logger.debug('Drag cancelled - invalid drop position', { eventId: event.id });
        return;
      }

      // Calculate time difference
      const minutesPerPixel = 60 / hourHeight;
      const minuteDiff = Math.round((deltaY * minutesPerPixel) / timeInterval) * timeInterval;

      // Calculate day difference
      const dayDiff = Math.round(deltaX / columnWidth);

      if (minuteDiff === 0 && dayDiff === 0) {
        logger.debug('No change in position', { eventId: event.id });
        return;
      }

      // Create updated event
      const newStart = new Date(event.start);
      const newEnd = new Date(event.end);

      // Apply time change
      newStart.setMinutes(newStart.getMinutes() + minuteDiff);
      newEnd.setMinutes(newEnd.getMinutes() + minuteDiff);

      // Apply day change if needed
      if (dayDiff !== 0) {
        newStart.setDate(newStart.getDate() + dayDiff);
        newEnd.setDate(newEnd.getDate() + dayDiff);
      }

      const updatedEvent: CalendarEvent = {
        ...event,
        start: newStart,
        end: newEnd,
      };

      logger.debug('Event position changed', {
        eventId: event.id,
        oldStart: event.start.toISOString(),
        newStart: updatedEvent.start.toISOString(),
        minuteDiff,
        dayDiff,
      });

      // Show confirmation modal if available
      if (showTimeChangeConfirmation) {
        logger.debug('Showing confirmation modal', { eventId: event.id });
        showTimeChangeConfirmation(event, newStart, newEnd);
      } else if (onEventUpdate) {
        // Directly update if no confirmation available
        logger.debug('Directly updating event (no confirmation)', { eventId: event.id });
        onEventUpdate(updatedEvent);
      }
    },
    [
      event,
      onEventUpdate,
      isValidDrop,
      hourHeight,
      timeInterval,
      columnWidth,
      logger,
      showTimeChangeConfirmation,
    ]
  );

  // Initialize draggable
  const { panHandlers, animatedStyle, isDragging, onLayout } = useDraggableEvent({
    event: eventWithDraggable,
    hourHeight,
    timeInterval,
    columnWidth,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  });

  const handlePress = useCallback(() => {
    logger.debug('Event pressed', { eventId: event.id });
    if (!isDragging) {
      onEventPress?.(event);
    }
  }, [event, isDragging, onEventPress, logger]);

  // Log when component renders to help debug
  logger.debug('DraggableEvent rendering', {
    eventId: event.id,
    isDraggable: eventWithDraggable.isDraggable,
    title: event.title,
    size: { width, height },
    position: { left, top },
  });

  return (
    <Animated.View
      {...panHandlers}
      onLayout={onLayout}
      style={[
        styles.container,
        {
          position: 'absolute',
          width,
          left,
          top,
          height,
          backgroundColor,
          borderWidth: !isValidDrop && isDragging ? 2 : 0,
          borderColor: theme.errorColor,
          zIndex: isDragging ? 999 : 1,
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={isDragging} // Disable touch when dragging
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.time, { color: textColor }]} numberOfLines={1}>
            {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  touchable: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  time: {
    fontSize: 10,
    opacity: 0.8,
  },
});

export default DraggableEvent;
