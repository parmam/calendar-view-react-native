import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  dragPrecision?: number; // Optional drag precision in minutes
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
  dragPrecision,
}) => {
  const {
    onEventPress,
    theme,
    locale,
    hourHeight, // Keep for base calculation if needed, or remove if unused
    zoomedHourHeight, // Use this for all pixel calculations
    timeInterval,
    showTimeChangeConfirmation,
    calendarConfig,
    timeRange,
  } = useCalendar();

  const logger = useLogger('DraggableEvent');
  const [isValidDrop, setIsValidDrop] = useState(true);
  const [targetLine, setTargetLine] = useState<{
    visible: boolean;
    position: number;
    dayDiff: number;
  } | null>(null);

  // Get drag precision from config (default to timeInterval if not specified)
  const dragPrecisionFromConfig = dragPrecision || calendarConfig?.dragPrecision || timeInterval;

  // Explicitly ensure isDraggable is set
  const eventWithDraggable = {
    ...event,
    isDraggable: event.isDraggable !== false,
  };

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

  const handleDragStart = useCallback(() => {
    logger.debug('Drag started', { eventId: event.id });
    setTargetLine(null);
  }, [event.id, logger]);

  // Use a ref to hold the drag handlers to break the circular dependency
  const dragHandlersRef = useRef({
    onDragMove: (dx: number, dy: number) => {
      /* Placeholder, will be implemented by useEffect */
    },
    onDragEnd: (dx: number, dy: number) => {
      /* Placeholder, will be implemented by useEffect */
    },
  });

  // Initialize draggable hook
  const { pan, panHandlers, animatedStyle, isDragging, onLayout } = useDraggableEvent({
    event: eventWithDraggable,
    hourHeight: zoomedHourHeight,
    columnWidth,
    onDragStart: handleDragStart,
    onDragMove: (dx, dy) => dragHandlersRef.current.onDragMove(dx, dy),
    onDragEnd: (dx, dy) => dragHandlersRef.current.onDragEnd(dx, dy),
  });

  // Define the drag move handler
  const handleDragMove = useCallback(
    (deltaX: number, deltaY: number) => {
      const dayDiff = Math.round(deltaX / columnWidth);
      const minutesPerPixel = 60 / zoomedHourHeight;
      const startHour = event.start.getHours();
      const startMinute = event.start.getMinutes();
      const originalMinutes = startHour * 60 + startMinute;
      const rawMinuteDiff = deltaY * minutesPerPixel;
      const newTotalMinutes = originalMinutes + rawMinuteDiff;
      const snappedTotalMinutes =
        Math.round(newTotalMinutes / dragPrecisionFromConfig) * dragPrecisionFromConfig;
      const newHours = Math.floor(snappedTotalMinutes / 60);
      const newMinutes = snappedTotalMinutes % 60;
      const snappedMinuteDiff = snappedTotalMinutes - originalMinutes;
      const snappedDy = (snappedMinuteDiff * zoomedHourHeight) / 60;

      pan.setValue({ x: deltaX, y: snappedDy });

      const newStart = new Date(event.start);
      newStart.setHours(newHours, newMinutes, 0, 0);

      const isValid = newHours >= 6 && newHours <= 22;
      setIsValidDrop(isValid);

      // Calculate exact position for the target line
      if (isValid && calendarConfig?.dragPreviewConfig?.showTargetLine) {
        // The target line's position must be relative to the event's container,
        // just like the event's drag position.
        // `top` is the original position, and `snappedDy` is the drag offset.
        setTargetLine({
          visible: true,
          position: top + snappedDy, // Use original top + snapped offset
          dayDiff: dayDiff,
        });
      } else {
        setTargetLine(null);
      }

      logger.debug('Drag move', {
        eventId: event.id,
        deltaX,
        rawDeltaY: deltaY,
        snappedDy,
        newHours,
        newMinutes,
        snappedTime: `${newHours}:${newMinutes.toString().padStart(2, '0')}`,
        isValid,
        dragPrecision: dragPrecisionFromConfig,
        dayDiff,
      });
    },
    [
      event.id,
      event.start,
      zoomedHourHeight,
      columnWidth,
      logger,
      dragPrecisionFromConfig,
      dayIndex,
      calendarConfig,
      timeRange,
      pan,
      top, // Added top to dependency array
    ]
  );

  // Define the drag end handler
  const handleDragEnd = useCallback(
    (deltaX: number, deltaY: number) => {
      logger.debug('Drag end reached', {
        eventId: event.id,
        deltaX,
        deltaY,
        isValidDrop,
        hasUpdateHandler: !!onEventUpdate,
      });

      setTargetLine(null);

      if (!isValidDrop) {
        logger.debug('Drag cancelled - invalid drop position', { eventId: event.id });
        return;
      }

      const dayDiff = Math.round(deltaX / columnWidth);
      const minutesPerPixel = 60 / zoomedHourHeight;
      const startHour = event.start.getHours();
      const startMinute = event.start.getMinutes();
      const rawMinuteDiff = deltaY * minutesPerPixel;
      const originalMinutes = startHour * 60 + startMinute;
      const newTotalMinutes = originalMinutes + rawMinuteDiff;
      const snappedTotalMinutes =
        Math.round(newTotalMinutes / dragPrecisionFromConfig) * dragPrecisionFromConfig;
      const newHours = Math.floor(snappedTotalMinutes / 60);
      const newMinutes = snappedTotalMinutes % 60;

      if (newHours === startHour && newMinutes === startMinute && dayDiff === 0) {
        logger.debug('No change in position', { eventId: event.id });
        return;
      }

      const newStart = new Date(event.start);
      const newEnd = new Date(event.end);
      const durationMinutes = (event.end.getTime() - event.start.getTime()) / (60 * 1000);

      // --- Corrected Date Logic ---
      // 1. First, apply the day change.
      if (dayDiff !== 0) {
        newStart.setDate(newStart.getDate() + dayDiff);
        newEnd.setDate(newEnd.getDate() + dayDiff);
      }

      // 2. Then, set the time on the correct date.
      newStart.setHours(newHours, newMinutes, 0, 0);

      const newEndTotalMinutes = snappedTotalMinutes + durationMinutes;
      const newEndHours = Math.floor(newEndTotalMinutes / 60);
      const newEndMinutes = newEndTotalMinutes % 60;
      newEnd.setHours(newEndHours, newEndMinutes, 0, 0);

      const updatedEvent: CalendarEvent = {
        ...event,
        start: newStart,
        end: newEnd,
      };

      logger.debug('Event position changed', {
        eventId: event.id,
        oldStart: event.start.toISOString(),
        newStart: updatedEvent.start.toISOString(),
        oldEnd: event.end.toISOString(),
        newEnd: updatedEvent.end.toISOString(),
        snappedTime: `${newHours}:${newMinutes.toString().padStart(2, '0')}`,
        dayDiff,
      });

      if (showTimeChangeConfirmation) {
        logger.debug('Showing confirmation modal', { eventId: event.id });
        showTimeChangeConfirmation(event, newStart, newEnd);
      } else if (onEventUpdate) {
        logger.debug('Directly updating event (no confirmation)', { eventId: event.id });
        onEventUpdate(updatedEvent);
      }
    },
    [
      event,
      onEventUpdate,
      isValidDrop,
      hourHeight,
      zoomedHourHeight,
      dragPrecisionFromConfig,
      columnWidth,
      logger,
      showTimeChangeConfirmation,
    ]
  );

  // Update the ref with the latest handlers
  useEffect(() => {
    dragHandlersRef.current.onDragMove = handleDragMove;
    dragHandlersRef.current.onDragEnd = handleDragEnd;
  }, [handleDragMove, handleDragEnd]);

  const handlePress = useCallback(() => {
    logger.debug('Event pressed', { eventId: event.id });
    if (!isDragging) {
      onEventPress?.(event);
    }
  }, [event, isDragging, onEventPress, logger]);

  // Target line settings from config
  const targetLineHeight = calendarConfig?.dragPreviewConfig?.targetLineHeight || 2;
  const targetLineColor = calendarConfig?.dragPreviewConfig?.targetLineColor || theme.successColor;

  return (
    <>
      {/* Target line indicator - only show in the target column */}
      {isDragging && targetLine?.visible && (
        <View
          style={{
            position: 'absolute',
            left: left + targetLine.dayDiff * columnWidth, // Adjust position based on day difference
            top: targetLine.position,
            width: width,
            height: targetLineHeight,
            backgroundColor: targetLineColor,
            zIndex: 998,
          }}
        />
      )}

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
    </>
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
