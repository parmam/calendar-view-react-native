import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useCalendar } from "./CalendarContext";
import { addDays, getWeekDates, isSameDay, isToday, getDayName } from "./utils";
import { CalendarEvent } from "./types";

const AllDayEvents: React.FC = () => {
  const {
    selectedDate,
    events,
    theme,
    viewType,
    firstDayOfWeek,
    visibleDays,
    onEventPress,
  } = useCalendar();

  // Calculate dates to display based on view type
  const dates = useMemo(() => {
    switch (viewType) {
      case "day":
        return [selectedDate];
      case "3day": {
        const result = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() + i);
          result.push(date);
        }
        return result;
      }
      case "week":
        return getWeekDates(selectedDate, firstDayOfWeek).filter((_, i) =>
          visibleDays.includes(i)
        );
      case "workWeek":
        // Solo mostrar días laborables (lunes a viernes)
        return getWeekDates(selectedDate, 1).slice(0, 5);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  // Filter all-day events
  const allDayEvents = useMemo(() => {
    return events.filter((event) => event.isAllDay);
  }, [events]);

  // Find events for each date
  const eventsByDate = useMemo(() => {
    const result: Record<string, CalendarEvent[]> = {};

    dates.forEach((date) => {
      const dateStr = date.toISOString().split("T")[0];
      result[dateStr] = allDayEvents.filter((event) =>
        isSameDay(event.start, date)
      );
    });

    return result;
  }, [dates, allDayEvents]);

  // Check if we have any all-day events
  const hasAllDayEvents = useMemo(() => {
    return Object.values(eventsByDate).some((events) => events.length > 0);
  }, [eventsByDate]);

  // If no all-day events, don't render anything
  if (!hasAllDayEvents) {
    return null;
  }

  // Calculate max number of events for any day
  const maxEvents = Math.max(
    ...Object.values(eventsByDate).map((events) => events.length)
  );

  // Limit display to reasonable number
  const displayLimit = Math.min(maxEvents, 3);

  // Render event for a specific date and row
  const renderEvent = (date: Date, rowIndex: number) => {
    const dateStr = date.toISOString().split("T")[0];
    const events = eventsByDate[dateStr] || [];
    const event = events[rowIndex];

    if (!event) {
      return <View style={styles.emptyEvent} />;
    }

    return (
      <TouchableOpacity
        style={[
          styles.event,
          {
            backgroundColor: event.color || theme.eventColors[0],
            borderWidth: 1,
            borderColor: `${event.color || theme.eventColors[0]}80`, // 50% transparency
          },
        ]}
        onPress={() => onEventPress?.(event)}
      >
        <Text style={styles.eventText} numberOfLines={1}>
          {event.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.gridLineColor,
          borderLeftWidth: 1,
          borderLeftColor: theme.gridLineColor,
          borderRightWidth: 1,
          borderRightColor: theme.gridLineColor,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.gridLineColor, borderBottomWidth: 1 },
        ]}
      >
        <Text style={[styles.headerText, { color: theme.secondaryColor }]}>
          Todo el día
        </Text>
      </View>
      <View style={styles.content}>
        {/* Column headers for weekdays */}
        <View style={styles.dayHeaderRow}>
          {dates.map((date, index) => (
            <View
              key={index}
              style={[
                styles.dayHeader,
                index < dates.length - 1 && {
                  borderRightWidth: 1,
                  borderRightColor: theme.gridLineColor,
                },
                isToday(date) && {
                  backgroundColor: theme.selectedDayColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: theme.textColor },
                  isToday(date) && { fontWeight: "bold" },
                ]}
              >
                {getDayName(date, "es-ES", true)}
              </Text>
            </View>
          ))}
        </View>

        {/* Events grid */}
        <View style={styles.eventsGrid}>
          {Array.from({ length: displayLimit }).map((_, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.eventRow,
                rowIndex < displayLimit - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.gridLineColor,
                },
              ]}
            >
              {dates.map((date, colIndex) => (
                <View
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.eventCell,
                    colIndex < dates.length - 1 && {
                      borderRightWidth: 1,
                      borderRightColor: theme.gridLineColor,
                    },
                  ]}
                >
                  {renderEvent(date, rowIndex)}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Show +more if there are more events than we display */}
        {maxEvents > displayLimit && (
          <View
            style={[styles.moreRow, { borderTopColor: theme.gridLineColor }]}
          >
            <Text style={[styles.moreText, { color: theme.secondaryColor }]}>
              +{maxEvents - displayLimit} más
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    padding: 4,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    marginBottom: 1,
  },
  dayHeaderRow: {
    flexDirection: "row",
    height: 20,
  },
  dayHeader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  eventsGrid: {},
  eventRow: {
    flexDirection: "row",
    height: 24,
  },
  eventCell: {
    flex: 1,
    padding: 2,
  },
  event: {
    flex: 1,
    borderRadius: 2,
    padding: 2,
    justifyContent: "center",
  },
  eventText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  emptyEvent: {
    flex: 1,
  },
  moreRow: {
    borderTopWidth: 1,
    padding: 2,
    alignItems: "center",
  },
  moreText: {
    fontSize: 10,
  },
});

export default AllDayEvents;
