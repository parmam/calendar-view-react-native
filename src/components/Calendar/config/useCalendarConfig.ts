/**
 * Hook para acceder a la configuración del calendario
 *
 * Este hook permite acceder y manipular las configuraciones del calendario
 * desde cualquier componente funcional de React y re-renderizará
 * automáticamente el componente cuando las configuraciones cambien.
 */

import { useState, useEffect, useCallback } from "react";
import configManager from "./configManager";
import {
  CalendarTheme,
  TimeRange,
  HapticOptions,
  CalendarConfig,
  UnavailableHours,
  CalendarViewType,
} from "../types";
import {
  LAYOUT_CONFIG,
  ANIMATION_CONFIG,
  OVERLAP_CONFIG,
  PERFORMANCE_CONFIG,
  INITIAL_CALENDAR_STATE,
} from "./calendarConfig";
import { updateLoggerFromConfig } from "../utils/logger";

/**
 * Hook para acceder a todas las configuraciones del calendario
 */
export const useCalendarConfig = () => {
  // Estados para cada tipo de configuración
  const [theme, setThemeState] = useState<CalendarTheme>(
    configManager.getTheme()
  );
  const [timeRange, setTimeRangeState] = useState<TimeRange>(
    configManager.getTimeRange()
  );
  const [hapticOptions, setHapticOptionsState] = useState<HapticOptions>(
    configManager.getHapticOptions()
  );
  const [calendarConfig, setCalendarConfigState] = useState<CalendarConfig>(
    configManager.getCalendarConfig()
  );
  const [layoutConfig, setLayoutConfigState] = useState(
    configManager.getLayoutConfig()
  );
  const [animationConfig, setAnimationConfigState] = useState(
    configManager.getAnimationConfig()
  );
  const [overlapConfig, setOverlapConfigState] = useState(
    configManager.getOverlapConfig()
  );
  const [unavailableHours, setUnavailableHoursState] =
    useState<UnavailableHours | null>(configManager.getUnavailableHours());
  const [performanceConfig, setPerformanceConfigState] = useState(
    configManager.getPerformanceConfig()
  );
  const [calendarState, setCalendarStateState] = useState(
    configManager.getCalendarState()
  );

  // Funciones para actualizar configuraciones
  const updateTheme = useCallback((newTheme: Partial<CalendarTheme>) => {
    configManager.updateTheme(newTheme);
  }, []);

  const updateTimeRange = useCallback((newTimeRange: Partial<TimeRange>) => {
    configManager.updateTimeRange(newTimeRange);
  }, []);

  const updateHapticOptions = useCallback(
    (newOptions: Partial<HapticOptions>) => {
      configManager.updateHapticOptions(newOptions);
    },
    []
  );

  const updateCalendarConfig = useCallback(
    (newConfig: Partial<CalendarConfig>) => {
      configManager.updateCalendarConfig(newConfig);
    },
    []
  );

  const updateLayoutConfig = useCallback(
    (newConfig: Partial<typeof LAYOUT_CONFIG>) => {
      configManager.updateLayoutConfig(newConfig);
    },
    []
  );

  const updateAnimationConfig = useCallback(
    (newConfig: Partial<typeof ANIMATION_CONFIG>) => {
      configManager.updateAnimationConfig(newConfig);
    },
    []
  );

  const updateOverlapConfig = useCallback(
    (newConfig: Partial<typeof OVERLAP_CONFIG>) => {
      configManager.updateOverlapConfig(newConfig);
    },
    []
  );

  const updateUnavailableHours = useCallback(
    (newHours: UnavailableHours | null) => {
      configManager.updateUnavailableHours(newHours);
    },
    []
  );

  const updatePerformanceConfig = useCallback(
    (newConfig: Partial<typeof PERFORMANCE_CONFIG>) => {
      configManager.updatePerformanceConfig(newConfig);

      // Si la configuración incluye cambios en el logging, actualizar el logger
      if (
        newConfig.LOGGING_ENABLED !== undefined ||
        newConfig.LOGGING_LEVEL !== undefined
      ) {
        updateLoggerFromConfig();
      }
    },
    []
  );

  const updateCalendarState = useCallback(
    (newState: Partial<typeof INITIAL_CALENDAR_STATE>) => {
      configManager.updateCalendarState(newState);
    },
    []
  );

  // Función para restablecer todas las configuraciones
  const resetToDefaults = useCallback(() => {
    configManager.resetToDefaults();
  }, []);

  // Exportar e importar configuraciones
  const exportConfig = useCallback(() => {
    return configManager.exportConfig();
  }, []);

  const importConfig = useCallback((jsonConfig: string) => {
    configManager.importConfig(jsonConfig);
  }, []);

  // Suscribirse a cambios en la configuración
  useEffect(() => {
    const refreshConfigs = () => {
      setThemeState(configManager.getTheme());
      setTimeRangeState(configManager.getTimeRange());
      setHapticOptionsState(configManager.getHapticOptions());
      setCalendarConfigState(configManager.getCalendarConfig());
      setLayoutConfigState(configManager.getLayoutConfig());
      setAnimationConfigState(configManager.getAnimationConfig());
      setOverlapConfigState(configManager.getOverlapConfig());
      setUnavailableHoursState(configManager.getUnavailableHours());
      setPerformanceConfigState(configManager.getPerformanceConfig());
      setCalendarStateState(configManager.getCalendarState());
    };

    // Suscribirse a cambios
    const unsubscribe = configManager.subscribe(refreshConfigs);

    // Limpiar la suscripción al desmontar
    return unsubscribe;
  }, []);

  // Retornar todas las configuraciones y métodos para actualizarlas
  return {
    // Configuraciones
    theme,
    timeRange,
    hapticOptions,
    calendarConfig,
    layoutConfig,
    animationConfig,
    overlapConfig,
    unavailableHours,
    performanceConfig,
    calendarState,

    // Métodos para actualizar configuraciones
    updateTheme,
    updateTimeRange,
    updateHapticOptions,
    updateCalendarConfig,
    updateLayoutConfig,
    updateAnimationConfig,
    updateOverlapConfig,
    updateUnavailableHours,
    updatePerformanceConfig,
    updateCalendarState,

    // Funciones de utilidad
    resetToDefaults,
    exportConfig,
    importConfig,
  };
};

