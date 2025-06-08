/**
 * Administrador de Configuraciones del Calendario
 *
 * Esta clase proporciona métodos para acceder y modificar las configuraciones
 * del calendario de forma dinámica durante la ejecución de la aplicación.
 */

import {
  DEFAULT_THEME,
  DEFAULT_TIME_RANGE,
  DEFAULT_HAPTIC_OPTIONS,
  DEFAULT_DRAG_PREVIEW_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  INITIAL_CALENDAR_STATE,
  LAYOUT_CONFIG,
  ANIMATION_CONFIG,
  OVERLAP_CONFIG,
  DEFAULT_UNAVAILABLE_HOURS,
  PERFORMANCE_CONFIG,
} from './calendarConfig';

import {
  CalendarTheme,
  TimeRange,
  HapticOptions,
  CalendarConfig,
  UnavailableHours,
  DragPreviewConfig,
  CalendarViewType,
} from '../types';

import { updateLoggerFromConfig } from '../utils/logger';

/**
 * Clase para administrar la configuración del calendario
 */
class CalendarConfigManager {
  // Propiedades privadas para almacenar configuraciones
  private theme: CalendarTheme;

  private timeRange: TimeRange;

  private hapticOptions: HapticOptions;

  private calendarConfig: CalendarConfig;

  private layoutConfig: typeof LAYOUT_CONFIG;

  private animationConfig: typeof ANIMATION_CONFIG;

  private overlapConfig: typeof OVERLAP_CONFIG;

  private unavailableHours: UnavailableHours | null;

  private performanceConfig: typeof PERFORMANCE_CONFIG;

  private calendarState: typeof INITIAL_CALENDAR_STATE;

  // Lista de suscriptores para notificar cambios
  private subscribers: Array<() => void> = [];

  /**
   * Constructor que inicializa todas las configuraciones con valores predeterminados
   */
  constructor() {
    // Inicializar con valores predeterminados
    this.theme = { ...DEFAULT_THEME };
    this.timeRange = { ...DEFAULT_TIME_RANGE };
    this.hapticOptions = { ...DEFAULT_HAPTIC_OPTIONS };
    this.calendarConfig = {
      ...DEFAULT_CALENDAR_CONFIG,
      dragPreviewConfig: { ...DEFAULT_DRAG_PREVIEW_CONFIG },
    };
    this.layoutConfig = { ...LAYOUT_CONFIG };
    this.animationConfig = { ...ANIMATION_CONFIG };
    this.overlapConfig = { ...OVERLAP_CONFIG };
    this.unavailableHours = DEFAULT_UNAVAILABLE_HOURS ? { ...DEFAULT_UNAVAILABLE_HOURS } : null;
    this.performanceConfig = { ...PERFORMANCE_CONFIG };
    this.calendarState = { ...INITIAL_CALENDAR_STATE };
  }

  /**
   * Obtener el tema actual
   */
  getTheme(): CalendarTheme {
    return { ...this.theme };
  }

  /**
   * Actualizar el tema
   */
  updateTheme(theme: Partial<CalendarTheme>): void {
    this.theme = { ...this.theme, ...theme };
    this.notifySubscribers();
  }

  /**
   * Obtener el rango de tiempo
   */
  getTimeRange(): TimeRange {
    return { ...this.timeRange };
  }

  /**
   * Actualizar el rango de tiempo
   */
  updateTimeRange(timeRange: Partial<TimeRange>): void {
    this.timeRange = { ...this.timeRange, ...timeRange };
    this.notifySubscribers();
  }

  /**
   * Obtener las opciones hápticas
   */
  getHapticOptions(): HapticOptions {
    return { ...this.hapticOptions };
  }

  /**
   * Actualizar las opciones hápticas
   */
  updateHapticOptions(options: Partial<HapticOptions>): void {
    this.hapticOptions = { ...this.hapticOptions, ...options };
    this.notifySubscribers();
  }

  /**
   * Obtener la configuración del calendario
   */
  getCalendarConfig(): CalendarConfig {
    return {
      ...this.calendarConfig,
      dragPreviewConfig: { ...this.calendarConfig.dragPreviewConfig },
    };
  }

