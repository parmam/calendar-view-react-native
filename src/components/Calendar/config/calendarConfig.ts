/**
 * Configuración centralizada del calendario
 *
 * Este archivo contiene todas las configuraciones y opciones para personalizar
 * el comportamiento y apariencia del componente de calendario.
 *
 * Cada configuración incluye comentarios detallados que explican su propósito
 * y el efecto que tiene en el comportamiento del calendario.
 */

import {
  CalendarTheme,
  TimeRange,
  HapticOptions,
  CalendarConfig,
  UnavailableHours,
  DragPreviewConfig,
  CalendarViewType,
} from '../types';

/**
 * Constantes de diseño/layout
 *
 * Estas propiedades definen las dimensiones y espaciados fundamentales
 * del calendario, afectando directamente a su aspecto visual.
 *
 * HOUR_HEIGHT: Controla la altura vertical de cada hora en la vista de rejilla.
 *              Aumentar este valor crea más espacio entre horas.
 *
 * TIME_LABEL_WIDTH: Define el ancho de la columna lateral que muestra las etiquetas de hora.
 *                   Es crucial para el alineamiento correcto de los encabezados de día con la rejilla.
 *
 * MIN_EVENT_WIDTH: Establece el ancho mínimo que puede tener un evento.
 *                  Previene que los eventos sean demasiado estrechos para ser legibles.
 *
 * EVENT_MARGIN: Espacio en píxeles alrededor de cada evento.
 *               Afecta a la densidad visual de eventos en el calendario.
 *
 * EVENT_SPACING: Separación específica entre eventos cuando se solapan.
 *                Controla cómo de juntos aparecen visualmente los eventos que ocurren simultáneamente.
 *
 * EVENT_BORDER_RADIUS: Determina la curvatura de las esquinas de los eventos.
 *                      Valores más altos crean esquinas más redondeadas.
 *
 * EVENT_SHADOW_OPACITY: Controla la visibilidad de las sombras de los eventos.
 *                       Afecta a la sensación de profundidad en la interfaz.
 *
 * HEADER_HEIGHT: Altura del encabezado del calendario donde se muestran los días.
 *                Ajusta el espacio dedicado a los títulos de día/fecha.
 *
 * MONTH_DAY_HEIGHT: Altura de cada día en la vista mensual.
 *                   Determina el tamaño de cada celda en la vista de mes.
 *
 * SNAP_MINUTES: Intervalo al que se ajustan los eventos al crearlos o moverlos.
 *               Por ejemplo, un valor de 15 significa que los eventos se alinean a incrementos de 15 minutos.
 *
 * DEFAULT_EVENT_DURATION: Duración predeterminada en minutos para nuevos eventos.
 *                         Establece el tamaño inicial de eventos recién creados.
 */
export const LAYOUT_CONFIG = {
  HOUR_HEIGHT: 120,
  TIME_LABEL_WIDTH: 50,
  MIN_EVENT_WIDTH: 35,
  EVENT_MARGIN: 2,
  EVENT_SPACING: 1,
  EVENT_BORDER_RADIUS: 4,
  EVENT_SHADOW_OPACITY: 0.2,
  HEADER_HEIGHT: 50,
  MONTH_DAY_HEIGHT: 100,
  SNAP_MINUTES: 15,
  DEFAULT_EVENT_DURATION: 60,
};

/**
 * Configuración de animaciones
 *
 * Define los parámetros temporales y dinámicos para todas las animaciones
 * del calendario, afectando la fluidez y el comportamiento de las interacciones.
 *
 * SCALE_DURATION: Tiempo en milisegundos que tardan las animaciones de escala.
 *                 Afecta a la velocidad de transiciones como zoom o expansión de eventos.
 *
 * MOVE_DURATION: Duración de las animaciones de movimiento.
 *                Controla la velocidad a la que los eventos se desplazan al reorganizarse.
 *
 * FADE_DURATION: Tiempo para las animaciones de aparición/desaparición.
 *                Influye en la suavidad con que los elementos aparecen o desaparecen.
 *
 * SPRING_FRICTION: Fricción para animaciones tipo resorte.
 *                  Valores más altos hacen que las animaciones se estabilicen más rápido,
 *                  reduciendo el efecto de rebote.
 *
 * SPRING_TENSION: Tensión para animaciones tipo resorte.
 *                 Valores más altos crean movimientos más rápidos y enérgicos.
 */