/**
 * Hooks específicos para acceder a configuraciones individuales
 */

// Hook para acceder solo al tema
export const useCalendarTheme = () => {
  const [theme, setThemeState] = useState<CalendarTheme>(
    configManager.getTheme()
  );

  const updateTheme = useCallback((newTheme: Partial<CalendarTheme>) => {
    configManager.updateTheme(newTheme);
  }, []);

  useEffect(() => {
    const refreshTheme = () => {
      setThemeState(configManager.getTheme());
    };

    return configManager.subscribe(refreshTheme);
  }, []);

  return { theme, updateTheme };
};

// Hook para acceder a la configuración de layout
export const useLayoutConfig = () => {
  const [layoutConfig, setLayoutConfigState] = useState(
    configManager.getLayoutConfig()
  );

  const updateLayoutConfig = useCallback(
    (newConfig: Partial<typeof LAYOUT_CONFIG>) => {
      configManager.updateLayoutConfig(newConfig);
    },
    []
  );

  useEffect(() => {
    const refreshConfig = () => {
      setLayoutConfigState(configManager.getLayoutConfig());
    };

    return configManager.subscribe(refreshConfig);
  }, []);

  return { layoutConfig, updateLayoutConfig };
};

// Hook para acceder a la configuración de solapamiento de eventos
export const useOverlapConfig = () => {
  const [overlapConfig, setOverlapConfigState] = useState(
    configManager.getOverlapConfig()
  );

  const updateOverlapConfig = useCallback(
    (newConfig: Partial<typeof OVERLAP_CONFIG>) => {
      configManager.updateOverlapConfig(newConfig);
    },
    []
  );

  useEffect(() => {
    const refreshConfig = () => {
      setOverlapConfigState(configManager.getOverlapConfig());
    };

    return configManager.subscribe(refreshConfig);
  }, []);

  return { overlapConfig, updateOverlapConfig };
};

// Hook para acceder al estado básico del calendario (vista, fecha, etc.)
export const useCalendarState = () => {
  const [calendarState, setCalendarStateState] = useState(
    configManager.getCalendarState()
  );

  const updateCalendarState = useCallback(
    (newState: Partial<typeof INITIAL_CALENDAR_STATE>) => {
      configManager.updateCalendarState(newState);
    },
    []
  );

  useEffect(() => {
    const refreshState = () => {
      setCalendarStateState(configManager.getCalendarState());
    };

    return configManager.subscribe(refreshState);
  }, []);

  return {
    calendarState,
    updateCalendarState,
    // Shortcuts para valores comunes
    viewType: calendarState.viewType,
    setViewType: (viewType: CalendarViewType) =>
      updateCalendarState({ viewType }),
    selectedDate: calendarState.selectedDate,
    setSelectedDate: (selectedDate: Date) =>
      updateCalendarState({ selectedDate }),
    zoomLevel: calendarState.zoomLevel,
    setZoomLevel: (zoomLevel: number) => updateCalendarState({ zoomLevel }),
  };
};

// Exportar todo por defecto
export default useCalendarConfig;