  /**
   * Actualizar la configuración del calendario
   */
  updateCalendarConfig(config: Partial<CalendarConfig>): void {
    // Manejar la actualización de la configuración de arrastrar previsualizaciones separadamente
    if (config.dragPreviewConfig) {
      this.calendarConfig.dragPreviewConfig = {
        ...this.calendarConfig.dragPreviewConfig,
        ...config.dragPreviewConfig,
      };

      // Eliminar para evitar duplicación
      const { dragPreviewConfig, ...restConfig } = config;
      this.calendarConfig = { ...this.calendarConfig, ...restConfig };
    } else {
      this.calendarConfig = { ...this.calendarConfig, ...config };
    }

    this.notifySubscribers();
  }

  /**
   * Obtener la configuración de layout
   */
  getLayoutConfig(): typeof LAYOUT_CONFIG {
    return { ...this.layoutConfig };
  }

  /**
   * Actualizar la configuración de layout
   */
  updateLayoutConfig(config: Partial<typeof LAYOUT_CONFIG>): void {
    this.layoutConfig = { ...this.layoutConfig, ...config };
    this.notifySubscribers();
  }

  /**
   * Obtener la configuración de animaciones
   */
  getAnimationConfig(): typeof ANIMATION_CONFIG {
    return { ...this.animationConfig };
  }

  /**
   * Actualizar la configuración de animaciones
   */
  updateAnimationConfig(config: Partial<typeof ANIMATION_CONFIG>): void {
    this.animationConfig = { ...this.animationConfig, ...config };
    this.notifySubscribers();
  }

  /**
   * Obtener la configuración de superposición
   */
  getOverlapConfig(): typeof OVERLAP_CONFIG {
    return { ...this.overlapConfig };
  }

  /**
   * Actualizar la configuración de superposición
   */
  updateOverlapConfig(config: Partial<typeof OVERLAP_CONFIG>): void {
    this.overlapConfig = { ...this.overlapConfig, ...config };
    this.notifySubscribers();
  }

  /**
   * Obtener las horas no disponibles
   */
  getUnavailableHours(): UnavailableHours | null {
    return this.unavailableHours ? { ...this.unavailableHours } : null;
  }

  /**
   * Actualizar las horas no disponibles
   */
  updateUnavailableHours(hours: UnavailableHours | null): void {
    this.unavailableHours = hours ? { ...hours } : null;
    this.notifySubscribers();
  }

  /**
   * Obtener la configuración de rendimiento
   */
  getPerformanceConfig(): typeof PERFORMANCE_CONFIG {
    return { ...this.performanceConfig };
  }

  /**
   * Actualizar la configuración de rendimiento
   */
  updatePerformanceConfig(config: Partial<typeof PERFORMANCE_CONFIG>): void {
    const previousLoggingEnabled = this.performanceConfig.LOGGING_ENABLED;
    const previousLoggingLevel = this.performanceConfig.LOGGING_LEVEL;

    this.performanceConfig = { ...this.performanceConfig, ...config };
    this.notifySubscribers();

    // Si la configuración de logging ha cambiado, actualizar el logger
    if (
      previousLoggingEnabled !== this.performanceConfig.LOGGING_ENABLED ||
      previousLoggingLevel !== this.performanceConfig.LOGGING_LEVEL
    ) {
      updateLoggerFromConfig();
    }
  }

  /**
   * Obtener el estado del calendario
   */
  getCalendarState(): typeof INITIAL_CALENDAR_STATE {
    return { ...this.calendarState };
  }

  /**
   * Actualizar el estado del calendario
   */
  updateCalendarState(state: Partial<typeof INITIAL_CALENDAR_STATE>): void {
    this.calendarState = { ...this.calendarState, ...state };
    this.notifySubscribers();
  }