export const ANIMATION_CONFIG = {
  SCALE_DURATION: 200,
  MOVE_DURATION: 100,
  FADE_DURATION: 150,
  SPRING_FRICTION: 5,
  SPRING_TENSION: 40,
};

/**
 * Tema predeterminado
 *
 * Define todos los colores y elementos visuales del calendario.
 * Modificar este objeto permite personalizar completamente el aspecto visual.
 *
 * backgroundColor: Color de fondo principal de todo el componente.
 *
 * calendarBackgroundColor: Color específico para el fondo del área de la rejilla del calendario.
 *
 * textColor: Color predeterminado para el texto en todo el calendario.
 *
 * primaryColor: Color principal que se usa para resaltar elementos importantes.
 *
 * secondaryColor: Color complementario usado para elementos secundarios.
 *
 * todayIndicatorColor: Color utilizado para resaltar el día actual.
 *
 * selectedDayColor: Color aplicado a días seleccionados por el usuario.
 *
 * eventColors: Array de colores que se asignan automáticamente a eventos.
 *
 * hourIndicatorColor: Color de la línea que indica la hora actual.
 *
 * gridLineColor: Color de las líneas que dividen la rejilla de horas/días.
 *
 * headerBackgroundColor: Color de fondo para la sección de encabezado.
 *
 * unavailableHoursColor: Color para las horas marcadas como no disponibles.
 *
 * weekendColor: Color especial aplicado a los días de fin de semana.
 *
 * eventTextColor: Color del texto dentro de los eventos.
 *
 * dragCreateIndicatorColor: Color del indicador visual durante la creación de eventos.
 *
 * dragMovePreviewColor: Color de la previsualización al mover eventos.
 *
 * connectionLineColor: Color de la línea que conecta un evento con su previsualización durante el arrastre.
 *
 * overlapIndicatorColor: Color que indica cuando hay eventos solapados.
 *
 * successColor: Color para indicaciones de éxito.
 *
 * errorColor: Color para indicaciones de error.
 *
 * warningColor: Color para indicaciones de advertencia.
 */
export const DEFAULT_THEME: CalendarTheme = {
  backgroundColor: '#FFFFFF',
  calendarBackgroundColor: '#F5F5F5',
  textColor: '#333333',
  primaryColor: '#007AFF',
  secondaryColor: '#5AC8FA',
  todayIndicatorColor: '#FF3B30',
  selectedDayColor: 'rgba(0, 122, 255, 0.2)',
  eventColors: [
    '#007AFF', // Azul
    '#5AC8FA', // Azul claro
    '#FF9500', // Naranja
    '#FF3B30', // Rojo
    '#4CD964', // Verde
    '#5856D6', // Púrpura
  ],
  hourIndicatorColor: '#FF3B30',
  gridLineColor: '#E5E5EA',
  headerBackgroundColor: '#FFFFFF',
  unavailableHoursColor: 'rgba(230, 230, 230, 0.5)',
  weekendColor: '#F9F9F9',
  eventTextColor: '#FFFFFF',
  dragCreateIndicatorColor: 'rgba(0, 122, 255, 0.3)',
  dragMovePreviewColor: 'rgba(33, 150, 243, 0.4)',
  connectionLineColor: 'rgba(33, 150, 243, 0.7)',
  overlapIndicatorColor: 'rgba(255, 59, 48, 0.1)',
  successColor: '#4CD964',
  errorColor: '#FF3B30',
  warningColor: '#FF9500',
};

