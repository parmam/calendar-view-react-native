import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
  const { onEventPress, theme, locale, hourHeight, timeInterval } = useCalendar();
  const logger = useLogger('DraggableEvent');
  const [isValidDrop, setIsValidDrop] = useState(true);

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
        deltaX,
        deltaY,
        minuteDiff,
        dayDiff,
        isValid,
      });
    },
    [event.start, hourHeight, timeInterval, columnWidth, logger]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!onEventUpdate || !isValidDrop) {
        logger.debug('Drag cancelled', { isValidDrop });
        return;
      }

      // Calculate time difference
      const minutesPerPixel = 60 / hourHeight;
      const minuteDiff = Math.round((deltaY * minutesPerPixel) / timeInterval) * timeInterval;

      // Calculate day difference
      const dayDiff = Math.round(deltaX / columnWidth);

      if (minuteDiff === 0 && dayDiff === 0) {
        logger.debug('No change in position');
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

      logger.debug('Event updated', {
        eventId: event.id,
        oldStart: event.start,
        newStart: updatedEvent.start,
        minuteDiff,
        dayDiff,
      });

      onEventUpdate(updatedEvent);
    },
    [event, onEventUpdate, isValidDrop, hourHeight, timeInterval, columnWidth, logger]
  );

  // Initialize draggable
  const { panHandlers, animatedStyle, isDragging, onLayout } = useDraggableEvent({
    event,
    hourHeight,
    timeInterval,
    columnWidth,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  });

  const handlePress = () => {
    if (!isDragging) {
      onEventPress?.(event);
    }
  };

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
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity style={styles.touchable} onPress={handlePress} activeOpacity={0.8}>
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
