/**
 * Configuración del Calendario
 *
 * Este archivo centraliza las exportaciones de todos los componentes,
 * hooks y utilidades relacionados con la configuración del calendario.
 */

// Importar configuraciones para uso interno
import {
  LAYOUT_CONFIG as LayoutConfig,
  ANIMATION_CONFIG,
  DEFAULT_THEME,
  DEFAULT_TIME_RANGE,
  DEFAULT_HAPTIC_OPTIONS,
  DEFAULT_DRAG_PREVIEW_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  INITIAL_CALENDAR_STATE,
  OVERLAP_CONFIG,
  DEFAULT_UNAVAILABLE_HOURS,
  PERFORMANCE_CONFIG,
} from './calendarConfig';

// Exportar valores de configuración predeterminados
export {
  LAYOUT_CONFIG,
  ANIMATION_CONFIG,
  DEFAULT_THEME,
  DEFAULT_TIME_RANGE,
  DEFAULT_HAPTIC_OPTIONS,
  DEFAULT_DRAG_PREVIEW_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  INITIAL_CALENDAR_STATE,
  OVERLAP_CONFIG,
  DEFAULT_UNAVAILABLE_HOURS,
  PERFORMANCE_CONFIG,
} from './calendarConfig';

// Exportar el administrador de configuración
export { default as configManager } from './configManager';

// Exportar hooks para acceder a la configuración
export {
  useCalendarConfig,
  useCalendarTheme,
  useLayoutConfig,
  useOverlapConfig,
  useCalendarState,
} from './useCalendarConfig';

// Exportar una función auxiliar para crear un evento de prueba
export const createTestEvent = (
  title: string,
  startHour: number,
  durationMinutes = 60,
  dayOffset = 0
) => {
  const start = new Date();
  start.setHours(startHour, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);

  return {
    id: `test-event-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    start,
    end,
    color: '#007AFF',
  };
};

// Exportar una función auxiliar para obtener una configuración básica
export const getBasicConfig = () => {
  return {
    theme: DEFAULT_THEME,
    timeRange: DEFAULT_TIME_RANGE,
    calendarConfig: DEFAULT_CALENDAR_CONFIG,
    layoutConfig: LayoutConfig,
    initialCalendarState: INITIAL_CALENDAR_STATE,
  };
};