/**
 * Rango de tiempo predeterminado
 *
 * Define las horas de inicio y fin visibles en el calendario.
 * Ajustar estos valores permite mostrar solo el período de tiempo relevante.
 *
 * start: La hora de inicio (0-23) que se muestra en el calendario.
 *        Por ejemplo, 8 significa que el calendario comienza mostrando desde las 8 AM.
 *
 * end: La hora final (0-24) que se muestra en el calendario.
 *      Por ejemplo, 20 significa que el calendario muestra hasta las 8 PM.
 */
export const DEFAULT_TIME_RANGE: TimeRange = {
  start: 8, // 8 AM
  end: 20, // 8 PM
};

/**
 * Opciones hápticas predeterminadas
 *
 * Configura el feedback táctil para diferentes interacciones con el calendario,
 * mejorando la experiencia de usuario en dispositivos que soportan vibración.
 *
 * enabled: Activa o desactiva completamente el feedback háptico.
 *
 * eventCreate: Intensidad de la vibración al crear un evento (light, medium, heavy).
 *
 * eventMove: Intensidad de la vibración al mover un evento.
 *
 * viewChange: Intensidad de la vibración al cambiar entre vistas (día, semana, mes).
 *
 * error: Intensidad de la vibración cuando ocurre un error.
 */
export const DEFAULT_HAPTIC_OPTIONS: HapticOptions = {
  enabled: true,
  eventCreate: 'light',
  eventMove: 'medium',
  viewChange: 'light',
  error: 'heavy',
};

/**
 * Configuración para arrastrar previsualizaciones
 *
 * Define cómo se comporta la previsualización al arrastrar eventos en el calendario.
 * Estos ajustes afectan directamente la experiencia de usuario al reorganizar eventos.
 *
 * previewOffset: Desplazamiento vertical en píxeles para la previsualización.
 *                Determina a qué distancia por encima del dedo/cursor aparece la previsualización.
 *                Un valor más alto coloca la previsualización más lejos del punto de contacto.
 *
 * connectionLineWidth: Ancho en píxeles de la línea que conecta el evento original con su previsualización.
 *                      Afecta la visibilidad de la relación entre evento y previsualización.
 *
 * pagingScrollHours: Número de horas adicionales que se mostrarán al hacer scroll paginado.
 *
 * enablePagingScroll: Activa o desactiva el scroll paginado durante operaciones de arrastre.
 *
 * showTargetLine: Muestra una línea horizontal en la posición donde se soltará el evento.
 *
 * targetLineColor: Color de la línea de destino (por defecto verde).
 *
 * targetLineHeight: Altura en píxeles de la línea de destino.
 */
export const DEFAULT_DRAG_PREVIEW_CONFIG: DragPreviewConfig = {
  previewOffset: 20,
  connectionLineWidth: 2,
  pagingScrollHours: 3,
  enablePagingScroll: true,
  showTargetLine: true,
  targetLineColor: '#4CD964',
  targetLineHeight: 2,
};

/**
 * Configuración global del calendario
 *
 * Contiene configuraciones generales que afectan el comportamiento global del calendario
 * y que no encajan en categorías más específicas.
 *
 * dragPreviewConfig: Configuración para la previsualización de eventos al arrastrarlos.
 *                    Controla el comportamiento visual del arrastre de eventos.
 *
 * autoScrollConfig: Configuración para el comportamiento del auto-scroll al arrastrar eventos
 *                   cerca de los bordes de la pantalla.
 */
