import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import { useCalendar } from './CalendarContext';
import { formatTime } from './utils';
import { CalendarEvent } from './types';
import { useLogger } from './utils/logger';
import { useLayoutConfig } from './config';
import useDragAndDrop from './hooks/useDragAndDrop';

interface EventProps {
  event: CalendarEvent;
  width: number;
  left: number;
  top: number;
  height: number;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
  onEventDragWithSnap?: (event: CalendarEvent, minuteDiff: number, snapTime: Date) => boolean;
  onEventDragEnd?: () => void;
  onDragNearEdge?: (distanceFromEdge: number, direction: 'up' | 'down') => void;
  viewHeight?: number;
  scrollPosition: { x: number; y: number };
  columnWidth?: number;
  dayIndex?: number;
  dates?: Date[];
}

const Event: React.FC<EventProps> = ({
  event,
  width,
  left,
  top,
  height,
  isResizing,
  setIsResizing,
  onEventDragWithSnap,
  onEventDragEnd,
  onDragNearEdge,
  viewHeight,
  scrollPosition,
  columnWidth,
  dayIndex,
  dates,
}) => {
  const logger = useLogger('Event');
  // Obtener contexto y configuración
  const { onEventPress, theme, locale, viewType } = useCalendar();
  const { layoutConfig } = useLayoutConfig();
  const HOUR_HEIGHT = layoutConfig.HOUR_HEIGHT;
  // Estado local para el evento
  const [eventHeight, setEventHeight] = useState(height);
  const [isPressed, setIsPressed] = useState(false);
  // Usar el hook de drag and drop
  const {
    panResponder,
    translateY,
    translateX,
    scaleAnim,
    opacityAnim,
    isTargetUnavailable,
    previewPosition,
    horizontalPreviewPosition,
    clearPreviewElements,
    calculatePreviewPosition,
    getHorizontalPreviewPosition,
  } = useDragAndDrop({
    event,
    top,
    left,
    width,
    height,
    timeInterval: 30, // Valor por defecto, se debería obtener del contexto
    hourHeight: HOUR_HEIGHT,
    setIsResizing,
    onEventDragWithSnap,
    onEventDragEnd,
    onDragNearEdge,
    viewHeight,
    scrollPosition,
    columnWidth,
    dayIndex,
    dates,
    viewType,
  });
  // Actualizar altura cuando cambia la prop
  useEffect(() => {
    if (height > 0) {
      setEventHeight(height);
    }
  }, [height]);
  // Limpiar elementos de vista previa cuando se detiene el arrastre
  useEffect(() => {
    if (!isResizing) {
      clearPreviewElements();
    }
  }, [isResizing, clearPreviewElements]);
  // Animación al montar el componente
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  // Manejar cambios de layout
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const layoutHeight = e.nativeEvent.layout.height;
      if (layoutHeight > 0) {
        setEventHeight(Math.max(layoutHeight, 25)); // Altura mínima
      }
    },
    [event.id]
  );
  // Manejar pulsación en el evento
  const handleEventPress = useCallback(() => {
    if (onEventPress) {
      onEventPress(event);
    }

    setIsPressed(true);
    // Animación de feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsPressed(false);
    });
  }, [event, onEventPress, scaleAnim]);

  // Ajustar color de texto basado en fondo
  const getContrastText = (bgColor: string) => {
    // Extraer componentes RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    // Calcular luminancia
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Retornar color adecuado
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Renderizar elementos de vista previa
  const renderPreviewElements = () => {
    if (!isResizing) return null;

    const connectionLineWidth = 2; // Valor por defecto

    return (
      <>
        {/* Línea de ajuste vertical */}
        {previewPosition !== null && (
          <View
            style={[
              styles.previewLine,
              {
                top: previewPosition,
                borderColor: isTargetUnavailable ? theme.errorColor : theme.primaryColor,
                width: width - 4,
                left: left + 2,
                borderWidth: connectionLineWidth,
              },
            ]}
          />
        )}

        {/* Línea de ajuste horizontal */}
        {horizontalPreviewPosition !== null && (
          <View
            style={[
              styles.horizontalPreviewLine,
              {
                top: top + height / 2,
                borderColor: isTargetUnavailable ? theme.errorColor : theme.primaryColor,
                width: columnWidth ? Math.abs(horizontalPreviewPosition) : 0,
                left:
                  horizontalPreviewPosition > 0 ? left + width : left + horizontalPreviewPosition,
                borderWidth: connectionLineWidth,
              },
            ]}
          />
        )}

        {/* Rectángulo de vista previa */}
        {(previewPosition !== null || horizontalPreviewPosition !== null) && (
          <View
            style={[
              styles.previewRectangle,
              {
                top: previewPosition !== null ? previewPosition : top,
                height: eventHeight,
                width: width,
                left:
                  horizontalPreviewPosition !== null
                    ? horizontalPreviewPosition > 0
                      ? left + width
                      : left + horizontalPreviewPosition
                    : left,
                backgroundColor: isTargetUnavailable
                  ? theme.errorColor + '22'
                  : theme.successColor + '22',
                borderColor: isTargetUnavailable ? theme.errorColor : theme.primaryColor,
                borderWidth: 2,
                borderStyle: 'dashed',
              },
            ]}
          />
        )}

        {/* Línea de conexión vertical */}
        {previewPosition !== null && (
          <View
            style={[
              styles.connectionLine,
              {
                top: Math.min(top + height / 2, previewPosition),
                height: Math.abs(previewPosition - (top + height / 2)),
                left: left + width / 2,
                borderColor: isTargetUnavailable ? theme.errorColor : theme.primaryColor,
                borderLeftWidth: connectionLineWidth,
              },
            ]}
          />
        )}

        {/* Línea de conexión horizontal */}
        {horizontalPreviewPosition !== null && previewPosition === null && (
          <View
            style={[
              styles.horizontalConnectionLine,
              {
                top: top + height / 2,
                width: Math.abs(horizontalPreviewPosition),
                left:
                  horizontalPreviewPosition > 0
                    ? left + width
                    : left + horizontalPreviewPosition + width,
                borderColor: isTargetUnavailable ? theme.errorColor : theme.primaryColor,
                borderTopWidth: connectionLineWidth,
              },
            ]}
          />
        )}
      </>
    );
  };

  const backgroundColor = event.color || theme.primaryColor;
  const textColor = getContrastText(backgroundColor);

  return (
    <>
      {renderPreviewElements()}

      <Animated.View
        onLayout={onLayout}
        {...panResponder.panHandlers}
        style={[
          styles.event,
          {
            width,
            left,
            top,
            height,
            backgroundColor,
            transform: [{ translateY }, { translateX }, { scale: scaleAnim }],
            opacity: isTargetUnavailable ? 0.5 : opacityAnim,
            ...(isPressed
              ? {
                  borderWidth: 2,
                  borderColor: isTargetUnavailable ? theme.errorColor : theme.successColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 5,
                }
              : {}),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.eventContent}
          onPress={handleEventPress}
          activeOpacity={0.7}
          disabled={isResizing}
        >
          <Text style={[styles.eventTitle, { color: textColor }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.eventTime, { color: textColor }]} numberOfLines={1}>
            {formatTime(event.start, locale)} - {formatTime(event.end, locale)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  event: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  eventContent: {
    flex: 1,
    padding: 4,
    justifyContent: 'center',
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventTime: {
    fontSize: 10,
  },
  previewLine: {
    position: 'absolute',
    borderStyle: 'dashed',
    height: 0,
    zIndex: 8,
  },
  horizontalPreviewLine: {
    position: 'absolute',
    borderStyle: 'dashed',
    height: 0,
    zIndex: 8,
  },
  connectionLine: {
    position: 'absolute',
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    zIndex: 7,
    width: 0,
  },
  horizontalConnectionLine: {
    position: 'absolute',
    borderStyle: 'dashed',
    height: 0,
    zIndex: 7,
  },
  previewRectangle: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 4,
    zIndex: 6,
  },
});

export default Event;
