import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { formatDate, formatMonth, formatYear, getDayName, getWeekDates, isToday } from './utils';
import { useCalendar } from './CalendarContext';
import { CalendarViewType } from './types';

// Ensure this matches the TIME_LABEL_WIDTH in TimeGrid.tsx
const TIME_LABEL_WIDTH = 50;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { viewType, selectedDate, theme, locale, firstDayOfWeek, visibleDays, setSelectedDate } =
    useCalendar();

  // Get the dates to display based on the view type
  const dates = useMemo(() => {
    switch (viewType) {
      case 'day':
        return [selectedDate];
      case '3day': {
        const result = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() + i);
          result.push(date);
        }
        return result;
      }
      case 'week':
        return getWeekDates(selectedDate, firstDayOfWeek).filter((_, i) => visibleDays.includes(i));
      case 'workWeek':
        // Mostrar solo días laborables (lunes a viernes)
        return getWeekDates(selectedDate, 1).slice(0, 5);
      case 'month':
        return getWeekDates(selectedDate, firstDayOfWeek);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  // Format the date range or month for display
  const formattedPeriod = useMemo(() => {
    const month = formatMonth(selectedDate, locale);
    const year = formatYear(selectedDate, locale);
    const date = formatDate(selectedDate, locale);

    // Obtener el nombre del día en español
    const getDayOfWeek = (date: Date) => {
      const days = locale.startsWith('es')
        ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    };

    // Formato para mostrar "Lunes, 26 de junio" o "Monday, June 26"
    const formatFullDate = (date: Date) => {
      const day = date.getDate();
      if (locale.startsWith('es')) {
        return `${getDayOfWeek(date)}, ${day} de ${formatMonth(date, locale).toLowerCase()}`;
      } else {
        return `${getDayOfWeek(date)}, ${formatMonth(date, locale)} ${day}`;
      }
    };

    switch (viewType) {
      case 'month':
        // For month view, just return the month name and year
        return { primary: month, secondary: year };
      case 'day':
        return {
          primary: formatFullDate(selectedDate),
          secondary: year,
        };
      case '3day':
      case 'week':
      case 'workWeek':
        if (dates.length > 0) {
          const firstDate = dates[0];
          const lastDate = dates[dates.length - 1];

          // If same month
          if (firstDate.getMonth() === lastDate.getMonth()) {
            return {
              primary: `${formatDate(firstDate, locale)} - ${formatDate(
                lastDate,
                locale
              )} ${month}`,
              secondary: year,
            };
          }
          // If different months but same year
          else if (firstDate.getFullYear() === lastDate.getFullYear()) {
            return {
              primary: `${formatDate(firstDate, locale)} ${formatMonth(firstDate, locale)} - ${formatDate(
                lastDate,
                locale
              )} ${formatMonth(lastDate, locale)}`,
              secondary: year,
            };
          }
          // If different years
          else {
            return {
              primary: `${formatDate(firstDate, locale)} ${formatMonth(firstDate, locale)} - ${formatDate(
                lastDate,
                locale
              )} ${formatMonth(lastDate, locale)}`,
              secondary: `${formatYear(firstDate, locale)} - ${formatYear(lastDate, locale)}`,
            };
          }
        }
        return { primary: '', secondary: '' };
      default:
        return {
          primary: formatFullDate(selectedDate),
          secondary: year,
        };
    }
  }, [viewType, selectedDate, dates, locale]);

  // Get view type labels based on locale
  const viewTypeLabels = useMemo(() => {
    const isSpanish = locale.startsWith('es');
    return {
      day: isSpanish ? 'Día' : 'Day',
      threeDays: isSpanish ? '3 Días' : '3 Days',
      week: isSpanish ? 'Semana' : 'Week',
      workWeek: isSpanish ? 'L-V' : 'M-F',
      month: isSpanish ? 'Mes' : 'Month',
    };
  }, [locale]);

  // Get localized "Today" button text
  const todayButtonText = useMemo(() => {
    return locale.startsWith('es') ? 'Hoy' : 'Today';
  }, [locale]);

  // Determinar si un día es fin de semana
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  };

  // Handle selecting a view type
  const handleSelectViewType = (selectedViewType: CalendarViewType) => {
    onViewTypeChange(selectedViewType);
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
        <TouchableOpacity style={styles.navArrowLeft} onPress={onPrevious} activeOpacity={0.7}>
          <Text style={[styles.arrowButtonText, { color: theme.primaryColor }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.dateContainer}>
          <Text style={[styles.primaryTitle, { color: theme.textColor }]}>
            {formattedPeriod.primary}
          </Text>
          <Text style={[styles.yearText, { color: theme.secondaryColor }]}>
            {formattedPeriod.secondary}
          </Text>
        </View>

        <TouchableOpacity style={styles.navArrowRight} onPress={onNext} activeOpacity={0.7}>
          <Text style={[styles.arrowButtonText, { color: theme.primaryColor }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* View type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.viewTypeScrollContent}
      >
        <View style={styles.viewTypeRow}>
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
                viewType === 'day' && styles.activeViewButton,
                viewType === 'day' && { backgroundColor: theme.primaryColor },
              ]}
              onPress={() => onViewTypeChange('day')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewTypeButtonText,
                  {
                    color: viewType === 'day' ? '#FFFFFF' : theme.textColor,
                    opacity: viewType === 'day' ? 1 : 0.8,
                  },
                ]}
              >
                {viewTypeLabels.day}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewTypeButton,
                viewType === '3day' && styles.activeViewButton,
                viewType === '3day' && { backgroundColor: theme.primaryColor },
              ]}
              onPress={() => onViewTypeChange('3day')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewTypeButtonText,
                  {
                    color: viewType === '3day' ? '#FFFFFF' : theme.textColor,
                    opacity: viewType === '3day' ? 1 : 0.8,
                  },
                ]}
              >
                {viewTypeLabels.threeDays}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewTypeButton,
                viewType === 'workWeek' && styles.activeViewButton,
                viewType === 'workWeek' && {
                  backgroundColor: theme.primaryColor,
                },
              ]}
              onPress={() => onViewTypeChange('workWeek')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewTypeButtonText,
                  {
                    color: viewType === 'workWeek' ? '#FFFFFF' : theme.textColor,
                    opacity: viewType === 'workWeek' ? 1 : 0.8,
                  },
                ]}
              >
                {viewTypeLabels.workWeek}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewTypeButton,
                viewType === 'week' && styles.activeViewButton,
                viewType === 'week' && { backgroundColor: theme.primaryColor },
              ]}
              onPress={() => onViewTypeChange('week')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewTypeButtonText,
                  {
                    color: viewType === 'week' ? '#FFFFFF' : theme.textColor,
                    opacity: viewType === 'week' ? 1 : 0.8,
                  },
                ]}
              >
                {viewTypeLabels.week}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewTypeButton,
                viewType === 'month' && styles.activeViewButton,
                viewType === 'month' && { backgroundColor: theme.primaryColor },
              ]}
              onPress={() => onViewTypeChange('month')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.viewTypeButtonText,
                  {
                    color: viewType === 'month' ? '#FFFFFF' : theme.textColor,
                    opacity: viewType === 'month' ? 1 : 0.8,
                  },
                ]}
              >
                {viewTypeLabels.month}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.todayButton,
              {
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderWidth: 1,
                borderColor: theme.primaryColor,
              },
            ]}
            onPress={onToday}
            activeOpacity={0.7}
          >
            <Text style={[styles.todayButtonText, { color: theme.primaryColor }]}>
              {todayButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weekday headers for week/3-day/workWeek view */}
      {(viewType === '3day' || viewType === 'week' || viewType === 'workWeek') && (
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
                  onViewTypeChange('day');
                  setSelectedDate(date);
                }}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: theme.textColor },
                    isCurrentDay && { fontWeight: '700' },
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
                      fontWeight: '700',
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
      {viewType === 'month' && (
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
          {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, index) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 229, 234, 0.4)',
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  yearText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  navigationContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navArrowLeft: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  navArrowRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  arrowButtonText: {
    fontSize: 32,
    fontWeight: '300',
  },
  viewTypeScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewTypeSegment: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
  },
  viewTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 2,
  },
  activeViewButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  viewTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  timeLabelPlaceholder: {
    width: TIME_LABEL_WIDTH,
    height: '100%',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  monthDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 229, 234, 0.6)',
  },
  monthDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  monthDayText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default CalendarHeader;