/**
 * Configuración para el auto-scroll
 *
 * Define el comportamiento del desplazamiento automático cuando se arrastra un evento
 * cerca de los bordes de la vista.
 *
 * enabled: Activa o desactiva completamente la función de auto-scroll.
 *
 * edgeThreshold: Distancia en píxeles desde el borde que activa el auto-scroll.
 *                Un valor mayor inicia el scroll cuando el cursor está más lejos del borde.
 *
 * safeAreaSize: Tamaño en píxeles de la zona segura central donde no se activa el auto-scroll.
 *               Define un área en el centro de la pantalla donde el arrastre no activa el auto-scroll.
 *               Un valor de 0 desactiva la zona segura.
 *
 * speed: Velocidad base del auto-scroll en píxeles por frame.
 *        Establece la velocidad general del desplazamiento.
 *
 * constant: Si es verdadero, la velocidad será constante sin aceleración.
 *           Si es falso, la velocidad aumentará a medida que el cursor se acerque más al borde.
 *
 * acceleration: Factor de aceleración cuando constant=false (0-1).
 *               Valores más altos hacen que la aceleración sea más pronunciada.
 *
 * maxSpeed: Velocidad máxima en píxeles por frame.
 *           Limita la velocidad máxima que puede alcanzar el auto-scroll.
 *
 * minSpeed: Velocidad mínima en píxeles por frame.
 *           Establece una velocidad mínima para que el scroll siempre sea perceptible.
 *
 * frameInterval: Intervalo de tiempo entre frames de animación en milisegundos.
 *                Controla la suavidad de la animación.
 */
// Configuración optimizada para el autoscroll basado en cuartiles
export const DEFAULT_AUTO_SCROLL_CONFIG = {
  enabled: false,
  edgeThreshold: 50, // No se usa con la nueva lógica de cuartiles, pero dejamos un valor por compatibilidad
  safeAreaSize: 0, // No usamos zona segura con la lógica de cuartiles
  speed: 5, // Velocidad base aumentada
  constant: false, // Usamos aceleración no lineal para un scroll más natural
  acceleration: 0.4, // Mayor aceleración para mejor respuesta
  maxSpeed: 12, // Velocidad máxima aumentada
  minSpeed: 3, // Velocidad mínima aumentada para mejor respuesta
  frameInterval: 16, // ~60fps
};

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  dragPreviewConfig: DEFAULT_DRAG_PREVIEW_CONFIG,
  autoScrollConfig: DEFAULT_AUTO_SCROLL_CONFIG,
};

/**
 * Valores iniciales del calendario
 *
 * Define el estado inicial del calendario cuando se carga por primera vez.
 * Estos valores determinan cómo se presenta inicialmente el calendario al usuario.
 *
 * viewType: Tipo de vista inicial (día, semana, mes).
 *           Determina cómo se visualiza el calendario al cargar.
 *
 * selectedDate: Fecha seleccionada por defecto.
 *               El calendario se posicionará inicialmente en esta fecha.
 *
 * zoomLevel: Nivel de zoom inicial (1 = normal, >1 = ampliado, <1 = reducido).
 *            Controla el tamaño inicial de visualización.
 *
 * isDragEnabled: Determina si se permite arrastrar eventos.
 *                Desactivarlo crearía un calendario de sólo lectura.
 *
 * firstDayOfWeek: Día que se muestra primero en la semana (0 = Domingo, 1 = Lunes).
 *                 Afecta al orden de visualización de los días en vista semanal.
 *
 * visibleDays: Días que se muestran en la vista semanal (0-6).
 *              Permite ocultar ciertos días de la semana.
 *
 * timeInterval: Intervalo de tiempo en minutos para la rejilla.
 *               Determina la precisión de visualización y creación de eventos.
 *
 * locale: Configuración regional para formato de fechas y nombres de días/meses.
 */
export const INITIAL_CALENDAR_STATE = {
  viewType: 'week' as CalendarViewType,
  selectedDate: new Date(),
  zoomLevel: 1,
  isDragEnabled: true,
  firstDayOfWeek: 0, // 0 = Domingo, 1 = Lunes
  visibleDays: [0, 1, 2, 3, 4, 5, 6], // Todos los días visibles por defecto
  timeInterval: 15, // Intervalo de tiempo en minutos
  locale: 'es-ES', // Localización predeterminada
};

