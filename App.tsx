import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  SafeAreaView,
  Platform,
  View,
  Button,
  TouchableOpacity,
  Text,
} from "react-native";
import {
  Calendar,
  CalendarEvent,
  CalendarViewType,
  UnavailableHours,
} from "./src/components/Calendar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  LoggingProvider,
  useLoggingControl,
} from "./src/hooks/useLoggingControl";
import { logger } from "./src/components/Calendar/utils/logger";
// Importaciones para FontAwesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { faCalendarAlt } from "@fortawesome/free-solid-svg-icons";

// Agregar los iconos que usaremos a la biblioteca de FontAwesome
library.add(faCalendarAlt);

// Definir horas no disponibles (por ejemplo, fuera del horario laboral)
const unavailableHours: UnavailableHours = {
  days: [1, 2, 3, 4, 5], // Lunes a viernes
  ranges: [
    { start: 0, end: 9 }, // Antes de las 9 AM
    { start: 18, end: 24 }, // Después de las 6 PM
  ],
};

// Generate some sample events with colored blocks like in the image
const generateSampleEvents = (): CalendarEvent[] => {
  const today = new Date();
  const events: CalendarEvent[] = [];

  // Current month events
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Event 1: All-day event for day 3
  events.push({
    id: "1",
    title: "Día completo",
    start: new Date(currentYear, currentMonth, 3, 0, 0),
    end: new Date(currentYear, currentMonth, 3, 23, 59),
    isAllDay: true,
    color: "#4CD964",
  });

  // Event 2: "Junta a las 10 AM" on day 8
  const event2Start = new Date(currentYear, currentMonth, 8, 10, 0);
  events.push({
    id: "2",
    title: "Junta a las 10 AM",
    start: event2Start,
    end: new Date(event2Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: "#007AFF",
  });

  // Event 3: "Almuerzo" on day 10
  const event3Start = new Date(currentYear, currentMonth, 10, 13, 0);
  events.push({
    id: "3",
    title: "Almuerzo",
    start: event3Start,
    end: new Date(event3Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: "#5AC8FA",
  });

  // Event 4: "Doctor" on day 15
  const event4Start = new Date(currentYear, currentMonth, 15, 16, 0);
  events.push({
    id: "4",
    title: "Doctor",
    start: event4Start,
    end: new Date(event4Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: "#FF3B30",
  });

  // Event 5: "Ejercicio" on day 15 (same day as Event 4)
  const event5Start = new Date(currentYear, currentMonth, 15, 8, 0);
  events.push({
    id: "5",
    title: "Ejercicio",
    start: event5Start,
    end: new Date(event5Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: "#5856D6",
  });

  // Event 6: "Proyecto X" on day 16
  const event6Start = new Date(currentYear, currentMonth, 16, 14, 0);
  events.push({
    id: "6",
    title: "Proyecto X",
    start: event6Start,
    end: new Date(event6Start.getTime() + 150 * 60000), // 150 minutos de duración
    color: "#FF9500",
  });

  // Event 7: "Revisión de código" on day 20
  const event7Start = new Date(currentYear, currentMonth, 20, 9, 0);
  events.push({
    id: "7",
    title: "Revisión de código",
    start: event7Start,
    end: new Date(event7Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: "#4CD964",
  });

  // Event 8: "Conferencia" spanning days 16-18
  events.push({
    id: "8",
    title: "Conferencia",
    start: new Date(currentYear, currentMonth, 16, 9, 0),
    end: new Date(currentYear, currentMonth, 18, 17, 0),
    color: "#FF3B30",
    recurrence: {
      frequency: "weekly",
      count: 4,
      byDay: ["MO", "WE", "FR"],
    },
  });

  // Event 9: "Reunión de equipo" on day 22
  const event9Start = new Date(currentYear, currentMonth, 22, 15, 0);
  events.push({
    id: "9",
    title: "Reunión de equipo",
    start: event9Start,
    end: new Date(event9Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: "#007AFF",
  });

  // Event 10: "Cita con cliente" on day 25
  const event10Start = new Date(currentYear, currentMonth, 25, 11, 0);
  events.push({
    id: "10",
    title: "Cita con cliente",
    start: event10Start,
    end: new Date(event10Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: "#5AC8FA",
    isDraggable: true,
    isResizable: true,
  });

  // Event 11: "Entrenamiento" on day 28
  const event11Start = new Date(currentYear, currentMonth, 28, 18, 0);
  events.push({
    id: "11",
    title: "Entrenamiento",
    start: event11Start,
    end: new Date(event11Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: "#4CD964",
    recurrence: {
      frequency: "daily",
      interval: 1,
      count: 5,
    },
  });

  // Agregar algunos eventos para el día actual para asegurar que se vean
  const todayStart = new Date();
  todayStart.setHours(10, 0, 0, 0);

  events.push({
    id: "today-1",
    title: "Reunión de hoy",
    start: todayStart,
    end: new Date(todayStart.getTime() + 60 * 60000), // 60 minutos
    color: "#007AFF",
  });

  const todayStart2 = new Date();
  todayStart2.setHours(14, 30, 0, 0);

  events.push({
    id: "today-2",
    title: "Otra reunión",
    start: todayStart2,
    end: new Date(todayStart2.getTime() + 90 * 60000), // 90 minutos
    color: "#FF9500",
  });

  // Agregar eventos que ocurren simultáneamente (mismo horario)
  // Evento simultáneo 1 - mismo horario que "Reunión de hoy"
  events.push({
    id: "simul-1",
    title: "Llamada de ventas",
    start: new Date(todayStart.getTime()),
    end: new Date(todayStart.getTime() + 45 * 60000), // 45 minutos
    color: "#5AC8FA",
  });

  // Evento simultáneo 2 - mismo horario que "Reunión de hoy"
  events.push({
    id: "simul-2",
    title: "Actualización de proyecto",
    start: new Date(todayStart.getTime() + 15 * 60000), // Comienza 15 min después
    end: new Date(todayStart.getTime() + 75 * 60000), // 60 minutos desde el inicio
    color: "#FF3B30",
  });

  // Evento simultáneo 3 - solapa con "Otra reunión"
  events.push({
    id: "simul-3",
    title: "Revisión de diseño",
    start: new Date(todayStart2.getTime() - 30 * 60000), // Comienza 30 min antes
    end: new Date(todayStart2.getTime() + 60 * 60000), // 90 minutos de duración
    color: "#4CD964",
  });

  // Eventos múltiples para otro día (mañana)
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(9, 0, 0, 0);

  // Evento base para mañana
  events.push({
    id: "tomorrow-1",
    title: "Planificación semanal",
    start: tomorrowStart,
    end: new Date(tomorrowStart.getTime() + 60 * 60000), // 60 minutos
    color: "#FF9500",
  });

  // Eventos simultáneos para mañana (hasta 4 al mismo tiempo)
  events.push({
    id: "tomorrow-2",
    title: "Reunión de equipo",
    start: new Date(tomorrowStart.getTime()),
    end: new Date(tomorrowStart.getTime() + 45 * 60000), // 45 minutos
    color: "#007AFF",
  });

  events.push({
    id: "tomorrow-3",
    title: "Revisión de presupuesto",
    start: new Date(tomorrowStart.getTime() + 10 * 60000), // 10 min después
    end: new Date(tomorrowStart.getTime() + 55 * 60000), // 45 minutos desde inicio
    color: "#5856D6",
  });

  events.push({
    id: "tomorrow-4",
    title: "Entrevista candidato",
    start: new Date(tomorrowStart.getTime() + 15 * 60000), // 15 min después
    end: new Date(tomorrowStart.getTime() + 60 * 60000), // 45 minutos desde inicio
    color: "#5AC8FA",
  });

  return events;
};

// Debug Controls component
const DebugControls: React.FC = () => {
  const { loggingEnabled, enableLogging, disableLogging } = useLoggingControl();

  return (
    <View style={styles.debugControls}>
      <Text style={styles.debugTitle}>Debug Controls</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.debugButton,
            loggingEnabled ? styles.activeButton : null,
          ]}
          onPress={enableLogging}
        >
          <Text
            style={[
              styles.buttonText,
              loggingEnabled ? styles.activeButtonText : null,
            ]}
          >
            Enable Logs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.debugButton,
            !loggingEnabled ? styles.activeButton : null,
          ]}
          onPress={disableLogging}
        >
          <Text
            style={[
              styles.buttonText,
              !loggingEnabled ? styles.activeButtonText : null,
            ]}
          >
            Disable Logs
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Main App without logging provider
const AppContent = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(generateSampleEvents());
  const [viewType, setViewType] = useState<CalendarViewType>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Handle creating a new event
  const handleEventCreate = (event: CalendarEvent) => {
    // Generate a unique ID for the new event
    const newId = `event-${Date.now()}`;

    logger.debug("Creating new event", { event });

    const newEvent: CalendarEvent = {
      ...event,
      id: newId,
      title: event.title || "Nuevo evento",
      color: event.color || "#4CD964",
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);
  };

  // Handle updating an event
  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    logger.debug("Updating event", { eventId: updatedEvent.id });

    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  // Handle deleting an event
  const handleEventDelete = (eventId: string) => {
    logger.debug("Deleting event", { eventId });

    setEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );
  };

  // Handle time slot press
  const handleTimeSlotPress = (start: Date, end: Date) => {
    logger.debug("Time slot pressed", { start, end });

    // Aquí se podría mostrar un modal para crear un nuevo evento
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: "Nuevo evento",
      start,
      end,
      color: "#5AC8FA",
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);
  };

  // Handle event press
  const handleEventPress = (event: CalendarEvent) => {
    logger.debug("Event pressed", { eventId: event.id, title: event.title });
    // Aquí se podría mostrar un modal para editar el evento
  };

  // Handle view change
  const handleViewChange = (newViewType: CalendarViewType) => {
    logger.debug("View changed", { previous: viewType, new: newViewType });
    setViewType(newViewType);
  };

  // Handle date change
  const handleDateChange = (newDate: Date) => {
    logger.debug("Date changed", { previous: selectedDate, new: newDate });
    setSelectedDate(newDate);
  };

  // Handle zoom change
  const handleZoomChange = (level: number) => {
    logger.debug("Zoom changed", { previous: zoomLevel, new: level });
    setZoomLevel(level);
  };

  // Custom theme to match the image
  const customTheme = {
    backgroundColor: "#FFFFFF",
    calendarBackgroundColor: "#F5F5F5",
    textColor: "#333333",
    primaryColor: "#2196F3",
    secondaryColor: "#5AC8FA",
    todayIndicatorColor: "#2196F3",
    selectedDayColor: "rgba(33, 150, 243, 0.1)",
    eventColors: [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#F44336",
      "#9C27B0",
      "#009688",
    ],
    hourIndicatorColor: "#F44336",
    gridLineColor: "#E0E0E0",
    headerBackgroundColor: "#FFFFFF",
    unavailableHoursColor: "rgba(240, 240, 240, 0.7)",
    weekendColor: "#F9F9F9",
    eventTextColor: "#FFFFFF",
    dragCreateIndicatorColor: "rgba(33, 150, 243, 0.3)",
    overlapIndicatorColor: "rgba(244, 67, 54, 0.1)",
    successColor: "#4CAF50",
    errorColor: "#F44336",
    warningColor: "#FF9800",
  };

  // Configuración de feedback háptico
  const hapticOptions = {
    enabled: true,
    eventCreate: "medium" as const,
    eventMove: "light" as const,
    viewChange: "light" as const,
    error: "heavy" as const,
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.calendarContainer}>
          <Calendar
            events={events}
            initialViewType={viewType}
            initialDate={selectedDate}
            timeRange={{ start: 7, end: 22 }}
            onEventCreate={handleEventCreate}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            onTimeSlotPress={handleTimeSlotPress}
            onEventPress={handleEventPress}
            onViewChange={handleViewChange}
            onDateChange={handleDateChange}
            onZoomChange={handleZoomChange}
            theme={customTheme}
            locale="es-ES"
            firstDayOfWeek={1} // Lunes como primer día de la semana
            initialZoomLevel={zoomLevel}
            initialDragEnabled={true}
            unavailableHours={unavailableHours}
            hapticOptions={hapticOptions}
          />
        </View>

        <StatusBar style="auto" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

//<DebugControls />

// Main App with logging provider
export default function App() {
  return (
    <LoggingProvider>
      <AppContent />
    </LoggingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  calendarContainer: {
    flex: 1,
  },
  debugControls: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  debugButton: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    minWidth: 120,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#2196F3",
  },
  buttonText: {
    fontWeight: "500",
    color: "#333",
  },
  activeButtonText: {
    fontWeight: "bold",
    color: "#fff",
  },
});
