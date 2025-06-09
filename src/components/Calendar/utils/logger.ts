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
import Constants from 'expo-constants';

// Default log level configuration
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Basic configuration for logger
export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

// Default config
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: __DEV__, // Enable logs only in development by default
  minLevel: 'debug',
  prefix: '[Calendar]',
};

// Global config that can be updated
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG };

// Get app version (if available)
const APP_VERSION = Constants.expoConfig?.version || '0.0.0';

// Format timestamp
const getTimestamp = () => {
  try {
    const now = new Date();
    return now.toISOString().split('T')[1].substring(0, 8);
  } catch (error) {
    return '00:00:00';
  }
};

/**
 * Simple logger class with error handling
 */
class Logger {
  private config: LoggerConfig;
  private componentName: string;

  constructor(componentName: string, config: Partial<LoggerConfig> = {}) {
    this.componentName = componentName;
    this.config = {
      ...globalConfig,
      ...config,
    };
  }

  // Allow runtime configuration changes
  configure(config: Partial<LoggerConfig>): void {
    try {
      this.config = {
        ...this.config,
        ...config,
      };
    } catch (error) {
      console.error('Error configuring logger:', error);
    }
  }

  // Enable logging
  enable(): void {
    try {
      this.config.enabled = true;
    } catch (error) {
      console.error('Error enabling logger:', error);
    }
  }

  // Disable logging
  disable(): void {
    try {
      this.config.enabled = false;
    } catch (error) {
      console.error('Error disabling logger:', error);
    }
  }

  // Check if logging is enabled
  isEnabled(): boolean {
    try {
      return this.config.enabled;
    } catch (error) {
      console.error('Error checking if logger is enabled:', error);
      return false;
    }
  }

  // Log methods
  debug(message: string, ...args: any[]): void {
    try {
      this.log('debug', message, ...args);
    } catch (error) {
      console.error('Error in debug log:', error);
    }
  }

  info(message: string, ...args: any[]): void {
    try {
      this.log('info', message, ...args);
    } catch (error) {
      console.error('Error in info log:', error);
    }
  }

  warn(message: string, ...args: any[]): void {
    try {
      this.log('warn', message, ...args);
    } catch (error) {
      console.error('Error in warn log:', error);
    }
  }

  error(message: string, ...args: any[]): void {
    try {
      this.log('error', message, ...args);
    } catch (error) {
      console.error('Error in error log:', error);
    }
  }

  // Core logging function with error handling
  private log(level: LogLevel, message: string, ...args: any[]): void {
    try {
      // Only log if enabled and level is high enough
      if (!this.config.enabled || LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
        return;
      }

      // Format log prefix
      const prefix = `${this.config.prefix || ''}[${this.componentName}]`;
      const timestamp = getTimestamp();
      const formattedMessage = `${timestamp} ${prefix} ${message}`;

      // Simple implementation that directly uses console
      // This avoids complex formatting that could cause issues
      switch (level) {
        case 'debug':
          console.log(formattedMessage, ...args);
          break;
        case 'info':
          console.info(formattedMessage, ...args);
          break;
        case 'warn':
          console.warn(formattedMessage, ...args);
          break;
        case 'error':
          console.error(formattedMessage, ...args);
          break;
      }
    } catch (error) {
      // Last resort fallback if something goes wrong in the logging itself
      console.error('Critical error in logger:', error);

      // Try a very simple console.log as fallback
      try {
        console.log(`FALLBACK LOG (${level}): ${message}`);
      } catch {
        // Nothing else we can do
      }
    }
  }
}

// Update global logger config from performance config
export const updateLoggerFromConfig = (config?: Partial<LoggerConfig>): void => {
  try {
    if (config) {
      globalConfig = { ...globalConfig, ...config };
    }
  } catch (error) {
    console.error('Error updating logger config:', error);
  }
};

// Define a minimal logger interface
interface MinimalLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  configure: (config: Partial<LoggerConfig>) => void;
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
}

// Create a component-specific logger
export const useLogger = (componentName: string): MinimalLogger => {
  try {
    return new Logger(componentName);
  } catch (error) {
    console.error('Error creating logger:', error);

    // Return a minimal fallback logger that won't crash
    return {
      debug: (message: string) => console.log(message),
      info: (message: string) => console.info(message),
      warn: (message: string) => console.warn(message),
      error: (message: string) => console.error(message),
      configure: () => {
        /* empty implementation */
      },
      enable: () => {
        /* empty implementation */
      },
      disable: () => {
        /* empty implementation */
      },
      isEnabled: () => false,
    };
  }
};

// Singleton logger instance for direct use
const logger = new Logger('Global');
export default logger;
