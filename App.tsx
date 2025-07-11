import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  SafeAreaView,
  Platform,
  View,
  Button,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Importaciones para FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useCalendarConfig } from './src/components/Calendar/config/useCalendarConfig';
import { useLogger } from './src/components/Calendar/utils/logger';
import { LoggingProvider, useLoggingControl } from './src/hooks/useLoggingControl';
import {
  Calendar,
  CalendarEvent,
  CalendarViewType,
  UnavailableHours,
} from './src/components/Calendar';

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
    id: '1',
    title: 'Día completo',
    start: new Date(currentYear, currentMonth, 3, 0, 0),
    end: new Date(currentYear, currentMonth, 3, 23, 59),
    isAllDay: true,
    color: '#4CD964',
  });

  // Event 2: "Junta a las 10 AM" on day 8
  const event2Start = new Date(currentYear, currentMonth, 8, 10, 0);
  events.push({
    id: '2',
    title: 'Junta a las 10 AM',
    start: event2Start,
    end: new Date(event2Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: '#007AFF',
    isDraggable: true,
  });

  // Event 3: "Almuerzo" on day 10
  const event3Start = new Date(currentYear, currentMonth, 10, 13, 0);
  events.push({
    id: '3',
    title: 'Almuerzo',
    start: event3Start,
    end: new Date(event3Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: '#5AC8FA',
    isDraggable: true,
  });

  // Event 4: "Doctor" on day 15
  const event4Start = new Date(currentYear, currentMonth, 15, 16, 0);
  events.push({
    id: '4',
    title: 'Doctor',
    start: event4Start,
    end: new Date(event4Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: '#FF3B30',
  });

  // Event 5: "Ejercicio" on day 15 (same day as Event 4)
  const event5Start = new Date(currentYear, currentMonth, 15, 8, 0);
  events.push({
    id: '5',
    title: 'Ejercicio',
    start: event5Start,
    end: new Date(event5Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: '#5856D6',
  });

  // Event 6: "Proyecto X" on day 16
  const event6Start = new Date(currentYear, currentMonth, 16, 14, 0);
  events.push({
    id: '6',
    title: 'Proyecto X',
    start: event6Start,
    end: new Date(event6Start.getTime() + 150 * 60000), // 150 minutos de duración
    color: '#FF9500',
  });

  // Event 7: "Revisión de código" on day 20
  const event7Start = new Date(currentYear, currentMonth, 20, 9, 0);
  events.push({
    id: '7',
    title: 'Revisión de código',
    start: event7Start,
    end: new Date(event7Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: '#4CD964',
  });

  // Event 8: "Conferencia" spanning days 16-18
  events.push({
    id: '8',
    title: 'Conferencia',
    start: new Date(currentYear, currentMonth, 16, 9, 0),
    end: new Date(currentYear, currentMonth, 18, 17, 0),
    color: '#FF3B30',
    recurrence: {
      frequency: 'weekly',
      count: 4,
      byDay: ['MO', 'WE', 'FR'],
    },
  });

  // Event 9: "Reunión de equipo" on day 22
  const event9Start = new Date(currentYear, currentMonth, 22, 15, 0);
  events.push({
    id: '9',
    title: 'Reunión de equipo',
    start: event9Start,
    end: new Date(event9Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: '#007AFF',
  });

  // Event 10: "Cita con cliente" on day 25
  const event10Start = new Date(currentYear, currentMonth, 25, 11, 0);
  events.push({
    id: '10',
    title: 'Cita con cliente',
    start: event10Start,
    end: new Date(event10Start.getTime() + 60 * 60000), // 60 minutos de duración
    color: '#5AC8FA',
    isDraggable: true,
    isResizable: true,
  });

  // Event 11: "Entrenamiento" on day 28
  const event11Start = new Date(currentYear, currentMonth, 28, 18, 0);
  events.push({
    id: '11',
    title: 'Entrenamiento',
    start: event11Start,
    end: new Date(event11Start.getTime() + 90 * 60000), // 90 minutos de duración
    color: '#4CD964',
    isDraggable: true,
    recurrence: {
      frequency: 'daily',
      interval: 1,
      count: 5,
    },
  });

  // Agregar algunos eventos para el día actual para asegurar que se vean
  const todayStart = new Date();
  todayStart.setHours(10, 0, 0, 0);

  events.push({
    id: 'today-1',
    title: 'Reunión de hoy',
    start: todayStart,
    end: new Date(todayStart.getTime() + 60 * 60000), // 60 minutos
    color: '#007AFF',
  });

  const todayStart2 = new Date();
  todayStart2.setHours(14, 30, 0, 0);

  events.push({
    id: 'today-2',
    title: 'Otra reunión',
    start: todayStart2,
    end: new Date(todayStart2.getTime() + 90 * 60000), // 90 minutos
    color: '#FF9500',
  });

  // Agregar eventos que ocurren simultáneamente (mismo horario)
  // Evento simultáneo 1 - mismo horario que "Reunión de hoy"
  events.push({
    id: 'simul-1',
    title: 'Llamada de ventas',
    start: new Date(todayStart.getTime()),
    end: new Date(todayStart.getTime() + 45 * 60000), // 45 minutos
    color: '#5AC8FA',
  });

  // Evento simultáneo 2 - mismo horario que "Reunión de hoy"
  events.push({
    id: 'simul-2',
    title: 'Actualización de proyecto',
    start: new Date(todayStart.getTime() + 15 * 60000), // Comienza 15 min después
    end: new Date(todayStart.getTime() + 75 * 60000), // 60 minutos desde el inicio
    color: '#FF3B30',
  });

  // Evento simultáneo 3 - solapa con "Otra reunión"
  events.push({
    id: 'simul-3',
    title: 'Revisión de diseño',
    start: new Date(todayStart2.getTime() - 30 * 60000), // Comienza 30 min antes
    end: new Date(todayStart2.getTime() + 60 * 60000), // 90 minutos de duración
    color: '#4CD964',
  });

  // Eventos múltiples para otro día (mañana)
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(9, 0, 0, 0);

  // Evento base para mañana
  events.push({
    id: 'tomorrow-1',
    title: 'Planificación semanal',
    start: tomorrowStart,
    end: new Date(tomorrowStart.getTime() + 60 * 60000), // 60 minutos
    color: '#FF9500',
  });

  // Eventos simultáneos para mañana (hasta 4 al mismo tiempo)
  events.push({
    id: 'tomorrow-2',
    title: 'Reunión de equipo',
    start: new Date(tomorrowStart.getTime()),
    end: new Date(tomorrowStart.getTime() + 45 * 60000), // 45 minutos
    color: '#007AFF',
  });

  events.push({
    id: 'tomorrow-3',
    title: 'Revisión de presupuesto',
    start: new Date(tomorrowStart.getTime() + 10 * 60000), // 10 min después
    end: new Date(tomorrowStart.getTime() + 55 * 60000), // 45 minutos desde inicio
    color: '#5856D6',
  });

  events.push({
    id: 'tomorrow-4',
    title: 'Entrevista candidato',
    start: new Date(tomorrowStart.getTime() + 15 * 60000), // 15 min después
    end: new Date(tomorrowStart.getTime() + 60 * 60000), // 45 minutos desde inicio
    color: '#5AC8FA',
  });

  return events;
};

// Debug Controls component
const DebugControls: React.FC<{
  calendarConfig: any;
  onConfigChange: (config: any) => void;
}> = ({ calendarConfig, onConfigChange }) => {
  const previewOffset = calendarConfig.dragPreviewConfig?.previewOffset || 20;
  const { loggingEnabled, enableLogging, disableLogging } = useLoggingControl();

  const logger = useLogger('DebugControls');

  // Manejar cambios en el offset de previsualización
  const handlePreviewOffsetChange = (change: number) => {
    const newOffset = previewOffset + change;
    if (newOffset >= 0) {
      const newConfig = {
        ...calendarConfig,
        dragPreviewConfig: {
          ...calendarConfig.dragPreviewConfig,
          previewOffset: newOffset,
        },
      };
      onConfigChange(newConfig);
      logger.debug('Updated drag preview offset', {
        previous: previewOffset,
        new: newOffset,
      });
    }
  };

  // Establecer un valor exacto para el offset
  const setExactOffset = (value: number) => {
    if (value >= 0) {
      const newConfig = {
        ...calendarConfig,
        dragPreviewConfig: {
          ...calendarConfig.dragPreviewConfig,
          previewOffset: value,
        },
      };
      onConfigChange(newConfig);
      logger.debug('Set exact preview offset', {
        previous: previewOffset,
        new: value,
      });
    }
  };

  // Restablecer el offset al valor predeterminado
  const resetToDefault = () => {
    const newConfig = {
      ...calendarConfig,
      dragPreviewConfig: {
        ...calendarConfig.dragPreviewConfig,
        previewOffset: 20,
      },
    };
    onConfigChange(newConfig);
    logger.debug('Reset preview offset to default', { newOffset: 20 });
  };

  // Alternar el logging
  const toggleLogging = () => {
    if (loggingEnabled) {
      disableLogging();
    } else {
      enableLogging();
    }
  };

  return (
    <View style={styles.debugControlsContainer}>
      <Text style={styles.debugTitle}>Controles de Depuración</Text>

      <View style={styles.debugSection}>
        <Text style={styles.debugSectionTitle}>Logging</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: loggingEnabled ? '#4CD964' : '#FF3B30' },
            ]}
            onPress={toggleLogging}
          >
            <Text style={styles.debugButtonText}>
              {loggingEnabled ? 'Deshabilitar Logs' : 'Habilitar Logs'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.debugSection}>
        <Text style={styles.debugSectionTitle}>
          Desplazamiento de previsualización: {previewOffset}px
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => handlePreviewOffsetChange(-5)}
          >
            <Text style={styles.debugButtonText}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={() => handlePreviewOffsetChange(5)}>
            <Text style={styles.debugButtonText}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={() => setExactOffset(10)}>
            <Text style={styles.debugButtonText}>10px</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={() => setExactOffset(20)}>
            <Text style={styles.debugButtonText}>20px</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={() => setExactOffset(30)}>
            <Text style={styles.debugButtonText}>30px</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={resetToDefault}>
            <Text style={styles.debugButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Main App without logging provider
const AppContent = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(generateSampleEvents());
  const [selectedViewType, setSelectedViewType] = useState<CalendarViewType>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [calendarConfig, setCalendarConfig] = useState({
    dragPreviewConfig: {
      previewOffset: 20,
      connectionLineWidth: 2,
    },
  });

  const logger = useLogger('AppContent');
  const { updatePerformanceConfig } = useCalendarConfig();
  const { loggingEnabled, enableLogging } = useLoggingControl();

  // Enable logging to debug drag and drop issues
  useEffect(() => {
    // Always enable logging for debugging
    if (!loggingEnabled) {
      enableLogging();
      logger.debug('Logging enabled for debugging drag and drop issues');
    }

    // Configure performance settings for detailed logs
    updatePerformanceConfig({
      LOGGING_ENABLED: true,
      LOGGING_LEVEL: 'debug', // Show all log levels for debugging
    });

    logger.debug('Performance config updated for debugging');
  }, [loggingEnabled, enableLogging, updatePerformanceConfig]);

  // Manejar cambios en la configuración
  const handleConfigChange = (newConfig: any) => {
    setCalendarConfig(newConfig);
    logger.debug('Calendar configuration', {
      previous: calendarConfig,
      new: newConfig,
    });
  };

  // Handle creating a new event
  const handleEventCreate = (event: CalendarEvent) => {
    // Generate a unique ID for the new event
    const newId = `event-${Date.now()}`;

    logger.debug('Creating new event', { event });

    const newEvent: CalendarEvent = {
      ...event,
      id: newId,
      title: event.title || 'Nuevo evento',
      color: event.color || '#4CD964',
    };

    setEvents(prevEvents => [...prevEvents, newEvent]);
  };

  // Handle updating an event
  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    logger.debug('Updating event', { eventId: updatedEvent.id });

    setEvents(prevEvents =>
      prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
    );
  };

  // Handle deleting an event
  const handleEventDelete = (eventId: string) => {
    logger.debug('Deleting event', { eventId });

    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  // Handle time slot press
  const handleTimeSlotPress = (start: Date, end: Date) => {
    logger.debug('Time slot pressed', { start, end });

    // Aquí se podría mostrar un modal para crear un nuevo evento
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: 'Nuevo evento',
      start,
      end,
      color: '#5AC8FA',
    };

    setEvents(prevEvents => [...prevEvents, newEvent]);
  };

  // Handle event press
  const handleEventPress = (event: CalendarEvent) => {
    logger.debug('Event pressed', { eventId: event.id, title: event.title });
    // Aquí se podría mostrar un modal para editar el evento
  };

  // Handle view change
  const handleViewChange = (newViewType: CalendarViewType) => {
    logger.debug('View changed', {
      previous: selectedViewType,
      new: newViewType,
    });
    setSelectedViewType(newViewType);
  };

  // Handle date change
  const handleDateChange = (newDate: Date) => {
    logger.debug('Date changed', { previous: selectedDate, new: newDate });
    setSelectedDate(newDate);
  };

  // Handle zoom change
  const handleZoomChange = (level: number) => {
    logger.debug('Zoom changed', { previous: zoomLevel, new: level });
    setZoomLevel(level);
  };

  // Custom theme to match the image
  const customTheme = {
    backgroundColor: '#FFFFFF',
    calendarBackgroundColor: '#F5F5F5',
    textColor: '#333333',
    primaryColor: '#2196F3',
    secondaryColor: '#5AC8FA',
    todayIndicatorColor: '#2196F3',
    selectedDayColor: 'rgba(33, 150, 243, 0.1)',
    eventColors: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#009688'],
    hourIndicatorColor: '#F44336',
    gridLineColor: '#E0E0E0',
    headerBackgroundColor: '#FFFFFF',
    unavailableHoursColor: 'rgba(240, 240, 240, 0.7)',
    weekendColor: '#F9F9F9',
    eventTextColor: '#FFFFFF',
    dragCreateIndicatorColor: 'rgba(33, 150, 243, 0.3)',
    dragMovePreviewColor: 'rgba(33, 150, 243, 0.4)',
    connectionLineColor: 'rgba(33, 150, 243, 0.7)',
    overlapIndicatorColor: 'rgba(244, 67, 54, 0.1)',
    successColor: '#4CAF50',
    errorColor: '#F44336',
    warningColor: '#FF9800',
  };

  // Configuración de feedback háptico
  const hapticOptions = {
    enabled: true,
    eventCreate: 'medium' as const,
    eventMove: 'light' as const,
    viewChange: 'light' as const,
    error: 'heavy' as const,
  };

  logger.debug('Calendar configuration', {
    selectedViewType,
    zoomLevel,
    theme: 'custom',
    hapticOptions,
    calendarConfig,
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.calendarContainer}>
          <Calendar
            events={events}
            initialViewType={selectedViewType}
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
            calendarConfig={{
              ...calendarConfig,
              dragPreviewConfig: {
                ...(calendarConfig.dragPreviewConfig || {}),
                previewOffset: 20,
                connectionLineWidth: 2,
                pagingScrollHours: 3,
                enablePagingScroll: true,
                showTargetLine: true,
                targetLineColor: '#4CD964',
                targetLineHeight: 2,
              },
            }}
          />
        </View>

        {/* Debug Controls */}
        <DebugControls calendarConfig={calendarConfig} onConfigChange={handleConfigChange} />
        <StatusBar style="auto" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Main App with logging provider
export default function App() {
  // Obtener la versión de la app dinámicamente del archivo app.json
  // Esto asegura que siempre usemos la versión correcta sin necesidad de actualizarla manualmente
  // La versión se usa para registro de actualizaciones y seguimiento de cambios
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const [updateConfig, setUpdateConfig] = useState({
    autoUpdate: false,
    lastUpdateCheck: null as string | null,
    updateHistory: [] as Array<{
      date: string;
      version: string;
      updateId: string;
      success: boolean;
    }>,
  });

  useEffect(() => {
    // Carga la configuración de actualizaciones guardada
    loadUpdateConfig();

    // Verifica actualizaciones al iniciar
    checkForUpdates();

    // Configura verificación periódica (cada 30 minutos)
    const updateInterval = setInterval(
      () => {
        checkForUpdates();
      },
      30 * 60 * 1000
    );

    // Limpia el intervalo al desmontar
    return () => clearInterval(updateInterval);
  }, []);

  // Carga la configuración de actualizaciones desde almacenamiento
  const loadUpdateConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('updateConfig');
      if (savedConfig) {
        setUpdateConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.log('Error loading update config:', error);
    }
  };

  // Guarda la configuración de actualizaciones
  const saveUpdateConfig = async (config: typeof updateConfig) => {
    try {
      await AsyncStorage.setItem('updateConfig', JSON.stringify(config));
      setUpdateConfig(config);
    } catch (error) {
      console.log('Error saving update config:', error);
    }
  };

  // Registra el historial de actualizaciones
  const logUpdateHistory = async (updateInfo: {
    id?: string;
    version?: string;
    success: boolean;
  }) => {
    const newHistory = [
      ...updateConfig.updateHistory,
      {
        date: new Date().toISOString(),
        version: updateInfo.version || 'unknown',
        updateId: updateInfo.id || 'unknown',
        success: updateInfo.success,
      },
    ];

    await saveUpdateConfig({
      ...updateConfig,
      updateHistory: newHistory,
      lastUpdateCheck: new Date().toISOString(),
    });
  };

  // Verifica si hay actualizaciones disponibles
  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await handleUpdateAvailable(update);
      } else {
        console.log('No updates available');
        await saveUpdateConfig({
          ...updateConfig,
          lastUpdateCheck: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
      // Intenta realizar rollback si el error es crítico
      await attemptRollbackOnError(error as Error);
    }
  }

  // Maneja cuando hay una actualización disponible
  async function handleUpdateAvailable(update: Updates.UpdateCheckResult) {
    try {
      // Descarga la actualización
      await Updates.fetchUpdateAsync();

      const updateId = update.manifest?.id || 'unknown';

      // Si actualización automática está habilitada
      if (updateConfig.autoUpdate) {
        await logUpdateHistory({
          id: updateId,
          version: appVersion,
          success: true,
        });

        // Reinicia automáticamente
        await Updates.reloadAsync();
      } else {
        // Notifica al usuario
        Alert.alert('Actualización Disponible', `Nueva actualización lista para instalar.`, [
          {
            text: 'Después',
            onPress: () =>
              logUpdateHistory({
                id: updateId,
                version: appVersion,
                success: false,
              }),
          },
          {
            text: 'Actualizar Ahora',
            onPress: async () => {
              await logUpdateHistory({
                id: updateId,
                version: appVersion,
                success: true,
              });
              await Updates.reloadAsync();
            },
          },
          {
            text: 'Actualizar Siempre',
            onPress: async () => {
              await saveUpdateConfig({
                ...updateConfig,
                autoUpdate: true,
              });
              await logUpdateHistory({
                id: updateId,
                version: appVersion,
                success: true,
              });
              await Updates.reloadAsync();
            },
          },
        ]);
      }
    } catch (error) {
      console.log('Error fetching update:', error);
      await logUpdateHistory({
        id: 'error',
        version: appVersion,
        success: false,
      });
    }
  }

  // Intenta hacer rollback en caso de error crítico
  async function attemptRollbackOnError(error: Error) {
    // Determina si el error es lo suficientemente grave para justificar un rollback
    const isCriticalError =
      error.message?.includes('critical') ||
      (error as any).code === 'ERR_UPDATES_MANIFEST' ||
      (error as any).code === 'ERR_UPDATES_FETCH';

    if (isCriticalError) {
      try {
        console.log('Attempting rollback due to critical error');
        // Muestra alerta de rollback
        Alert.alert(
          'Problema Detectado',
          'Se detectó un problema con la actualización. ¿Quiere volver a la versión anterior?',
          [
            { text: 'No' },
            {
              text: 'Sí, Volver',
              onPress: async () => {
                try {
                  // Limpia la caché como medida de recuperación
                  await handleCacheIssues();
                } catch (rollbackError) {
                  console.error('Error during recovery:', rollbackError);
                }
              },
            },
          ]
        );
      } catch (rollbackError) {
        console.error('Error in recovery process:', rollbackError);
      }
    }
  }

  // Maneja problemas de caché
  async function handleCacheIssues() {
    try {
      // Como expo-updates no tiene clearUpdatesAsync, reiniciamos la app
      Alert.alert(
        'Recuperación Necesaria',
        'La aplicación necesita reiniciarse para resolver problemas.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (error) {
                console.error('Error reloading app:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in recovery process:', error);
    }
  }

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
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  calendarContainer: {
    flex: 1,
  },
  debugControlsContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  debugButton: {
    backgroundColor: '#eee',
    padding: 6,
    borderRadius: 5,
    marginHorizontal: 2,
    marginVertical: 2,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugButtonText: {
    fontWeight: '500',
    color: '#333',
    fontSize: 11,
    textAlign: 'center',
  },
  debugSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 8,
  },
  debugSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 5,
    textAlign: 'center',
    color: '#333',
  },
});
