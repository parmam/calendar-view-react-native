/**
 * Sistema de logging para el calendario
 *
 * Este módulo proporciona utilidades para registrar información, advertencias y errores
 * durante la ejecución del calendario. El logging puede habilitarse o deshabilitarse
 * globalmente mediante la configuración PERFORMANCE_CONFIG.
 *
 * EJEMPLOS DE USO:
 *
 * 1. Para deshabilitar completamente el logging (recomendado para producción):
 *
 *    // A nivel de aplicación
 *    import { useCalendarConfig } from 'path/to/calendar/config';
 *
 *    const { updatePerformanceConfig } = useCalendarConfig();
 *    updatePerformanceConfig({ LOGGING_ENABLED: false });
 *
 *    // O directamente
 *    import { configManager } from 'path/to/calendar/config';
 *
 *    configManager.updatePerformanceConfig({ LOGGING_ENABLED: false });
 *
 * 2. Para cambiar el nivel de logging (mostrar solo errores):
 *
 *    import { useCalendarConfig } from 'path/to/calendar/config';
 *
 *    const { updatePerformanceConfig } = useCalendarConfig();
 *    updatePerformanceConfig({ LOGGING_LEVEL: "error" });
 *
 * 3. Para usar el logger en un componente:
 *
 *    import { useLogger } from 'path/to/calendar/utils/logger';
 *
 *    function MyComponent() {
 *      const logger = useLogger("MyComponent");
 *
 *      // Diferentes niveles de log
 *      logger.debug("Información detallada para depuración");
 *      logger.info("Información general");
 *      logger.warn("Advertencia");
 *      logger.error("Error crítico", { detalles: "..." });
 *
 *      // ...
 *    }
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { PERFORMANCE_CONFIG } from "../config/calendarConfig";
import { Platform } from "react-native";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Configuration for the logger
export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: PERFORMANCE_CONFIG.LOGGING_ENABLED, // Use the configuration from PERFORMANCE_CONFIG
  minLevel: PERFORMANCE_CONFIG.LOGGING_LEVEL as LogLevel, // Use the log level from PERFORMANCE_CONFIG
  prefix: "[Calendar]",
};

// Global logger state
let globalEnabled = DEFAULT_CONFIG.enabled;

// Debug levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level - set to DEBUG for debugging auto-scrolling
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

// Enable specific component logging
const ENABLED_COMPONENTS: Record<string, boolean> = {
  TimeGrid: true,
  Event: true,
  Calendar: true,
  // Add any other components as needed
};

// Format timestamp
const getTimestamp = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
};

// Logger utility class
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Configure the logger
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.enabled !== undefined) {
      globalEnabled = config.enabled;
    }
  }

  // Enable logging
  enable(): void {
    this.config.enabled = true;
    globalEnabled = true;
  }

  // Disable logging
  disable(): void {
    this.config.enabled = false;
    globalEnabled = false;
  }

  // Check if logging is enabled
  isEnabled(): boolean {
    return this.config.enabled && globalEnabled;
  }

  // Log methods
  debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log("error", message, ...args);
  }

  // Internal log method
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.isEnabled()) return;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    if (levels[level] < levels[this.config.minLevel]) return;

    const prefix = this.config.prefix ? `${this.config.prefix} ` : "";
    const formattedMessage = `${prefix}[${level.toUpperCase()}] ${message}`;

    try {
      switch (level) {
        case "debug":
          console.debug(formattedMessage, ...args);
          break;
        case "info":
          console.info(formattedMessage, ...args);
          break;
        case "warn":
          console.warn(formattedMessage, ...args);
          break;
        case "error":
          console.error(formattedMessage, ...args);
          break;
      }
    } catch (e) {
      // Silent fail on logging errors
    }
  }
}

// Create a singleton instance
export const logger = new Logger();

/**
 * Actualiza la configuración del logger basada en los cambios de PERFORMANCE_CONFIG
 *
 * Esta función debe ser llamada cuando se actualizan las configuraciones
 * de rendimiento para asegurar que los cambios en la configuración de logging
 * se reflejen en el comportamiento del logger.
 */
export const updateLoggerFromConfig = () => {
  logger.configure({
    enabled: PERFORMANCE_CONFIG.LOGGING_ENABLED,
    minLevel: PERFORMANCE_CONFIG.LOGGING_LEVEL as LogLevel,
  });
};

// React hook for using the logger in components
export const useLogger = (componentName: string) => {
  const isEnabled = ENABLED_COMPONENTS[componentName] !== false;

  const formatMessage = (level: string, message: string, data?: any) => {
    const timestamp = getTimestamp();
    const dataString = data ? ` ${JSON.stringify(data, null, 2)}` : "";
    return `[${timestamp}] [${level}] [${componentName}] ${message}${dataString}`;
  };

  return {
    debug: (message: string, data?: any) => {
      if (isEnabled && CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
        console.log(formatMessage("DEBUG", message, data));
      }
    },

    info: (message: string, data?: any) => {
      if (isEnabled && CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
        console.info(formatMessage("INFO", message, data));
      }
    },

    warn: (message: string, data?: any) => {
      if (isEnabled && CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
        console.warn(formatMessage("WARN", message, data));
      }
    },

    error: (message: string, data?: any) => {
      if (isEnabled && CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
        console.error(formatMessage("ERROR", message, data));
      }
    },
  };
};

// Hook to control logging in components with minimum re-renders
export const useLoggingControl = () => {
  // Track logging state
  const [loggingEnabled, setLoggingEnabled] = useState<boolean>(globalEnabled);

  // Update state when global state changes
  useEffect(() => {
    setLoggingEnabled(globalEnabled);
  }, []);

  const enableLogging = useCallback(() => {
    logger.enable();
    setLoggingEnabled(true);
  }, []);

  const disableLogging = useCallback(() => {
    logger.disable();
    setLoggingEnabled(false);
  }, []);

  const configureLogging = useCallback((config: Partial<LoggerConfig>) => {
    logger.configure(config);
    if (config.enabled !== undefined) {
      setLoggingEnabled(config.enabled);
    }
  }, []);

  return {
    loggingEnabled,
    enableLogging,
    disableLogging,
    configureLogging,
  };
};

export default logger;
