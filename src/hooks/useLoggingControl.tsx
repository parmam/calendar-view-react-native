import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import logger, { LoggerConfig } from '../components/Calendar/utils/logger';

// Create a context for logging configuration
interface LoggingContextType {
  loggingEnabled: boolean;
  enableLogging: () => void;
  disableLogging: () => void;
  configureLogging: (config: Partial<LoggerConfig>) => void;
}

const LoggingContext = createContext<LoggingContextType>({
  loggingEnabled: __DEV__, // Default to enabled in development
  enableLogging: () => {
    /* noop */
  },
  disableLogging: () => {
    /* noop */
  },
  configureLogging: () => {
    /* noop */
  },
});

// Provider component to wrap the app
export const LoggingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get initial state from logger
  const [loggingEnabled, setLoggingEnabled] = useState<boolean>(true);

  // Initialize logging based on environment
  useEffect(() => {
    try {
      // In development, always enable logs
      if (__DEV__) {
        logger.enable();
        setLoggingEnabled(true);
        console.log('Logging enabled in development mode');
      } else {
        // In production, disable verbose logs
        logger.configure({ minLevel: 'warn' });
      }
    } catch (error) {
      console.error('Error initializing logging:', error);
    }
  }, []);

  // Enable logging
  const enableLogging = useCallback(() => {
    try {
      logger.enable();
      setLoggingEnabled(true);
      console.log('Logging enabled');
    } catch (error) {
      console.error('Error enabling logging:', error);
    }
  }, []);

  // Disable logging
  const disableLogging = useCallback(() => {
    try {
      logger.disable();
      setLoggingEnabled(false);
      console.log('Logging disabled');
    } catch (error) {
      console.error('Error disabling logging:', error);
    }
  }, []);

  // Configure logger
  const configureLogging = useCallback((config: Partial<LoggerConfig>) => {
    try {
      logger.configure(config);
      if (config.enabled !== undefined) {
        setLoggingEnabled(config.enabled);
      }
      console.log('Logging configured:', config);
    } catch (error) {
      console.error('Error configuring logging:', error);
    }
  }, []);

  return (
    <LoggingContext.Provider
      value={{
        loggingEnabled,
        enableLogging,
        disableLogging,
        configureLogging,
      }}
    >
      {children}
    </LoggingContext.Provider>
  );
};

// Hook to use the logging context
export const useLoggingControl = () => useContext(LoggingContext);

export default useLoggingControl;