  /**
   * Restablecer todas las configuraciones a los valores predeterminados
   */
  resetToDefaults(): void {
    const previousLoggingEnabled = this.performanceConfig.LOGGING_ENABLED;
    const previousLoggingLevel = this.performanceConfig.LOGGING_LEVEL;

    this.theme = { ...DEFAULT_THEME };
    this.timeRange = { ...DEFAULT_TIME_RANGE };
    this.hapticOptions = { ...DEFAULT_HAPTIC_OPTIONS };
    this.calendarConfig = {
      ...DEFAULT_CALENDAR_CONFIG,
      dragPreviewConfig: { ...DEFAULT_DRAG_PREVIEW_CONFIG },
    };
    this.layoutConfig = { ...LAYOUT_CONFIG };
    this.animationConfig = { ...ANIMATION_CONFIG };
    this.overlapConfig = { ...OVERLAP_CONFIG };
    this.unavailableHours = DEFAULT_UNAVAILABLE_HOURS ? { ...DEFAULT_UNAVAILABLE_HOURS } : null;
    this.performanceConfig = { ...PERFORMANCE_CONFIG };
    this.calendarState = { ...INITIAL_CALENDAR_STATE };

    this.notifySubscribers();

    // Si la configuración de logging ha cambiado, actualizar el logger
    if (
      previousLoggingEnabled !== this.performanceConfig.LOGGING_ENABLED ||
      previousLoggingLevel !== this.performanceConfig.LOGGING_LEVEL
    ) {
      updateLoggerFromConfig();
    }
  }

  /**
   * Exportar la configuración actual como JSON
   */
  exportConfig(): string {
    const config = {
      theme: this.theme,
      timeRange: this.timeRange,
      hapticOptions: this.hapticOptions,
      calendarConfig: this.calendarConfig,
      layoutConfig: this.layoutConfig,
      animationConfig: this.animationConfig,
      overlapConfig: this.overlapConfig,
      unavailableHours: this.unavailableHours,
      performanceConfig: this.performanceConfig,
      calendarState: this.calendarState,
    };

    return JSON.stringify(config);
  }

  /**
   * Importar configuración desde JSON
   */
  importConfig(jsonConfig: string): void {
    try {
      const config = JSON.parse(jsonConfig);
      const previousLoggingEnabled = this.performanceConfig.LOGGING_ENABLED;
      const previousLoggingLevel = this.performanceConfig.LOGGING_LEVEL;

      // Actualizar las configuraciones si existen en el JSON
      if (config.theme) this.theme = { ...this.theme, ...config.theme };
      if (config.timeRange) this.timeRange = { ...this.timeRange, ...config.timeRange };
      if (config.hapticOptions)
        this.hapticOptions = { ...this.hapticOptions, ...config.hapticOptions };
      if (config.calendarConfig) {
        if (config.calendarConfig.dragPreviewConfig) {
          this.calendarConfig.dragPreviewConfig = {
            ...this.calendarConfig.dragPreviewConfig,
            ...config.calendarConfig.dragPreviewConfig,
          };
        }
        this.calendarConfig = {
          ...this.calendarConfig,
          ...config.calendarConfig,
        };
      }
      if (config.layoutConfig) this.layoutConfig = { ...this.layoutConfig, ...config.layoutConfig };
      if (config.animationConfig)
        this.animationConfig = {
          ...this.animationConfig,
          ...config.animationConfig,
        };
      if (config.overlapConfig)
        this.overlapConfig = { ...this.overlapConfig, ...config.overlapConfig };
      if (config.unavailableHours) this.unavailableHours = { ...config.unavailableHours };
      if (config.performanceConfig)
        this.performanceConfig = {
          ...this.performanceConfig,
          ...config.performanceConfig,
        };
      if (config.calendarState)
        this.calendarState = { ...this.calendarState, ...config.calendarState };

      this.notifySubscribers();

      // Si la configuración de logging ha cambiado, actualizar el logger
      if (
        previousLoggingEnabled !== this.performanceConfig.LOGGING_ENABLED ||
        previousLoggingLevel !== this.performanceConfig.LOGGING_LEVEL
      ) {
        updateLoggerFromConfig();
      }
    } catch (error) {
      console.error('Error al importar configuración:', error);
    }
  }

  /**
   * Suscribirse a cambios en la configuración
   * @param callback Función a llamar cuando cambie la configuración
   * @returns Función para anular la suscripción
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notificar a todos los suscriptores sobre cambios en la configuración
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

// Exportar una instancia singleton
const configManager = new CalendarConfigManager();
export default configManager;
