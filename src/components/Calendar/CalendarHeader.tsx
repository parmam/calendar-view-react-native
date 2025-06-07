import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import {
  formatDate,
  formatMonth,
  formatYear,
  getDayName,
  getWeekDates,
  isToday,
} from "./utils";
import { useCalendar } from "./CalendarContext";
import { CalendarViewType } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons";

// Ensure this matches the TIME_LABEL_WIDTH in TimeGrid.tsx
const TIME_LABEL_WIDTH = 50;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CalendarHeaderProps {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewTypeChange: (viewType: CalendarViewType) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  onPrevious,
  onNext,
  onToday,
  onViewTypeChange,
}) => {
  const {
    viewType,
    selectedDate,
    theme,
    locale,
    firstDayOfWeek,
    visibleDays,
    setSelectedDate,
  } = useCalendar();

  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  // Get the dates to display based on the view type
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
        // Mostrar solo días laborables (lunes a viernes)
        return getWeekDates(selectedDate, 1).slice(0, 5);
      case "month":
        return getWeekDates(selectedDate, firstDayOfWeek);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  // Format the date range or month for display
  const formattedPeriod = useMemo(() => {
    const month = formatMonth(selectedDate, locale);
    const year = formatYear(selectedDate, locale);

    switch (viewType) {
      case "month":
        // For month view, just return the month name and year
        return { primary: month, secondary: year };
      case "day":
        return {
          primary: formatDate(selectedDate, locale),
          secondary: `${month}, ${year}`,
        };
      case "3day":
      case "week":
      case "workWeek":
        if (dates.length > 0) {
          const firstDate = dates[0];
          const lastDate = dates[dates.length - 1];

          // If same month
          if (firstDate.getMonth() === lastDate.getMonth()) {
            return {
              primary: `${formatDate(firstDate, locale)} - ${formatDate(
                lastDate,
                locale
              )}`,
              secondary: `${month}, ${year}`,
            };
          }
          // If different months but same year
          else if (firstDate.getFullYear() === lastDate.getFullYear()) {
            return {
              primary: `${formatMonth(firstDate, locale)} ${formatDate(
                firstDate,
                locale
              )} - ${formatMonth(lastDate, locale)} ${formatDate(
                lastDate,
                locale
              )}`,
              secondary: year,
            };
          }
          // If different years
          else {
            return {
              primary: `${formatMonth(firstDate, locale)} - ${formatMonth(
                lastDate,
                locale
              )}`,
              secondary: `${formatYear(firstDate, locale)} - ${formatYear(
                lastDate,
                locale
              )}`,
            };
          }
        }
        return { primary: "", secondary: "" };
      default:
        return {
          primary: `${month} ${formatDate(selectedDate, locale)}`,
          secondary: year,
        };
    }
  }, [viewType, selectedDate, dates, locale]);

  // Get view type labels based on locale
  const viewTypeLabels = useMemo(() => {
    const isSpanish = locale.startsWith("es");
    return {
      day: isSpanish ? "Día" : "Day",
      threeDays: isSpanish ? "3 Días" : "3 Days",
      week: isSpanish ? "Semana" : "Week",
      workWeek: isSpanish ? "L-V" : "M-F",
      month: isSpanish ? "Mes" : "Month",
    };
  }, [locale]);

  // Get localized "Today" button text
  const todayButtonText = useMemo(() => {
    return locale.startsWith("es") ? "Hoy" : "Today";
  }, [locale]);

  // Determinar si un día es fin de semana
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  };

  // Toggle calendar view selector menu
  const toggleCalendarMenu = () => {
    setShowCalendarMenu(!showCalendarMenu);
  };

  // Handle selecting a view type
  const handleSelectViewType = (selectedViewType: CalendarViewType) => {
    onViewTypeChange(selectedViewType);
    setShowCalendarMenu(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBackgroundColor,
          borderBottomWidth: 1,
          borderBottomColor: theme.gridLineColor,
        },
      ]}
    >
      {/* Main header with period display and navigation */}
      <View style={styles.mainHeader}>
        <View style={styles.titleContainer}>
          <Text style={[styles.primaryTitle, { color: theme.textColor }]}>
            {formattedPeriod.primary}
          </Text>
          <Text
            style={[styles.secondaryTitle, { color: theme.secondaryColor }]}
          >
            {formattedPeriod.secondary}
          </Text>
        </View>

        <View style={styles.navigationContainer}>
          {/* Calendar Icon Button */}
          <TouchableOpacity
            style={[
              styles.calendarIconButton,
              {
                backgroundColor: theme.primaryColor,
              },
            ]}
            onPress={toggleCalendarMenu}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faCalendarAlt} size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.todayButton,
              {
                backgroundColor: "rgba(0, 122, 255, 0.1)",
                borderWidth: 1,
                borderColor: theme.primaryColor,
              },
            ]}
            onPress={onToday}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.todayButtonText, { color: theme.primaryColor }]}
            >
              {todayButtonText}
            </Text>
          </TouchableOpacity>

          <View style={styles.arrowContainer}>
            <TouchableOpacity
              style={[
                styles.arrowButton,
                {
                  borderColor: theme.gridLineColor,
                  borderLeftWidth: 1,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                },
              ]}
              onPress={onPrevious}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.arrowButtonText, { color: theme.primaryColor }]}
              >
                ‹
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.arrowButton,
                {
                  borderColor: theme.gridLineColor,
                  borderWidth: 1,
                },
              ]}
              onPress={onNext}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.arrowButtonText, { color: theme.primaryColor }]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* View type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.viewTypeScrollContent}
      >
        <View
          style={[
            styles.viewTypeSegment,
            {
              backgroundColor: theme.calendarBackgroundColor,
              borderWidth: 1,
              borderColor: theme.gridLineColor,
              borderRadius: 10,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewTypeButton,
              viewType === "day" && styles.activeViewButton,
              viewType === "day" && { backgroundColor: theme.primaryColor },
            ]}
            onPress={() => onViewTypeChange("day")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewTypeButtonText,
                {
                  color: viewType === "day" ? "#FFFFFF" : theme.textColor,
                  opacity: viewType === "day" ? 1 : 0.8,
                },
              ]}
            >
              {viewTypeLabels.day}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewTypeButton,
              viewType === "3day" && styles.activeViewButton,
              viewType === "3day" && { backgroundColor: theme.primaryColor },
            ]}
            onPress={() => onViewTypeChange("3day")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewTypeButtonText,
                {
                  color: viewType === "3day" ? "#FFFFFF" : theme.textColor,
                  opacity: viewType === "3day" ? 1 : 0.8,
                },
              ]}
            >
              {viewTypeLabels.threeDays}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewTypeButton,
              viewType === "workWeek" && styles.activeViewButton,
              viewType === "workWeek" && {
                backgroundColor: theme.primaryColor,
              },
            ]}
            onPress={() => onViewTypeChange("workWeek")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewTypeButtonText,
                {
                  color: viewType === "workWeek" ? "#FFFFFF" : theme.textColor,
                  opacity: viewType === "workWeek" ? 1 : 0.8,
                },
              ]}
            >
              {viewTypeLabels.workWeek}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewTypeButton,
              viewType === "week" && styles.activeViewButton,
              viewType === "week" && { backgroundColor: theme.primaryColor },
            ]}
            onPress={() => onViewTypeChange("week")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewTypeButtonText,
                {
                  color: viewType === "week" ? "#FFFFFF" : theme.textColor,
                  opacity: viewType === "week" ? 1 : 0.8,
                },
              ]}
            >
              {viewTypeLabels.week}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewTypeButton,
              viewType === "month" && styles.activeViewButton,
              viewType === "month" && { backgroundColor: theme.primaryColor },
            ]}
            onPress={() => onViewTypeChange("month")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.viewTypeButtonText,
                {
                  color: viewType === "month" ? "#FFFFFF" : theme.textColor,
                  opacity: viewType === "month" ? 1 : 0.8,
                },
              ]}
            >
              {viewTypeLabels.month}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weekday headers for week/3-day/workWeek view */}
      {(viewType === "3day" ||
        viewType === "week" ||
        viewType === "workWeek") && (
        <View
          style={[
            styles.daysContainer,
            {
              borderTopWidth: 1,
              borderTopColor: theme.gridLineColor,
              borderBottomWidth: 1,
              borderBottomColor: theme.gridLineColor,
              borderLeftWidth: 1,
              borderLeftColor: theme.gridLineColor,
              borderRightWidth: 1,
              borderRightColor: theme.gridLineColor,
            },
          ]}
        >
          {/* Time label placeholder to align with TimeGrid */}
          <View
            style={[
              styles.timeLabelPlaceholder,
              {
                borderRightWidth: 1,
                borderRightColor: theme.gridLineColor,
              },
            ]}
          />

          {dates.map((date, index) => {
            const isCurrentDay = isToday(date);
            const isWeekendDay = isWeekend(date);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  {
                    borderRightWidth: index < dates.length - 1 ? 1 : 0,
                    borderRightColor: theme.gridLineColor,
                  },
                  isCurrentDay && {
                    borderBottomColor: theme.todayIndicatorColor,
                    borderBottomWidth: 2,
                  },
                  isWeekendDay && {
                    backgroundColor: theme.weekendColor,
                  },
                ]}
                onPress={() => {
                  onViewTypeChange("day");
                  setSelectedDate(date);
                }}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: theme.textColor },
                    isCurrentDay && { fontWeight: "700" },
                    isWeekendDay && { opacity: 0.7 },
                  ]}
                >
                  {getDayName(date, locale, true)}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: theme.textColor },
                    isCurrentDay && {
                      color: theme.todayIndicatorColor,
                      fontWeight: "700",
                    },
                    isWeekendDay && { opacity: 0.7 },
                  ]}
                >
                  {formatDate(date, locale)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Weekday headers for month view */}
      {viewType === "month" && (
        <View
          style={[
            styles.monthDaysRow,
            {
              borderTopWidth: 1,
              borderTopColor: theme.gridLineColor,
              borderBottomWidth: 1,
              borderBottomColor: theme.gridLineColor,
              borderLeftWidth: 1,
              borderLeftColor: theme.gridLineColor,
              borderRightWidth: 1,
              borderRightColor: theme.gridLineColor,
            },
          ]}
        >
          {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day, index) => (
            <View
              key={index}
              style={[
                styles.monthDayCell,
                {
                  borderRightWidth: index < 6 ? 1 : 0,
                  borderRightColor: theme.gridLineColor,
                },
                (index === 5 || index === 6) && { backgroundColor: theme.weekendColor },
              ]}
            >
              <Text       
                style={[
                  styles.monthDayText,
                  { color: theme.textColor },
                  (index === 5 || index === 6) && { opacity: 0.7 },
                ]}  
              >
                {day}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Calendar Menu Modal */}
      <Modal
        transparent={true}
        visible={showCalendarMenu}
        animationType="fade"
        onRequestClose={() => setShowCalendarMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarMenu(false)}
        >
          <View
            style={[
              styles.calendarMenu,
              {
                backgroundColor: theme.backgroundColor,
                borderColor: theme.gridLineColor,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.calendarMenuItem,
                viewType === "day" && {
                  backgroundColor: `${theme.primaryColor}20`,
                },
              ]}
              onPress={() => handleSelectViewType("day")}
            >
              <Text
                style={[
                  styles.calendarMenuItemText,
                  viewType === "day" && {
                    color: theme.primaryColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {viewTypeLabels.day}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.calendarMenuItem,
                viewType === "3day" && {
                  backgroundColor: `${theme.primaryColor}20`,
                },
              ]}
              onPress={() => handleSelectViewType("3day")}
            >
              <Text
                style={[
                  styles.calendarMenuItemText,
                  viewType === "3day" && {
                    color: theme.primaryColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {viewTypeLabels.threeDays}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.calendarMenuItem,
                viewType === "week" && {
                  backgroundColor: `${theme.primaryColor}20`,
                },
              ]}
              onPress={() => handleSelectViewType("week")}
            >
              <Text
                style={[
                  styles.calendarMenuItemText,
                  viewType === "week" && {
                    color: theme.primaryColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {viewTypeLabels.week}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.calendarMenuItem,
                viewType === "workWeek" && {
                  backgroundColor: `${theme.primaryColor}20`,
                },
              ]}
              onPress={() => handleSelectViewType("workWeek")}
            >
              <Text
                style={[
                  styles.calendarMenuItemText,
                  viewType === "workWeek" && {
                    color: theme.primaryColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {viewTypeLabels.workWeek}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.calendarMenuItem,
                viewType === "month" && {
                  backgroundColor: `${theme.primaryColor}20`,
                },
              ]}
              onPress={() => handleSelectViewType("month")}
            >
              <Text
                style={[
                  styles.calendarMenuItemText,
                  viewType === "month" && {
                    color: theme.primaryColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {viewTypeLabels.month}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "ios" ? 40 : StatusBar.currentHeight,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 229, 234, 0.4)",
  },
  mainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  titleContainer: {
    flex: 2,
  },
  primaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  secondaryTitle: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  navigationContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  arrowContainer: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  arrowButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  arrowButtonText: {
    fontSize: 24,
    fontWeight: "300",
  },
  viewTypeScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  viewTypeSegment: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    padding: 4,
  },
  viewTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 8,
    marginRight: 2,
  },
  activeViewButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  viewTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  daysContainer: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  timeLabelPlaceholder: {
    width: TIME_LABEL_WIDTH,
    height: "100%",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  dayName: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "600",
  },
  monthDaysRow: {
    flexDirection: "row",
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 229, 234, 0.6)",
  },
  monthDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  monthDayText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  calendarIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  calendarMenu: {
    position: "absolute",
    top: 80,
    right: 16,
    width: 150,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  calendarMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  calendarMenuItemText: {
    fontSize: 14,
    color: "#333333",
  },
});

export default CalendarHeader;