/**
 * Configuración para eventos solapados
 *
 * Controla cómo se visualizan múltiples eventos que ocurren simultáneamente.
 * Estos ajustes son cruciales para mantener la legibilidad cuando hay muchos eventos.
 *
 * MAX_COLUMNS: Número máximo de columnas para organizar eventos simultáneos.
 *              Limita cuántos eventos pueden mostrarse en paralelo antes de reducir su ancho.
 *
 * MIN_EVENT_WIDTH_PERCENT: Ancho mínimo de un evento como porcentaje del ancho disponible.
 *                         Asegura que los eventos nunca sean demasiado estrechos para ser legibles.
 *
 * EVENT_SPACING_PERCENT: Espacio entre eventos solapados como porcentaje del ancho.
 *                       Controla la separación visual entre eventos simultáneos.
 */
export const OVERLAP_CONFIG = {
  MAX_COLUMNS: 10,
  MIN_EVENT_WIDTH_PERCENT: 30,
  EVENT_SPACING_PERCENT: 2,
};

/**
 * Horas no disponibles predeterminadas (fin de semana completo)
 *
 * Define períodos de tiempo que se mostrarán como no disponibles (sombreados).
 * Útil para indicar horarios no laborables o bloqueados.
 *
 * days: Array de días de la semana (0-6) que contienen horas no disponibles.
 *       Por ejemplo, [0, 6] indica domingo y sábado (fin de semana).
 *
 * ranges: Array de rangos horarios no disponibles para los días especificados.
 *         Cada rango tiene un inicio y fin expresado en horas (0-24).
 */
export const DEFAULT_UNAVAILABLE_HOURS: UnavailableHours = {
  days: [0, 6], // Domingo y Sábado
  ranges: [
    { start: 0, end: 24 }, // Todo el día
  ],
};

/**
 * Configuración para optimización de rendimiento
 *
 * Ajustes que afectan el rendimiento del calendario, especialmente importante
 * cuando se manejan muchos eventos o en dispositivos con recursos limitados.
 *
 * VIRTUALIZATION_THRESHOLD: Número de eventos a partir del cual se activa la renderización virtual.
 *                          La virtualización mejora el rendimiento mostrando solo los eventos visibles.
 *
 * BATCH_RENDER_SIZE: Número de elementos que se renderizan por lote en renderización diferida.
 *                   Un valor menor reduce la carga instantánea pero aumenta el tiempo total.
 *
 * DEBOUNCE_SCROLL: Tiempo en milisegundos para aplicar debounce a eventos de desplazamiento.
 *                 Reduce la frecuencia de actualizaciones durante el scroll para mejorar fluidez.
 *
 * THROTTLE_RESIZE: Tiempo en milisegundos para limitar eventos de redimensionamiento.
 *                 Evita actualizaciones excesivas durante el cambio de tamaño de ventana.
 *
 * LOGGING_ENABLED: Activa o desactiva los mensajes de registro (logs) del calendario.
 *                 Al establecer en false, se deshabilitan todos los logs, mejorando el rendimiento
 *                 y evitando la sobrecarga de la consola. Útil para entornos de producción.
 *
 * LOGGING_LEVEL: Define el nivel mínimo de logs a mostrar cuando el logging está habilitado.
 *               Opciones: "debug" (todos los logs), "info", "warn", "error" (solo errores).
 *               Usar niveles más altos reduce la cantidad de información mostrada.
 */
export const PERFORMANCE_CONFIG = {
  VIRTUALIZATION_THRESHOLD: 100,
  BATCH_RENDER_SIZE: 20,
  DEBOUNCE_SCROLL: 50,
  THROTTLE_RESIZE: 100,
  LOGGING_ENABLED: __DEV__, // Habilitado solo en desarrollo por defecto
  LOGGING_LEVEL: 'info', // Nivel de log: "debug", "info", "warn", "error"
};
