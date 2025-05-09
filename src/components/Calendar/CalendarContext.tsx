import React, { createContext, useState, useContext, ReactNode } from "react";
import {
  CalendarContextType,
  CalendarEvent,
  CalendarTheme,
  CalendarViewType,
  TimeRange,
  UnavailableHours,
  HapticOptions,
  CalendarConfig,
  DragPreviewConfig,
} from "./types";

// Default theme
export const defaultTheme: CalendarTheme = {
  backgroundColor: "#FFFFFF",
  calendarBackgroundColor: "#F5F5F5",
  textColor: "#333333",
  primaryColor: "#007AFF",
  secondaryColor: "#5AC8FA",
  todayIndicatorColor: "#FF3B30",
  selectedDayColor: "rgba(0, 122, 255, 0.2)",
  eventColors: [
    "#007AFF",
    "#5AC8FA",
    "#FF9500",
    "#FF3B30",
    "#4CD964",
    "#5856D6",
  ],
  hourIndicatorColor: "#FF3B30",
  gridLineColor: "#E5E5EA",
  headerBackgroundColor: "#FFFFFF",
  // Nuevos estilos
  unavailableHoursColor: "rgba(230, 230, 230, 0.5)",
  weekendColor: "#F9F9F9",
  eventTextColor: "#FFFFFF",
  dragCreateIndicatorColor: "rgba(0, 122, 255, 0.3)",
  dragMovePreviewColor: "rgba(33, 150, 243, 0.4)",
  connectionLineColor: "rgba(33, 150, 243, 0.7)",
  overlapIndicatorColor: "rgba(255, 59, 48, 0.1)",
  successColor: "#4CD964",
  errorColor: "#FF3B30",
  warningColor: "#FF9500",
};

// Default time range
export const defaultTimeRange: TimeRange = {
  start: 8, // 8 AM
  end: 20, // 8 PM
};

// Default haptic options
export const defaultHapticOptions: HapticOptions = {
  enabled: true,
  eventCreate: "light",
  eventMove: "medium",
  viewChange: "light",
  error: "heavy",
};

// Default calendar config
export const defaultCalendarConfig: CalendarConfig = {
  dragPreviewConfig: {
    previewOffset: 20, // Default 20px offset
    connectionLineWidth: 2,
  },
};

// Create context with default values
const CalendarContext = createContext<CalendarContextType>({
  events: [],
  viewType: "week",
  selectedDate: new Date(),
  timeRange: defaultTimeRange,
  theme: defaultTheme,
  locale: "en-US",
  firstDayOfWeek: 0,
  visibleDays: [0, 1, 2, 3, 4, 5, 6], // All days visible by default
  timeInterval: 30, // 30 minutes
  calendarConfig: defaultCalendarConfig,
  zoomLevel: 1,
  isDragEnabled: true,
  setViewType: () => {},
  setSelectedDate: () => {},
  setZoomLevel: () => {},
  setIsDragEnabled: () => {},
});

interface CalendarProviderProps {
  children: ReactNode;
  initialEvents?: CalendarEvent[];
  initialViewType?: CalendarViewType;
  initialSelectedDate?: Date;
  initialTimeRange?: TimeRange;
  theme?: Partial<CalendarTheme>;
  locale?: string;
  firstDayOfWeek?: number;
  visibleDays?: number[];
  timeInterval?: number;
  unavailableHours?: UnavailableHours;
  timezone?: string;
  hapticOptions?: Partial<HapticOptions>;
  calendarConfig?: Partial<CalendarConfig>;
  initialZoomLevel?: number;
  initialDragEnabled?: boolean;
  onEventPress?: (event: CalendarEvent) => void;
  onTimeSlotPress?: (start: Date, end: Date) => void;
  onEventCreate?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onViewChange?: (viewType: CalendarViewType) => void;
  onDateChange?: (date: Date) => void;
  onZoomChange?: (zoomLevel: number) => void;
  setViewType?: (viewType: CalendarViewType) => void;
  setSelectedDate?: (date: Date) => void;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  initialEvents = [],
  initialViewType = "week",
  initialSelectedDate = new Date(),
  initialTimeRange = defaultTimeRange,
  theme: customTheme = {},
  locale = "en-US",
  firstDayOfWeek = 0,
  visibleDays = [0, 1, 2, 3, 4, 5, 6],
  timeInterval = 30,
  unavailableHours,
  timezone,
  hapticOptions: customHapticOptions = {},
  calendarConfig: customCalendarConfig = {},
  initialZoomLevel = 1,
  initialDragEnabled = true,
  onEventPress,
  onTimeSlotPress,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onViewChange,
  onDateChange,
  onZoomChange,
  setViewType,
  setSelectedDate,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [internalViewType, setInternalViewType] =
    useState<CalendarViewType>(initialViewType);
  const [internalSelectedDate, setInternalSelectedDate] =
    useState<Date>(initialSelectedDate);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // Nuevos estados
  const [zoomLevel, setInternalZoomLevel] = useState<number>(initialZoomLevel);
  const [isDragEnabled, setInternalDragEnabled] =
    useState<boolean>(initialDragEnabled);

  // Use the provided setters or fallback to internal state
  const handleViewTypeChange = (newViewType: CalendarViewType) => {
    if (setViewType) {
      setViewType(newViewType);
    } else {
      setInternalViewType(newViewType);
    }
    onViewChange?.(newViewType);
  };

  const handleSelectedDateChange = (newDate: Date) => {
    if (setSelectedDate) {
      setSelectedDate(newDate);
    } else {
      setInternalSelectedDate(newDate);
    }
    onDateChange?.(newDate);
  };

  const handleZoomChange = (level: number) => {
    setInternalZoomLevel(level);
    onZoomChange?.(level);
  };

  // Merge default theme with custom theme
  const theme: CalendarTheme = {
    ...defaultTheme,
    ...customTheme,
  };

  // Merge default haptic options with custom options
  const hapticOptions: HapticOptions = {
    ...defaultHapticOptions,
    ...customHapticOptions,
  };

  // Merge default calendar config with custom config
  const calendarConfig: CalendarConfig = {
    ...defaultCalendarConfig,
    ...customCalendarConfig,
    dragPreviewConfig: {
      ...defaultCalendarConfig.dragPreviewConfig,
      ...(customCalendarConfig.dragPreviewConfig || {}),
    },
  };

  // Event handling functions
  const handleEventCreate = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
    onEventCreate?.(event);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
    );
    onEventUpdate?.(updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    onEventDelete?.(eventId);
  };

  const value: CalendarContextType = {
    events,
    viewType: setViewType ? initialViewType : internalViewType,
    selectedDate: setSelectedDate ? initialSelectedDate : internalSelectedDate,
    timeRange,
    theme,
    locale,
    firstDayOfWeek,
    visibleDays,
    timeInterval,
    unavailableHours,
    timezone,
    hapticOptions,
    calendarConfig,
    zoomLevel,
    isDragEnabled,
    onEventPress,
    onTimeSlotPress,
    onEventCreate: handleEventCreate,
    onEventUpdate: handleEventUpdate,
    onEventDelete: handleEventDelete,
    onViewChange,
    onDateChange,
    onZoomChange,
    setViewType: handleViewTypeChange,
    setSelectedDate: handleSelectedDateChange,
    setZoomLevel: handleZoomChange,
    setIsDragEnabled: setInternalDragEnabled,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);

export default CalendarContext;
