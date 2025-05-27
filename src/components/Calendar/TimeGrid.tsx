import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  GestureResponderHandlers,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useCalendar } from "./CalendarContext";
import {
  addDays,
  formatTime,
  getWeekDates,
  filterEventsByDay,
  getEventPosition,
  getEventPositionExact,
  timeToDate,
  isToday,
  getDayName,
  eventsOverlap,
  groupOverlappingEvents,
} from "./utils";
import { useScrollHandler } from "./utils/ScrollHandler";
import { useLogger } from "./utils/logger";
import Event from "./Event";
import { CalendarEvent, CalendarViewType, SnapLineIndicator } from "./types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useLayoutConfig, useOverlapConfig } from "./config";

// Definir constantes de cuadrícula
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TimeGridProps {
  viewType: CalendarViewType;
  panHandlers?: GestureResponderHandlers;
  onEventDrag?: (
    event: CalendarEvent,
    minuteDiff: number,
    snapTime?: Date
  ) => boolean;
  onDragEnd?: () => void;
  snapLineIndicator?: SnapLineIndicator | null;
  timeInterval?: number;
  onDragNearEdge?: (distanceFromEdge: number, direction: "up" | "down") => void;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  viewType,
  panHandlers,
  onEventDrag,
  onDragEnd,
  snapLineIndicator,
  timeInterval: propTimeInterval,
  onDragNearEdge,
}) => {
  // Initialize logger
  const logger = useLogger("TimeGrid");

  // Obtener configuraciones de layout y overlap
  const { layoutConfig } = useLayoutConfig();
  const { overlapConfig } = useOverlapConfig();

  // Usar valores de la configuración
  const HOUR_HEIGHT = layoutConfig.HOUR_HEIGHT;
  const TIME_LABEL_WIDTH = layoutConfig.TIME_LABEL_WIDTH;

  // Initialize scroll handler hook
  const { scrollPosition, scrollTo, scrollProps } = useScrollHandler();

  const {
    selectedDate,
    events,
    timeRange,
    theme,
    locale,
    firstDayOfWeek,
    visibleDays,
    onTimeSlotPress,
    onEventCreate,
    onEventPress,
    zoomLevel,
    unavailableHours,
    timeInterval: contextTimeInterval,
    calendarConfig,
  } = useCalendar();

  // Use provided timeInterval or fall back to context value
  const timeInterval = propTimeInterval || contextTimeInterval || 30;

  // IMPORTANTE: Declarar TODOS los estados al inicio del componente
  const [gridWidth, setGridWidth] = useState(SCREEN_WIDTH - TIME_LABEL_WIDTH);
  const [isResizingEvent, setIsResizingEvent] = useState(false);
  const [newEventCoords, setNewEventCoords] = useState<{
    startY: number;
    currentY: number;
    dayIndex: number;
    isCreating: boolean;
  } | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    dayIndex: number;
    hour: number;
    minute: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [autoScrolling, setAutoScrolling] = useState({
    active: false,
    direction: null as "up" | "down" | null,
    speed: 0,
  });

  // Create a ref to track auto-scrolling state for immediate access in animations
  const autoScrollingRef = useRef({
    active: false,
    direction: null as "up" | "down" | null,
    speed: 0,
  });
  const [localSnapLineIndicator, setLocalSnapLineIndicator] =
    useState<SnapLineIndicator | null>(null);

  // Usamos el snapLineIndicator proporcionado por prop o el estado local
  const effectiveSnapLineIndicator =
    snapLineIndicator || localSnapLineIndicator;

  // Animated styles for event creation
  const createEventOpacity = new Animated.Value(0);

  // Show creation indicator
  const showEventIndicator = useCallback(() => {
    Animated.timing(createEventOpacity, {
      toValue: 0.7,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Hide creation indicator
  const hideEventIndicator = useCallback(() => {
    Animated.timing(createEventOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Create event gesture
  const createEventGesture = Gesture.Pan()
    .activateAfterLongPress(200) // Solo activar después de mantener presionado
    .onStart((e) => {
      if (isResizingEvent) return;

      const dayIndex = Math.floor(e.x / columnWidth);
      if (dayIndex < 0 || dayIndex >= dates.length) return;

      logger.debug("Starting event creation gesture", { x: e.x, y: e.y });

      setNewEventCoords({
        startY: e.y + scrollPosition.y,
        currentY: e.y + scrollPosition.y,
        dayIndex,
        isCreating: true,
      });

      showEventIndicator();
    })
    .onUpdate((e) => {
      if (!newEventCoords || isResizingEvent) return;

      setNewEventCoords({
        ...newEventCoords,
        currentY: e.y + scrollPosition.y,
      });
    })
    .onEnd((e) => {
      if (!newEventCoords || isResizingEvent) return;

      logger.debug("Ending event creation gesture", {
        startY: newEventCoords.startY,
        endY: newEventCoords.currentY,
      });

      const { startY, currentY, dayIndex } = newEventCoords;
      const startCoord = Math.min(startY, currentY);
      const endCoord = Math.max(startY, currentY);

      const startTime = yToTime(startCoord);
      const endTime = yToTime(endCoord);

      const date = dates[dayIndex];
      const start = new Date(date);
      start.setHours(startTime.hour, startTime.minutes, 0, 0);

      const end = new Date(date);
      end.setHours(endTime.hour, endTime.minutes, 0, 0);

      // Ensure minimum duration (30 minutes)
      if (end.getTime() - start.getTime() < 30 * 60 * 1000) {
        end.setMinutes(start.getMinutes() + 30);
      }

      createEventWithDrag(start, end, dayIndex);
      hideEventIndicator();
      setNewEventCoords(null);
    })
    .simultaneousWithExternalGesture();

  // IMPORTANTE: Mover todos los useMemo al inicio, antes de cualquier useEffect o función
  // Generate hours based on time range
  const hours = useMemo(() => {
    const result = [];
    for (let hour = timeRange.start; hour < timeRange.end; hour++) {
      result.push(hour);
    }
    return result;
  }, [timeRange]);

  // Calculate dates to display based on view type
  const dates = useMemo(() => {
    switch (viewType) {
      case "day":
        return [selectedDate];
      case "3day": {
        const result = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(selectedDate);
          date.setDate(date.getDate() + i);
          result.push(date);
        }
        return result;
      }
      case "week":
        return getWeekDates(selectedDate, firstDayOfWeek).filter((_, i) =>
          visibleDays.includes(i)
        );
      case "workWeek":
        // Solo mostrar días laborables (lunes a viernes)
        return getWeekDates(selectedDate, 1).slice(0, 5);
      default:
        return [selectedDate];
    }
  }, [viewType, selectedDate, firstDayOfWeek, visibleDays]);

  // Calculate column width based on grid width and number of dates
  const columnWidth = useMemo(
    () => gridWidth / dates.length,
    [gridWidth, dates.length]
  );

  // Calculate now indicator position for today
  const nowIndicatorPosition = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < timeRange.start || hours > timeRange.end) {
      return null;
    }

    const position = (hours - timeRange.start) * HOUR_HEIGHT;
    const minutePosition = (minutes / 60) * HOUR_HEIGHT;

    return position + minutePosition;
  }, [timeRange, HOUR_HEIGHT]);

  // Debug for day view
  useEffect(() => {
    if (viewType === "day") {
      logger.debug("🗓️ DAY VIEW ACTIVE", {
        dates: dates.length,
        columnWidth,
        gridWidth,
        viewType,
      });
    }
  }, [viewType, dates.length, columnWidth, gridWidth, logger]);

  // Todas las funciones useCallback deben declararse antes de los useEffect que las usan
  // Add a handler to measure the scroll view
  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
  }, []);

  // Grid layout
  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setGridWidth(width);
  }, []);

  // Función para validar si un evento puede ser arrastrado a una posición específica
  const handleEventDrag = useCallback(
    (event: CalendarEvent, minuteDiff: number, snapTime?: Date): boolean => {
      // Marcar que el usuario ha interactuado con el scroll
      userHasScrolled.current = true;

      // Implementación actual...
      // Calcular nuevas fechas
      const newStart = new Date(event.start);
      newStart.setMinutes(newStart.getMinutes() + minuteDiff);

      const newEnd = new Date(event.end);
      newEnd.setMinutes(newEnd.getMinutes() + minuteDiff);

      logger.debug("Validando arrastre de evento", {
        eventId: event.id,
        eventTitle: event.title,
        originalStart: event.start.toLocaleTimeString(),
        newStart: newStart.toLocaleTimeString(),
        minuteDiff,
        hasUnavailableHours: !!unavailableHours,
      });

      // Update snap line indicator if a snap time is provided
      if (snapTime && effectiveSnapLineIndicator) {
        setLocalSnapLineIndicator({
          time: snapTime,
          visible: true,
          color: theme.successColor || "#4CAF50",
        });
      }

      // Verificar si el destino es válido
      if (unavailableHours) {
        // Obtener día de la semana
        const dayOfWeek = newStart.getDay();

        // Verificar si este día está incluido en días no disponibles
        const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6];
        if (daysToCheck.includes(dayOfWeek)) {
          // Verificar si la hora cae dentro de algún rango no disponible
          const timeValue = newStart.getHours() + newStart.getMinutes() / 60;

          logger.debug("Verificando restricciones horarias", {
            eventId: event.id,
            dayOfWeek,
            timeValue,
            day: [
              "Domingo",
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
            ][dayOfWeek],
            unavailableRanges: unavailableHours.ranges,
          });

          const isUnavailable = unavailableHours.ranges.some(
            (range) => timeValue >= range.start && timeValue < range.end
          );

          if (isUnavailable) {
            logger.debug("Arrastre bloqueado por horario no disponible", {
              eventId: event.id,
              dayOfWeek,
              timeValue,
              day: [
                "Domingo",
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ][dayOfWeek],
              newStart: newStart.toLocaleTimeString(),
              minuteDiff,
            });
            return false; // No permitir arrastrar a esta zona
          }
        }
      }

      logger.debug("Arrastre de evento permitido", {
        eventId: event.id,
        newStart: newStart.toLocaleTimeString(),
        newEnd: newEnd.toLocaleTimeString(),
        minuteDiff,
      });

      return true; // Permitir arrastrar
    },
    [unavailableHours, theme.successColor, logger, effectiveSnapLineIndicator]
  );

  const handleEventDragEnd = useCallback(() => {
    // Force immediate auto-scroll stop regardless of current state
    logger.debug("✋ DRAG ENDED: Stopping auto-scroll immediately", {
      wasActive: autoScrolling.active,
      direction: autoScrolling.direction,
      finalScrollPosition: scrollPosition.y.toFixed(1),
      viewType,
    });

    // Update both state and ref for immediate effect
    const newScrollState = {
      active: false,
      direction: null,
      speed: 0,
    };

    // Update ref immediately for animation frame checks
    autoScrollingRef.current = newScrollState;

    // Update state for component re-renders
    setAutoScrolling(newScrollState);

    // Ocultar la línea de snap cuando termina el arrastre
    if (localSnapLineIndicator) {
      setLocalSnapLineIndicator(null);
    }

    // Usamos onDragEnd en lugar de intentar modificar snapLineIndicator directamente
    if (onDragEnd) {
      onDragEnd();
    }
  }, [
    autoScrolling,
    scrollPosition.y,
    onDragEnd,
    viewType,
    logger,
    localSnapLineIndicator,
  ]);

  // Función mejorada para handleDragNearEdge
  const handleDragNearEdge = useCallback(
    (distanceFromEdge: number, direction: "up" | "down") => {
      try {
        // Marcar que el usuario ha interactuado con el scroll
        userHasScrolled.current = true;

        // Safety check for day view
        if (viewType === "day" && (!dates || dates.length === 0)) {
          logger.warn("⚠️ DAY VIEW DRAG ISSUE: No dates available", {
            viewType,
          });
          return;
        }

        // Obtener configuración de auto-scroll desde calendarConfig o usar valores por defecto
        const autoScrollConfig = calendarConfig?.autoScrollConfig || {
          enabled: true,
          edgeThreshold: 100,
          speed: 3,
          constant: true,
          acceleration: 0.2,
          maxSpeed: 8,
          minSpeed: 2,
          frameInterval: 16,
        };

        // Verificar si el auto-scroll está habilitado
        if (!autoScrollConfig.enabled) {
          return;
        }

        const edgeThreshold = autoScrollConfig.edgeThreshold;

        // Solo activar scroll si estamos dentro del umbral
        if (distanceFromEdge > edgeThreshold) {
          if (autoScrolling.active) {
            logger.debug(
              "👋 EDGE DETECTION: Too far from edge, stopping auto-scroll",
              {
                distanceFromEdge,
                direction,
                threshold: edgeThreshold,
                viewType,
              }
            );

            // Detener el auto-scroll
            const newScrollState = {
              active: false,
              direction: null,
              speed: 0,
            };

            autoScrollingRef.current = newScrollState;
            setAutoScrolling(newScrollState);
          }
          return;
        }

        // Calcular la velocidad del scroll según la configuración
        let scrollSpeed;

        if (autoScrollConfig.constant) {
          // Usar velocidad constante
          scrollSpeed = autoScrollConfig.speed;
        } else {
          // Calcular velocidad basada en la distancia del borde
          // Normalize distance (0 = at edge, 1 = at threshold)
          const normalizedDistance = Math.min(
            1,
            distanceFromEdge / edgeThreshold
          );

          // Apply acceleration curve
          scrollSpeed =
            autoScrollConfig.maxSpeed *
            Math.pow(1 - normalizedDistance, autoScrollConfig.acceleration);

          // Ensure minimum speed
          scrollSpeed = Math.max(autoScrollConfig.minSpeed, scrollSpeed);

          // Round to 1 decimal place for smoother transitions
          scrollSpeed = Math.round(scrollSpeed * 10) / 10;
        }

        // Activar el auto-scroll con la velocidad calculada
        const newScrollState = {
          active: true,
          direction: direction,
          speed: scrollSpeed,
        };

        autoScrollingRef.current = newScrollState;
        setAutoScrolling(newScrollState);

        logger.debug("👉 EDGE DETECTED:", {
          direction,
          distanceFromEdge: distanceFromEdge.toFixed(1),
          scrollSpeed: scrollSpeed.toFixed(1),
          scrollPosition: scrollPosition.y.toFixed(1),
          edgeThreshold,
          isConstantSpeed: autoScrollConfig.constant,
          viewType,
        });
      } catch (error: any) {
        logger.error("❌ EDGE DETECTION ERROR", {
          error: error.message,
          viewType,
          direction,
          distanceFromEdge,
        });
      }
    },
    [
      scrollPosition.y,
      viewType,
      dates,
      calendarConfig,
      autoScrolling.active,
      logger,
    ]
  );

  // Función para crear un evento usando arrastre
  const createEventWithDrag = useCallback(
    (start: Date, end: Date, dayIndex: number) => {
      if (!newEventCoords || !onEventCreate) return;

      // Ensure end time is after start time
      if (end <= start) {
        end = new Date(start);
        end.setHours(start.getHours() + 1);
      }

      // Create event object
      const newEvent: CalendarEvent = {
        id: `temp-event-${Date.now()}`,
        title: "Nuevo evento",
        start,
        end,
        color:
          theme.eventColors[
            Math.floor(Math.random() * theme.eventColors.length)
          ],
      };

      // Call the callback
      logger.debug("Creating event with drag", newEvent);
      onEventCreate(newEvent);

      // Reset coordinates
      setNewEventCoords(null);
    },
    [newEventCoords, onEventCreate, theme.eventColors, logger]
  );

  // Ahora todos los useEffect
  // Set up auto-scrolling effect with safety checks for day view
  useEffect(() => {
    // Safety check - if not active, don't proceed
    if (!autoScrolling.active || !autoScrolling.direction) {
      return;
    }

    // Detener auto-scroll si no hay evento siendo arrastrado
    if (!isResizingEvent) {
      // Solo detener si está activo (para evitar actualizaciones de estado innecesarias)
      if (autoScrolling.active) {
        logger.debug("Auto-scroll detenido: no hay arrastre activo", {
          viewType,
          isResizingEvent,
        });

        // Detener auto-scroll
        setAutoScrolling({
          active: false,
          direction: null,
          speed: 0,
        });
      }

      return;
    }

    // Safety check - if dates array is empty or invalid, don't proceed
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      logger.error("❌ AUTO-SCROLL ERROR: Invalid dates array", {
        datesLength: dates?.length || 0,
        viewType,
      });
      // Disable auto-scrolling to prevent crashes
      setAutoScrolling((prevState) => {
        if (prevState.active) {
          return {
            active: false,
            direction: null,
            speed: 0,
          };
        }
        return prevState;
      });
      return;
    }

    // Obtener configuración de auto-scroll o usar valores por defecto
    const autoScrollConfig = calendarConfig?.autoScrollConfig || {
      enabled: true,
      edgeThreshold: 100,
      speed: 3,
      constant: true,
      acceleration: 0.2,
      maxSpeed: 8,
      minSpeed: 2,
      frameInterval: 16,
    };

    // Calculate scroll limits based on timeRange
    const startHour = Math.max(0, timeRange.start - 1); // One hour before available start
    const endHour = timeRange.end + 1; // One hour after available end

    // Calculate min and max scroll positions
    const minScrollY = 0; // Never scroll above 0
    const maxScrollY = (endHour - startHour) * HOUR_HEIGHT * zoomLevel;

    // Track last frame time for smooth animation
    let lastTimestamp = 0;
    let animationFrameId: number | null = null;
    let frameCount = 0;
    let isMounted = true; // Track if component is still mounted

    // Use requestAnimationFrame for smoother scrolling
    const scrollFrame = (timestamp: number) => {
      try {
        // Check if component is still mounted
        if (!isMounted) return;

        frameCount++;

        // Check if we need to stop scrolling
        // Only check isResizingEvent to allow scrolling to start properly
        if (
          !isResizingEvent ||
          (viewType === "day" && (!dates || dates.length === 0))
        ) {
          logger.debug("🚨 AUTO-SCROLL FRAME CANCELLED", {
            isResizingEvent,
            autoScrollActive: autoScrolling.active,
            frame: frameCount,
            viewType,
            datesAvailable: dates?.length || 0,
          });

          // Cancel any pending animation frame
          if (animationFrameId !== null) {
            try {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
              logger.debug("🚫 ANIMATION FRAME CANCELLED", {
                frame: frameCount,
              });
            } catch (error) {
              logger.error("Error cancelling animation frame", {
                error: String(error),
              });
            }
          }

          // Force auto-scroll to stop completely - more aggressive approach
          setAutoScrolling({
            active: false,
            direction: null,
            speed: 0,
          });

          return; // No continuar con la animación
        }

        // Safety check - make sure scroll position is valid
        if (!scrollPosition || typeof scrollPosition.y !== "number") {
          throw new Error("Invalid scroll position");
        }

        // Get current scroll position
        const currentY = scrollPosition.y;

        // Ensure autoScrolling object is valid
        if (
          !autoScrolling ||
          typeof autoScrolling.direction !== "string" ||
          typeof autoScrolling.speed !== "number"
        ) {
          logger.error("Invalid autoScrolling state", { autoScrolling });
          return;
        }

        // SIMPLIFICADO: Usar una velocidad constante sin cálculos complejos
        // Esto evita rebotes y hace que el movimiento sea predecible
        const delta =
          autoScrolling.direction === "up"
            ? -autoScrolling.speed
            : autoScrolling.speed;

        // Actualizar timestamp para mantener la referencia del tiempo
        lastTimestamp = timestamp;

        // Check if minScrollY and maxScrollY are defined
        if (typeof minScrollY !== "number" || typeof maxScrollY !== "number") {
          logger.error("Invalid scroll boundaries", { minScrollY, maxScrollY });
          return;
        }

        // Calculate new position with limits
        const newY = Math.max(
          minScrollY,
          Math.min(currentY + delta, maxScrollY)
        );

        // Only update if position changed and scroll function exists
        if (Math.abs(newY - currentY) > 0.1 && typeof scrollTo === "function") {
          try {
            // Use animated: false for smoother continuous scrolling
            scrollTo({ y: newY, animated: false });
          } catch (scrollError: any) {
            logger.error("Error during scroll", {
              error: scrollError.message,
              newY,
              currentY,
            });
            // Don't rethrow - allow animation to continue
          }

          // Log occasionally for debugging
          if (Math.random() < 0.02) {
            // Reduced logging frequency
            logger.debug("🔄 AUTO-SCROLL UPDATE:", {
              viewType,
              frame: frameCount,
              direction: autoScrolling.direction,
              speed: autoScrolling.speed.toFixed(1),
              delta: delta.toFixed(2),
              currentPosition: currentY.toFixed(1),
              newPosition: newY.toFixed(1),
              constant: autoScrollConfig.constant,
              boundaries: {
                hitTop: newY <= minScrollY,
                hitBottom: newY >= maxScrollY,
              },
            });
          }
        }

        // Continue animation with proper timing for smoother scrolling
        // Only continue if auto-scroll is active and component is mounted
        if (autoScrolling.active && isResizingEvent && isMounted) {
          try {
            // Usar setTimeout con el intervalo configurado en lugar de requestAnimationFrame
            // Esto nos da más control sobre la frecuencia de actualización
            const timeoutId = setTimeout(() => {
              animationFrameId = requestAnimationFrame(scrollFrame);
            }, autoScrollConfig.frameInterval);

            // Asignar el timeoutId para poder cancelarlo si es necesario
            animationFrameId = timeoutId as unknown as number;
          } catch (rafError: any) {
            logger.error("Error scheduling animation frame", {
              error: rafError.message,
            });
            // Stop the animation on error
            if (isMounted) {
              setAutoScrolling({
                active: false,
                direction: null,
                speed: 0,
              });
            }
          }
        } else {
          logger.debug("🚫 Auto-scroll animation stopped", {
            autoScrollActive: autoScrolling.active,
            isResizingEvent,
            frame: frameCount,
            isMounted,
          });
        }
      } catch (error: any) {
        // Log error and stop animation to prevent crash
        logger.error("❌ AUTO-SCROLL ERROR", {
          error: error.message,
          viewType,
          autoScrolling: JSON.stringify(autoScrolling),
          isResizingEvent,
          scrollPosition:
            typeof scrollPosition === "object"
              ? JSON.stringify(scrollPosition)
              : String(scrollPosition),
        });

        // Stop auto-scrolling
        if (isMounted) {
          try {
            setAutoScrolling({
              active: false,
              direction: null,
              speed: 0,
            });
          } catch (stateError: any) {
            logger.error("Failed to reset auto-scrolling state", {
              error: stateError.message,
            });
          }
        }
      }
    };

    // Start animation
    animationFrameId = requestAnimationFrame(scrollFrame);

    logger.debug("🚀 AUTO-SCROLL STARTED", {
      direction: autoScrolling.direction,
      speed: autoScrolling.speed,
      timeRange: { start: startHour, end: endHour },
      viewType,
    });

    // Cleanup on unmount or when scrolling stops
    return () => {
      isMounted = false;

      // Cancelar cualquier animación pendiente
      if (animationFrameId !== null) {
        try {
          // Cancelar tanto el timeout como el animation frame
          clearTimeout(animationFrameId as unknown as NodeJS.Timeout);
          cancelAnimationFrame(animationFrameId);

          logger.debug("🛑 AUTO-SCROLL STOPPED", {
            framesExecuted: frameCount,
            finalPosition: scrollPosition?.y?.toFixed(1) || "unknown",
            viewType,
          });
        } catch (error) {
          logger.error("Error canceling animation", {
            error: String(error),
            viewType,
          });
        }
        animationFrameId = null;
      }
    };
  }, [
    autoScrolling,
    scrollPosition.y,
    scrollTo,
    timeRange,
    zoomLevel,
    HOUR_HEIGHT,
    scrollViewHeight,
    viewType,
    dates,
    isResizingEvent,
    logger,
  ]);

  // Scroll to current time on first render
  useEffect(() => {
    // Solo hacer scroll inicial si no hay eventos de arrastre activos
    // y el usuario no ha hecho scroll manual
    if (nowIndicatorPosition && !isResizingEvent && !userHasScrolled.current) {
      const position = Math.max(0, nowIndicatorPosition - 100);
      logger.debug("Scrolling to current time", { position });

      // Use setTimeout to ensure component is mounted
      setTimeout(() => {
        scrollTo({ y: position, animated: true });
      }, 500);
    }
  }, [
    nowIndicatorPosition,
    viewType,
    selectedDate,
    scrollTo,
    logger,
    isResizingEvent,
  ]);

  // Referencia para rastrear si se ha movido manualmente el scroll
  const userHasScrolled = useRef(false);

  // Resetear el flag cuando cambia la fecha o vista
  useEffect(() => {
    userHasScrolled.current = false;
  }, [selectedDate, viewType]);

  // Detectar scroll manual del usuario
  const handleUserScroll = useCallback(() => {
    userHasScrolled.current = true;
    logger.debug(
      "Usuario ha hecho scroll manual, desactivando scroll automático"
    );
  }, [logger]);

  // Actualizar el scroll cada minuto para seguir la línea de tiempo actual
  // Pero solo si el usuario no ha hecho scroll manual
  useEffect(() => {
    const interval = setInterval(() => {
      // No hacer scroll automático si el usuario ha movido manualmente la vista
      // o si hay un evento siendo arrastrado
      if (userHasScrolled.current || isResizingEvent) {
        return;
      }

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (
        hours >= timeRange.start &&
        hours <= timeRange.end &&
        isToday(dates[0])
      ) {
        const position =
          (hours - timeRange.start + minutes / 60) * HOUR_HEIGHT * zoomLevel;
        const scrollPosition = Math.max(0, position - 100); // Centrar un poco por encima

        logger.debug("Auto-scrolling to current time", { scrollPosition });
        scrollTo({ y: scrollPosition, animated: true });
      }
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [
    timeRange,
    zoomLevel,
    dates,
    selectedDate,
    scrollTo,
    HOUR_HEIGHT,
    logger,
    isResizingEvent,
  ]);

  // Efecto para detectar cambios en eventos y forzar recálculo
  // Use a ref to store previous events for comparison
  const prevEventsRef = useRef<CalendarEvent[]>([]);

  // Efecto para detectar cambios en eventos y forzar recálculo
  useEffect(() => {
    // Check if events have actually changed in a meaningful way
    const hasEventsChanged = () => {
      // Quick check: different length means events changed
      if (prevEventsRef.current.length !== events.length) {
        return true;
      }

      // Check if any event has changed by comparing essential properties
      for (let i = 0; i < events.length; i++) {
        const current = events[i];
        const prev = prevEventsRef.current[i];

        if (
          current.id !== prev.id ||
          current.start.getTime() !== prev.start.getTime() ||
          current.end.getTime() !== prev.end.getTime() ||
          current.title !== prev.title
        ) {
          return true;
        }
      }

      return false;
    };

    // Only update refreshKey if events have actually changed
    if (hasEventsChanged()) {
      // Store current events for next comparison
      prevEventsRef.current = [...events];

      // Incrementar la key para forzar el recálculo de posiciones
      setRefreshKey((prev) => prev + 1);
      logger.debug("Events actually changed, forcing recalculation", {
        eventCount: events.length,
        refreshKey: refreshKey + 1,
      });
    }
  }, [events, logger]);

  // Efecto para hacer debug del refreshKey (keep this for debugging)
  useEffect(() => {
    logger.debug("Refresh triggered", { refreshKey });
  }, [refreshKey, logger]);

  // Function to convert y coordinate to time
  const yToTime = useCallback(
    (y: number): { hour: number; minutes: number } => {
      // Adjust for zoom level
      const adjustedY = y / zoomLevel;

      // Calculate total minutes from timeRange.start
      const totalMinutesFromRangeStart = (adjustedY / HOUR_HEIGHT) * 60;

      // Calculate total minutes from midnight
      const minutesFromMidnight =
        timeRange.start * 60 + totalMinutesFromRangeStart;

      // Snap to the nearest timeInterval
      const snappedMinutesFromMidnight =
        Math.round(minutesFromMidnight / timeInterval) * timeInterval;

      // Convert back to hours and minutes
      const hour = Math.floor(snappedMinutesFromMidnight / 60);
      const minutes = snappedMinutesFromMidnight % 60;

      logger.debug("Time conversion from y-coordinate", {
        y,
        adjustedY,
        totalMinutesFromRangeStart,
        minutesFromMidnight,
        snappedMinutesFromMidnight,
        hour,
        minutes,
        timeInterval,
      });

      return { hour, minutes };
    },
    [HOUR_HEIGHT, timeInterval, timeRange.start, zoomLevel, logger]
  );

  // Check if a specific time slot is unavailable
  const isTimeSlotUnavailable = useCallback(
    (date: Date, hour: number, minute: number): boolean => {
      if (!unavailableHours) return false;

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = date.getDay();

      // Check if this day is included in unavailable days
      const daysToCheck = unavailableHours.days || [0, 1, 2, 3, 4, 5, 6]; // Default to all days
      if (!daysToCheck.includes(dayOfWeek)) return false;

      // Create a decimal time value (e.g. 9.5 for 9:30)
      const timeValue = hour + minute / 60;

      // Check if time falls within any unavailable range
      return unavailableHours.ranges.some(
        (range) => timeValue >= range.start && timeValue < range.end
      );
    },
    [unavailableHours]
  );

  // Helper function to check if a date is a weekend
  const isWeekend = useCallback((date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  }, []);

  // Handle time slot press, checking for unavailability
  const handleTimeSlotPress = useCallback(
    (dayIndex: number, hour: number, minutes: number) => {
      if (isResizingEvent || !onTimeSlotPress) return;

      // Don't create event if already creating one
      if (newEventCoords?.isCreating) return;

      // Create start and end dates
      const date = dates[dayIndex];

      // Check if the time slot is unavailable
      if (isTimeSlotUnavailable(date, hour, minutes)) {
        logger.debug("Time slot is unavailable", { date, hour, minutes });
        return; // Don't allow interaction with unavailable time slots
      }

      const start = new Date(date);
      start.setHours(hour, minutes, 0, 0);

      // End time is 1 hour after start by default
      const end = new Date(start);
      end.setHours(hour + 1, minutes, 0, 0);

      // Call the callback
      logger.debug("Time slot pressed", { start, end });
      onTimeSlotPress(start, end);
    },
    [
      isResizingEvent,
      onTimeSlotPress,
      newEventCoords,
      dates,
      isTimeSlotUnavailable,
      logger,
    ]
  );

  // Función para resaltar la zona de destino durante el arrastre
  const highlightDropZone = useCallback(
    (dayIndex: number, hour: number, minute: number) => {
      if (isResizingEvent) {
        logger.debug("Resaltando zona de destino", {
          dayIndex,
          date: dates[dayIndex].toLocaleDateString(),
          hour,
          minute,
          fullTime: `${hour}:${minute.toString().padStart(2, "0")}`,
          isResizingEvent,
        });

        setDragTarget({ dayIndex, hour, minute });
      } else {
        setDragTarget(null);
      }
    },
    [isResizingEvent, dates, logger]
  );

  // Añadir la definición de positionEventsWithOverlap antes de renderEvents
  const positionEventsWithOverlap = useCallback(
    (
      dayEvents: CalendarEvent[]
    ): Array<CalendarEvent & { left: number; width: number }> => {
      if (!dayEvents.length) return [];

      // Ordenar eventos por hora de inicio y luego por duración
      const sortedEvents = [...dayEvents].sort((a, b) => {
        const startDiff = a.start.getTime() - b.start.getTime();
        if (startDiff !== 0) return startDiff;

        // Si la hora de inicio es la misma, ordenar por duración (más corta primero)
        return (
          a.end.getTime() -
          a.start.getTime() -
          (b.end.getTime() - b.start.getTime())
        );
      });

      // Utilizamos el algoritmo de agrupación mejorado de utils
      const overlapGroups = groupOverlappingEvents(sortedEvents);

      // Calcular posición y ancho para cada evento
      const positionedEvents: Array<
        CalendarEvent & { left: number; width: number }
      > = [];

      overlapGroups.forEach((group) => {
        if (group.length === 1) {
          // Si solo hay un evento en el grupo, ocupa todo el ancho
          positionedEvents.push({
            ...group[0],
            left: 5,
            width: columnWidth - 10,
          });
          return;
        }

        // Para grupos con múltiples eventos, necesitamos resolver colisiones
        // Paso 1: Crear una matriz de colisiones
        const collisionMatrix: boolean[][] = [];
        for (let i = 0; i < group.length; i++) {
          collisionMatrix[i] = [];
          for (let j = 0; j < group.length; j++) {
            if (i === j) {
              collisionMatrix[i][j] = false;
              continue;
            }

            // Verificar colisiones entre eventos
            const eventA = group[i];
            const eventB = group[j];

            // Un evento se solapa con otro si comparten algún intervalo de tiempo
            collisionMatrix[i][j] = eventsOverlap(eventA, eventB);
          }
        }

        // Paso 2: Asignar columnas a los eventos usando un algoritmo más eficiente
        const eventColumns: number[] = Array(group.length).fill(-1);
        const maxColumnsPerEvent: number[] = Array(group.length).fill(1);

        // Primero, asignar columnas basadas en colisiones
        for (let i = 0; i < group.length; i++) {
          // Obtener todas las columnas ya ocupadas por eventos que se solapan con este
          const usedColumns = new Set<number>();
          for (let j = 0; j < i; j++) {
            if (collisionMatrix[i][j] && eventColumns[j] !== -1) {
              usedColumns.add(eventColumns[j]);
            }
          }

          // Encontrar la primera columna disponible
          let column = 0;
          while (usedColumns.has(column)) {
            column++;
          }

          eventColumns[i] = column;
        }

        // Identificar el número máximo de columnas necesarias
        const maxColumn = Math.max(...eventColumns);
        // Usar MAX_COLUMNS del overlapConfig para limitar el número de columnas
        const maxAllowedColumns = overlapConfig.MAX_COLUMNS;
        const totalColumns = Math.min(maxColumn + 1, maxAllowedColumns);

        // Paso 3: Calcular ancho y posición para cada evento
        // Definir márgenes y espaciado
        const marginLeft = 2;
        const marginRight = 2;
        const marginBetween = 1; // Espacio reducido entre eventos

        // Calcular ancho disponible para todos los eventos en esta columna
        const availableWidth = columnWidth - (marginLeft + marginRight);

        // Ancho base para cada columna
        const columnBaseWidth = availableWidth / totalColumns;

        // Determinar el ancho mínimo para cada evento
        const minEventWidth = Math.min(35, columnBaseWidth); // Permitir eventos más estrechos cuando hay muchas columnas

        // Asignar anchos y posiciones
        for (let i = 0; i < group.length; i++) {
          // Calcular posición izquierda base
          const leftPosition = marginLeft + eventColumns[i] * columnBaseWidth;

          // Establecer márgenes mínimos y máximos para mantener los eventos dentro de la columna
          const startMargin = marginLeft + (eventColumns[i] === 0 ? 2 : 0);
          const endMargin =
            marginRight + (eventColumns[i] === maxColumn ? 2 : 0);

          // Calcular ancho disponible para este evento en su posición
          const maxWidthAtPosition = columnWidth - leftPosition - endMargin;

          // Calcular ancho base ajustado al número de columnas
          const baseWidth = Math.max(
            columnBaseWidth - marginBetween,
            minEventWidth
          );

          // Asegurar que el ancho no exceda el espacio disponible
          const constrainedWidth = Math.min(baseWidth, maxWidthAtPosition);

          // Mantener un ancho mínimo legible
          const width = Math.max(constrainedWidth, minEventWidth);

          // Ajustar la posición izquierda para asegurarnos de que no se sale de la columna
          const maxLeftPosition = columnWidth - width - endMargin;
          const adjustedLeft = Math.min(leftPosition, maxLeftPosition);

          // Si el evento está en la última columna o es muy estrecho, darle un poco más de espacio
          let finalWidth = width;
          if (
            (width < 40 && totalColumns <= 3) ||
            eventColumns[i] === maxColumn
          ) {
            // Intentar expandir un poco los eventos pequeños, sin exceder límites
            const expandedWidth = width * 1.1;
            if (adjustedLeft + expandedWidth <= columnWidth - endMargin) {
              finalWidth = expandedWidth;
            }
          }

          positionedEvents.push({
            ...group[i],
            left: adjustedLeft,
            width: finalWidth,
          });
        }
      });

      return positionedEvents;
    },
    [columnWidth, overlapConfig.MAX_COLUMNS]
  );

  // Add a memoized version of getEventPositionExact
  const getMemoizedEventPosition = useCallback(
    (
      event: CalendarEvent,
      startHour: number,
      endHour: number,
      hourHeight: number
    ) => {
      return getEventPositionExact(event, startHour, endHour, hourHeight);
    },
    [] // This doesn't need dependencies since it's just a wrapper
  );

  // Render time labels (left column)
  const renderTimeLabels = () => (
    <View
      style={[
        styles.timeLabelsContainer,
        {
          width: TIME_LABEL_WIDTH,
          borderRightColor: theme.gridLineColor,
          borderRightWidth: 1,
          borderLeftColor: theme.gridLineColor,
          borderLeftWidth: 1,
        },
      ]}
    >
      {hours.map((hour) => (
        <View
          key={`time-${hour}`}
          style={[
            styles.timeLabel,
            {
              height: HOUR_HEIGHT * zoomLevel,
              borderBottomColor: theme.gridLineColor,
              borderBottomWidth: 1,
            },
          ]}
        >
          <Text style={[styles.timeLabelText, { color: theme.textColor }]}>
            {formatTime(new Date(new Date().setHours(hour, 0, 0, 0)), locale)}
          </Text>
        </View>
      ))}
    </View>
  );

  // Render grid lines
  const renderGridLines = () => (
    <View
      style={[
        styles.gridLinesContainer,
        {
          height: hours.length * HOUR_HEIGHT * zoomLevel,
        },
      ]}
    >
      {hours.map((hour) => (
        <View
          key={`grid-${hour}`}
          style={[
            styles.gridLine,
            {
              top: (hour - timeRange.start) * HOUR_HEIGHT * zoomLevel,
              borderTopColor: theme.gridLineColor,
              borderTopWidth: 1,
            },
          ]}
        />
      ))}

      {/* Half-hour lines (lighter) */}
      {hours.map((hour) => (
        <View
          key={`grid-half-${hour}`}
          style={[
            styles.gridLine,
            {
              top: (hour - timeRange.start + 0.5) * HOUR_HEIGHT * zoomLevel,
              borderTopColor: theme.gridLineColor,
              borderTopWidth: 0.5,
            },
          ]}
        />
      ))}
    </View>
  );

  // Render now indicator (red line)
  const renderNowIndicator = () => {
    if (!nowIndicatorPosition || !dates.some((date) => isToday(date))) {
      return null;
    }

    // Find all columns that are today
    const todayIndices = dates
      .map((date, index) => (isToday(date) ? index : -1))
      .filter((index) => index !== -1);

    return (
      <>
        {todayIndices.map((columnIndex) => (
          <View
            key={`now-indicator-${columnIndex}`}
            style={[
              styles.nowIndicator,
              {
                top: nowIndicatorPosition * zoomLevel,
                left: columnIndex * columnWidth,
                width: columnWidth,
                borderColor: theme.hourIndicatorColor,
              },
            ]}
          >
            <View
              style={[
                styles.nowIndicatorCircle,
                { backgroundColor: theme.hourIndicatorColor },
              ]}
            />
          </View>
        ))}
      </>
    );
  };

  // Function to render the snap line indicator during drag
  const renderSnapLineIndicator = () => {
    if (!effectiveSnapLineIndicator || !effectiveSnapLineIndicator.visible) {
      return null;
    }

    // Calculate position based on the time
    const hours = effectiveSnapLineIndicator.time.getHours();
    const minutes = effectiveSnapLineIndicator.time.getMinutes();

    // Calculate position from time
    let position = 0;
    if (hours >= timeRange.start && hours <= timeRange.end) {
      position = (hours - timeRange.start) * HOUR_HEIGHT * zoomLevel;
      position += (minutes / 60) * HOUR_HEIGHT * zoomLevel;
    }

    return (
      <View
        style={[
          styles.snapLineIndicator,
          {
            top: position,
            borderColor: effectiveSnapLineIndicator.color,
          },
        ]}
      />
    );
  };

  // Render time slots (clickable areas)
  const renderTimeSlots = () => {
    // Generate time intervals between hours (e.g., every 30 minutes)
    const timeSlots: Array<{ hour: number; minute: number }> = [];

    for (let hour of hours) {
      for (let minute = 0; minute < 60; minute += timeInterval) {
        timeSlots.push({ hour, minute });
      }
    }

    return (
      <View style={styles.timeSlotsContainer}>
        {dates.map((date, dayIndex) => (
          <View
            key={`day-${dayIndex}`}
            style={[
              styles.dayColumn,
              {
                width: columnWidth,
                left: dayIndex * columnWidth,
                height: hours.length * HOUR_HEIGHT * zoomLevel,
                borderRightColor: theme.gridLineColor,
                borderRightWidth: dayIndex < dates.length - 1 ? 1 : 0,
              },
              isWeekend(date) && {
                backgroundColor: theme.weekendColor,
              },
              isToday(date) && {
                backgroundColor: theme.selectedDayColor,
              },
            ]}
          >
            {/* Events for this day */}
            {renderEvents(dayIndex)}

            {/* Time slots - transparent clickable areas */}
            {timeSlots.map(({ hour, minute }, slotIndex) => {
              // Calculate slot position
              const slotTop =
                ((hour - timeRange.start) * 60 + minute) *
                (HOUR_HEIGHT / 60) *
                zoomLevel;
              const slotHeight =
                ((timeInterval * HOUR_HEIGHT) / 60) * zoomLevel;

              // Check if time slot is unavailable
              const isUnavailable = isTimeSlotUnavailable(date, hour, minute);

              // Check if this slot is the current drag target
              const isCurrentDragTarget =
                dragTarget !== null &&
                dragTarget.dayIndex === dayIndex &&
                dragTarget.hour === hour &&
                dragTarget.minute === minute;

              if (isCurrentDragTarget) {
                logger.debug("Renderizando slot resaltado", {
                  dayIndex,
                  date: date.toLocaleDateString(),
                  hour,
                  minute,
                  isUnavailable,
                  top: slotTop,
                  height: slotHeight,
                });
              }

              return (
                <TouchableWithoutFeedback
                  key={`slot-${slotIndex}-day-${dayIndex}`}
                  onPress={() => handleTimeSlotPress(dayIndex, hour, minute)}
                  onPressIn={() => highlightDropZone(dayIndex, hour, minute)}
                  disabled={isUnavailable}
                >
                  <View
                    style={[
                      styles.timeSlot,
                      {
                        top: slotTop,
                        height: slotHeight,
                      },
                      isUnavailable && {
                        backgroundColor: theme.unavailableHoursColor,
                      },
                      isCurrentDragTarget && {
                        backgroundColor:
                          theme.dragMovePreviewColor ||
                          "rgba(33, 150, 243, 0.15)",
                        borderWidth: 1,
                        borderColor: theme.primaryColor,
                        borderStyle: "dashed",
                      },
                    ]}
                  />
                </TouchableWithoutFeedback>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Update renderEvents to use the memoized function
  const renderEvents = useCallback(
    (dayIndex: number) => {
      // Filtrar eventos para este día
      const date = dates[dayIndex];
      const allEvents = filterEventsByDay(events, date);

      // Log only basic info to reduce overhead
      logger.debug(`Rendering events for day ${dayIndex}`, {
        date: date.toISOString(),
        eventCount: allEvents.length,
      });

      if (allEvents.length === 0) return null;

      // Calcular posición y dimensiones para cada evento
      const positionedEvents = positionEventsWithOverlap(allEvents);

      // Reduce logging detail level
      if (positionedEvents.length > 0) {
        logger.debug(
          `Positioned ${positionedEvents.length} events for day ${dayIndex}`
        );
      }

      return (
        <>
          {positionedEvents.map(
            (item: CalendarEvent & { left: number; width: number }) => {
              // Use the memoized position calculation function
              const { top, height } = getMemoizedEventPosition(
                item,
                timeRange.start,
                timeRange.end,
                HOUR_HEIGHT * zoomLevel
              );

              // Significantly reduce per-event logging
              // Only log on every 5th event to reduce overhead
              if (Math.random() < 0.2) {
                logger.debug(`Event position: ${item.id}`, {
                  title: item.title,
                  top,
                  height,
                });
              }

              // Add a function to handle event drag with snap time
              const handleEventDragWithSnap = (
                event: CalendarEvent,
                minuteDiff: number,
                snapTime: Date
              ): boolean => {
                // Call the provided onEventDrag handler with the snap time
                if (onEventDrag) {
                  return onEventDrag(event, minuteDiff, snapTime);
                }
                return true;
              };

              // Use a stable key that doesn't depend on refreshKey if possible
              const eventKey = `${
                item.id
              }-${item.start.getTime()}-${item.end.getTime()}`;

              return (
                <Event
                  key={eventKey}
                  event={item}
                  top={top}
                  left={item.left}
                  width={item.width}
                  height={height}
                  isResizing={isResizingEvent}
                  setIsResizing={setIsResizingEvent}
                  onEventDragWithSnap={handleEventDragWithSnap}
                  onEventDragEnd={handleEventDragEnd}
                  onDragNearEdge={handleDragNearEdge}
                  viewHeight={scrollViewHeight}
                  scrollPosition={scrollPosition}
                  columnWidth={columnWidth}
                  dayIndex={dayIndex}
                  dates={dates}
                />
              );
            }
          )}
        </>
      );
    },
    [
      dates,
      events,
      positionEventsWithOverlap,
      timeRange.start,
      timeRange.end,
      HOUR_HEIGHT,
      zoomLevel,
      isResizingEvent,
      onEventDrag,
      handleEventDragEnd,
      handleDragNearEdge,
      scrollViewHeight,
      scrollPosition,
      logger,
      getMemoizedEventPosition,
    ]
  );

  // Main render
  return (
    <GestureDetector gesture={createEventGesture}>
      <View style={styles.container}>
        <ScrollView
          {...scrollProps}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            {
              height: hours.length * HOUR_HEIGHT * zoomLevel,
              minHeight: "100%",
            },
          ]}
          onLayout={handleScrollViewLayout}
          onScrollBeginDrag={handleUserScroll}
          onScrollEndDrag={() => {
            // Ayuda a mantener el rastreo de la posición actual de desplazamiento
            logger.debug("Scroll end drag");
          }}
          directionalLockEnabled={true} // Bloquear a scroll vertical
          showsVerticalScrollIndicator={true}
          scrollEnabled={true} // Aseguramos que el scroll esté habilitado
        >
          <View style={styles.timeGrid}>
            {/* Time labels */}
            {renderTimeLabels()}

            {/* Grid container for time slots and events */}
            <View style={styles.gridContainer} onLayout={onGridLayout}>
              {/* Background grid lines */}
              {renderGridLines()}

              {/* Time slots */}
              {renderTimeSlots()}

              {/* Now indicator */}
              {renderNowIndicator()}

              {/* New event creation indicator */}
              {newEventCoords && (
                <Animated.View
                  style={[
                    styles.newEventIndicator,
                    {
                      top: Math.min(
                        newEventCoords.startY,
                        newEventCoords.currentY
                      ),
                      height: Math.abs(
                        newEventCoords.currentY - newEventCoords.startY
                      ),
                      left: newEventCoords.dayIndex * columnWidth,
                      width: columnWidth,
                      backgroundColor: theme.dragCreateIndicatorColor,
                      borderColor: theme.primaryColor,
                      opacity: createEventOpacity,
                    },
                  ]}
                />
              )}

              {/* Snap line indicator */}
              {renderSnapLineIndicator()}
            </View>
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E5EA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  timeGrid: {
    flexDirection: "row",
    flex: 1,
  },
  timeLabelsContainer: {
    width: 50, // Valor por defecto, se sobreescribirá dinámicamente
  },
  timeLabel: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeLabelText: {
    fontSize: 12,
    fontWeight: "500",
  },
  gridContainer: {
    flex: 1,
    position: "relative",
  },
  gridLinesContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  verticalGridLine: {
    position: "absolute",
    top: 0,
  },
  timeSlotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dayColumn: {
    position: "absolute",
    top: 0,
  },
  timeSlot: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  nowIndicator: {
    position: "absolute",
    height: 2,
    borderTopWidth: 2,
    zIndex: 10,
  },
  nowIndicatorCircle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -4,
    left: 0,
  },
  newEventIndicator: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    zIndex: 5,
  },
  snapLineIndicator: {
    position: "absolute",
    height: 2,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: "solid",
    zIndex: 20,
  },
});

export default TimeGrid;
