export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  color?: string;
  recurrence?: RecurrenceRule;
  metadata?: Record<string, any>;
  timezone?: string;
  isDraggable?: boolean;
  isResizable?: boolean;
  isEditable?: boolean;
  isRecurrence?: boolean;
};

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  count?: number;
  until?: Date;
  byDay?: Array<"MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU">;
  byMonthDay?: number[];
  byMonth?: number[];
  exceptions?: Date[];
};

export type CalendarViewType = "day" | "3day" | "week" | "workWeek" | "month";

export type CalendarTheme = {
  backgroundColor: string;
  calendarBackgroundColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  todayIndicatorColor: string;
  selectedDayColor: string;
  eventColors: string[];
  hourIndicatorColor: string;
  gridLineColor: string;
  headerBackgroundColor: string;
  unavailableHoursColor: string;
  weekendColor: string;
  eventTextColor: string;
  dragCreateIndicatorColor: string;
  dragMovePreviewColor: string;
  overlapIndicatorColor: string;
  connectionLineColor: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
};

export type TimeRange = {
  start: number; // Hours in 24-hour format
  end: number; // Hours in 24-hour format
};

export type UnavailableHours = {
  days?: number[]; // 0 = Sunday, 1 = Monday, etc.
  ranges: Array<{ start: number; end: number }>;
};

export type HapticOptions = {
  enabled: boolean;
  eventCreate?: "light" | "medium" | "heavy";
  eventMove?: "light" | "medium" | "heavy";
  viewChange?: "light" | "medium" | "heavy";
  error?: "light" | "medium" | "heavy";
};

export type DragPreviewConfig = {
  previewOffset: number; // Offset in pixels for the drag preview from the event being moved
  connectionLineWidth?: number; // Width of the connection line between original event and preview
  pagingScrollHours?: number; // Number of hours to scroll when reaching edge (default: 3)
  enablePagingScroll?: boolean; // Whether to use paging scroll instead of continuous scroll (default: true)
};

export type AutoScrollConfig = {
  enabled: boolean; // Activar/desactivar el auto-scroll
  edgeThreshold: number; // Distancia en píxeles desde el borde que activa el auto-scroll
  speed: number; // Velocidad base del auto-scroll (píxeles por frame)
  constant: boolean; // Si es true, la velocidad es constante sin aceleración
  acceleration: number; // Factor de aceleración cuando constant=false (0-1)
  maxSpeed: number; // Velocidad máxima en píxeles por frame
  minSpeed: number; // Velocidad mínima en píxeles por frame
  frameInterval: number; // Intervalo de tiempo entre frames (ms)
};

export type CalendarConfig = {
  dragPreviewConfig: DragPreviewConfig;
  autoScrollConfig?: AutoScrollConfig;
};

export interface TimeChangeConfirmation {
  visible: boolean;
  event: CalendarEvent | null;
  newStart: Date | null;
  newEnd: Date | null;
}

export type CalendarContextType = {
  events: CalendarEvent[];
  viewType: CalendarViewType;
  selectedDate: Date;
  timeRange: TimeRange;
  theme: CalendarTheme;
  locale: string;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  visibleDays: number[];
  timeInterval: number; // In minutes
  unavailableHours?: UnavailableHours;
  timezone?: string;
  hapticOptions?: HapticOptions;
  calendarConfig: CalendarConfig;
  zoomLevel: number;
  isDragEnabled: boolean;
  timeChangeConfirmation: TimeChangeConfirmation;
  onEventPress?: (event: CalendarEvent) => void;
  onTimeSlotPress?: (start: Date, end: Date) => void;
  onEventCreate?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onViewChange?: (viewType: CalendarViewType) => void;
  onDateChange?: (date: Date) => void;
  onZoomChange?: (zoomLevel: number) => void;
  setViewType: (viewType: CalendarViewType) => void;
  setSelectedDate: (date: Date) => void;
  setZoomLevel: (level: number) => void;
  setIsDragEnabled: (enabled: boolean) => void;
  showTimeChangeConfirmation: (
    event: CalendarEvent,
    newStart: Date,
    newEnd: Date
  ) => void;
  hideTimeChangeConfirmation: () => void;
  confirmTimeChange: () => void;
};

export interface SnapLineIndicator {
  time: Date;
  visible: boolean;
  color: string;
}
