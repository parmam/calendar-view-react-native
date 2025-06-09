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
const HOUR_HEIGHT = 60;

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
  } = useCalendar();

  const [gridWidth, setGridWidth] = useState(SCREEN_WIDTH - TIME_LABEL_WIDTH);

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

    const top = (startHour - timeRange.start) * HOUR_HEIGHT * zoomLevel;
    const height = (endHour - startHour) * HOUR_HEIGHT * zoomLevel;

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
        });
      });
    }

    return positioned;
  };

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
          onEventUpdate={onEventUpdate}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          height: hours.length * HOUR_HEIGHT * zoomLevel,
        }}
      >
        <View style={styles.timeGrid}>
          {/* Time labels */}
          <View style={[styles.timeLabelsContainer, { width: TIME_LABEL_WIDTH }]}>
            {hours.map(hour => (
              <View
                key={`time-${hour}`}
                style={[styles.timeLabel, { height: HOUR_HEIGHT * zoomLevel }]}
              >
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
                      top: (hour - timeRange.start) * HOUR_HEIGHT * zoomLevel,
                      borderTopColor: theme.gridLineColor,
                    },
                  ]}
                />
              ))}
            </View>

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
                        top: (hour - timeRange.start) * HOUR_HEIGHT * zoomLevel,
                        height: HOUR_HEIGHT * zoomLevel,
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
