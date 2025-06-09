import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCalendar } from './CalendarContext';
import { formatTime } from './utils';
import { CalendarEvent } from './types';

interface EventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  top: number;
  height: number;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
  onEventDragWithSnap?: (event: CalendarEvent, minuteDiff: number, snapTime: Date) => boolean;
  onEventDragEnd?: () => void;
  onDragNearEdge?: (distanceFromEdge: number, direction: 'up' | 'down') => void;
  onEventDropped?: (event: CalendarEvent, minuteDiff: number, dayDiff: number) => void;
  viewHeight?: number;
  scrollPosition: { x: number; y: number };
  columnWidth?: number;
  dayIndex?: number;
  dates?: Date[];
  viewType?: string;
}

const Event: React.FC<EventProps> = ({ event, width, left, top, height }) => {
  const { onEventPress, theme, locale } = useCalendar();

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

  const handlePress = () => {
    onEventPress?.(event);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          position: 'absolute',
          width,
          left,
          top,
          height,
          backgroundColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
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

export default Event;
