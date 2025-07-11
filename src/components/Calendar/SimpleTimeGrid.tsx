import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useCalendar } from './CalendarContext';
import DraggableEvent from './DraggableEvent';
import { CalendarEvent, CalendarViewType } from './types';
import {
  formatTime,
  getWeekDates,
  filterEventsByDay,
  isToday,
  groupOverlappingEvents,
} from './utils';
import { useLogger } from './utils/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIME_LABEL_WIDTH = 50;

interface SimpleTimeGridProps {
  viewType: CalendarViewType;
  onEventUpdate?: (event: CalendarEvent) => void;
}

const SimpleTimeGrid: React.FC<SimpleTimeGridProps> = ({ viewType, onEventUpdate }) => {
  const logger = useLogger('SimpleTimeGrid');
  const {
    selectedDate,
    events,
    timeRange,
    theme,
    locale,
    firstDayOfWeek,
    visibleDays,
    onTimeSlotPress,
    zoomLevel,
    showTimeChangeConfirmation,
    calendarConfig,
    timeInterval,
    hourHeight, // Base height
    zoomedHourHeight, // Scaled height
  } = useCalendar();

  const [gridWidth, setGridWidth] = useState(SCREEN_WIDTH - TIME_LABEL_WIDTH);

  // Get drag precision from config (default to timeInterval if not specified)
  const dragPrecision = calendarConfig?.dragPrecision || timeInterval || 15; // Default to 15 minutes if nothing else available

  // Generate hours
  const hours = useMemo(() => {
    const result = [];
    for (let hour = timeRange.start; hour < timeRange.end; hour++) {
      result.push(hour);
    }
    return result;
  }, [timeRange]);

  // Calculate dates to display
  const dates = useMemo(() => {
    switch (viewType) {
      case 'day':
        return [selectedDate];
      case '3day':
        return Array.from({ length: 3 }, (_, i) => {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() + i);
          return date;
        });
      case 'week':
        return getWeekDates(selectedDate, firstDayOfWeek).filter((_, i) => visibleDays.includes(i));
      case 'workWeek':
        return getWeekDates(selectedDate, 1).slice(0, 5);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  const columnWidth = useMemo(() => gridWidth / dates.length, [gridWidth, dates.length]);

  // Handle grid layout
  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setGridWidth(width);
  }, []);

  // Handle time slot press
  const handleTimeSlotPress = useCallback(
    (date: Date, hour: number, minutes: number) => {
      if (!onTimeSlotPress) return;

      const start = new Date(date);
      start.setHours(hour, minutes, 0, 0);

      const end = new Date(start);
      end.setHours(hour + 1, minutes, 0, 0);

      logger.debug('Time slot pressed', { start, end });
      onTimeSlotPress(start, end);
    },
    [onTimeSlotPress, logger]
  );

  // Get event position
  const getEventPosition = (event: CalendarEvent) => {
    const startHour = event.start.getHours() + event.start.getMinutes() / 60;
    const endHour = event.end.getHours() + event.end.getMinutes() / 60;

    const top = (startHour - timeRange.start) * zoomedHourHeight;
    const height = (endHour - startHour) * zoomedHourHeight;

    return { top, height: Math.max(height, 20) };
  };

  // Position events with overlap handling
  const positionEvents = (dayEvents: CalendarEvent[]) => {
    if (!dayEvents.length) return [];

    const groups = groupOverlappingEvents(dayEvents);
    const positioned: Array<CalendarEvent & { left: number; width: number }> = [];

    for (const group of groups) {
      const groupWidth = columnWidth / group.length;
      group.forEach((event, index) => {
        positioned.push({
          ...event,
          left: index * groupWidth + 2,
          width: groupWidth - 4,
          isDraggable: true,
        });
      });
    }

    logger.debug(`Positioned ${positioned.length} events for rendering`);
    return positioned;
  };

  // Handle event update with confirmation
  const handleEventUpdate = useCallback(
    (updatedEvent: CalendarEvent) => {
      if (showTimeChangeConfirmation) {
        // Use the confirmation modal
        showTimeChangeConfirmation(updatedEvent, updatedEvent.start, updatedEvent.end);
        logger.debug('Showing confirmation modal for event update', {
          eventId: updatedEvent.id,
          newStart: updatedEvent.start,
          newEnd: updatedEvent.end,
        });
      } else {
        // Directly update if no confirmation modal available
        onEventUpdate?.(updatedEvent);
      }
    },
    [onEventUpdate, showTimeChangeConfirmation, logger]
  );

  // Render events for a day
  const renderEvents = (dayIndex: number) => {
    const date = dates[dayIndex];
    const dayEvents = filterEventsByDay(events, date);
    const positionedEvents = positionEvents(dayEvents);

    return positionedEvents.map(event => {
      const { top, height } = getEventPosition(event);

      return (
        <DraggableEvent
          key={event.id}
          event={event}
          top={top}
          left={event.left}
          width={event.width}
          height={height}
          columnWidth={columnWidth}
          dayIndex={dayIndex}
          onEventUpdate={handleEventUpdate}
          dragPrecision={dragPrecision}
        />
      );
    });
  };

  // Render vertical dividers between columns
  const renderColumnDividers = () => {
    // Don't render dividers for day view
    if (viewType === 'day') return null;

    return dates.map((_, index) => {
      // Skip the first divider (left edge)
      if (index === 0) return null;

      return (
        <View
          key={`divider-${index}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: index * columnWidth,
            width: 1,
            backgroundColor: theme.gridLineColor,
            zIndex: 1,
          }}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          height: hours.length * zoomedHourHeight,
        }}
      >
        <View style={styles.timeGrid}>
          {/* Time labels */}
          <View style={[styles.timeLabelsContainer, { width: TIME_LABEL_WIDTH }]}>
            {hours.map(hour => (
              <View key={`time-${hour}`} style={[styles.timeLabel, { height: zoomedHourHeight }]}>
                <Text style={[styles.timeLabelText, { color: theme.textColor }]}>
                  {formatTime(new Date(new Date().setHours(hour, 0, 0, 0)), locale)}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid container */}
          <View style={styles.gridContainer} onLayout={onGridLayout}>
            {/* Grid lines */}
            <View style={styles.gridLinesContainer}>
              {hours.map(hour => (
                <View
                  key={`line-${hour}`}
                  style={[
                    styles.gridLine,
                    {
                      top: (hour - timeRange.start) * zoomedHourHeight,
                      borderTopColor: theme.gridLineColor,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Column dividers */}
            {renderColumnDividers()}

            {/* Day columns */}
            {dates.map((date, dayIndex) => (
              <View
                key={`day-${dayIndex}`}
                style={[
                  styles.dayColumn,
                  {
                    width: columnWidth,
                    left: dayIndex * columnWidth,
                    backgroundColor: isToday(date) ? theme.selectedDayColor : 'transparent',
                  },
                ]}
              >
                {/* Events */}
                {renderEvents(dayIndex)}

                {/* Time slots */}
                {hours.map(hour => (
                  <TouchableOpacity
                    key={`slot-${hour}`}
                    style={[
                      styles.timeSlot,
                      {
                        top: (hour - timeRange.start) * zoomedHourHeight,
                        height: zoomedHourHeight,
                      },
                    ]}
                    onPress={() => handleTimeSlotPress(date, hour, 0)}
                    activeOpacity={0.1}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  timeLabelsContainer: {
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  timeLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gridContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLinesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  dayColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  timeSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export default SimpleTimeGrid;
