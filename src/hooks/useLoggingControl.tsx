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
  const [loggingEnabled, setLoggingEnabled] = useState<boolean>(logger.isEnabled());

  // Enable logging
  const enableLogging = useCallback(() => {
    logger.enable();
    setLoggingEnabled(true);
  }, []);

  // Disable logging
  const disableLogging = useCallback(() => {
    logger.disable();
    setLoggingEnabled(false);
  }, []);

  // Configure logger
  const configureLogging = useCallback((config: Partial<LoggerConfig>) => {
    logger.configure(config);
    if (config.enabled !== undefined) {
      setLoggingEnabled(config.enabled);
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
