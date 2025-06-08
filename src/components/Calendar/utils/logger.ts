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

import { useState, useCallback, useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '../config/calendarConfig';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configuration for the logger
export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

// Configuración inicial por defecto - reducir verbosidad
const initialConfig: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  minLevel: process.env.NODE_ENV === 'development' ? 'warn' : 'error',
  prefix: '[Calendar]',
};

// Global logger state
let globalEnabled = initialConfig.enabled;

// Format timestamp
const getTimestamp = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;
};

// Logger utility class
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...initialConfig, ...config };

    // Desactivar logs verbosos en producción por defecto
    if (process.env.NODE_ENV === 'production') {
      this.config.minLevel = 'error';
    }
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
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  // Internal log method
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Skip logging if disabled or below minimum level
    if (!this.config.enabled) return;

    const levelPriority = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    if (levelPriority[level] < levelPriority[this.config.minLevel]) {
      return;
    }

    // Skip expensive operations for debug logs when dragging
    if (level === 'debug' && message.includes('drag')) {
      if (Math.random() > 0.05) return; // Solo mostrar 5% de logs de arrastre
    }

    // Simple console output with minimal processing
    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    const timestamp = getTimestamp();

    switch (level) {
      case 'debug':
        console.debug(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'info':
        console.info(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'warn':
        console.warn(`${timestamp} ${prefix}${message}`, ...args);
        break;
      case 'error':
        console.error(`${timestamp} ${prefix}${message}`, ...args);
        break;
    }
  }
}

// Create a singleton instance
const globalLogger = new Logger();

/**
 * Actualiza la configuración del logger basada en los cambios de PERFORMANCE_CONFIG
 *
 * Esta función debe ser llamada cuando se actualizan las configuraciones
 * de rendimiento para asegurar que los cambios en la configuración de logging
 * se reflejen en el comportamiento del logger.
 */
export const updateLoggerFromConfig = () => {
  globalLogger.configure({
    enabled: PERFORMANCE_CONFIG.LOGGING_ENABLED,
    minLevel: PERFORMANCE_CONFIG.LOGGING_LEVEL as LogLevel,
  });
};

// React hook for using the logger in components
export const useLogger = (componentName: string) => {
  const formatMessage = (level: string, message: string) => {
    return `[${componentName}] ${message}`;
  };

  return {
    debug: (message: string, data?: any) => {
      globalLogger.debug(formatMessage('debug', message), data);
    },
    info: (message: string, data?: any) => {
      globalLogger.info(formatMessage('info', message), data);
    },
    warn: (message: string, data?: any) => {
      globalLogger.warn(formatMessage('warn', message), data);
    },
    error: (message: string, data?: any) => {
      globalLogger.error(formatMessage('error', message), data);
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
    globalLogger.enable();
    setLoggingEnabled(true);
  }, []);

  const disableLogging = useCallback(() => {
    globalLogger.disable();
    setLoggingEnabled(false);
  }, []);

  const configureLogging = useCallback((config: Partial<LoggerConfig>) => {
    globalLogger.configure(config);
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

export default globalLogger;
