import { useRef, useState, useCallback } from 'react';
import { PanResponder, Animated, LayoutRectangle, Platform } from 'react-native';
import { CalendarEvent } from '../types';
import { useLogger } from '../utils/logger';

interface UseDraggableEventProps {
  event: CalendarEvent;
  hourHeight: number;
  columnWidth: number;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: (deltaX: number, deltaY: number) => void;
}

export const useDraggableEvent = ({
  event,
  hourHeight,
  columnWidth,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseDraggableEventProps) => {
  // Setup logger
  const logger = useLogger('useDraggableEvent');

  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  // Track drag start position
  const dragStartPosition = useRef({ x: 0, y: 0 });

  // Log if the event is draggable
  const canDrag = event.isDraggable !== false;

  // Create pan responder with improved responsiveness
  const panResponder = useRef(
    PanResponder.create({
      // More permissive gesture detection
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to deliberate drags (filter out taps)
        const { dx, dy } = gestureState;
        const dragDistance = Math.sqrt(dx * dx + dy * dy);
        const shouldRespond = canDrag && dragDistance > 5;
        logger.debug(`Move should respond: ${shouldRespond}, distance: ${dragDistance}`);
        return shouldRespond;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      // The gesture has started
      onPanResponderGrant: (evt, gestureState) => {
        logger.debug(`Drag GRANTED for event: ${event.id}`);
        setIsDragging(true);

        // Store initial position
        dragStartPosition.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        };

        // Set the initial value to the current state
        pan.setOffset({
          x: (pan.x as any)['_value'] || 0,
          y: (pan.y as any)['_value'] || 0,
        });
        pan.setValue({ x: 0, y: 0 });

        // Animate scale and opacity
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.05,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();

        onDragStart?.();
      },

      // The gesture is moving
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Pass raw dx/dy to the component for logic handling
        onDragMove?.(dx, dy);
      },

      // The gesture has ended
      onPanResponderRelease: (evt, gestureState) => {
        logger.debug(`Drag RELEASED for event: ${event.id}`);
        setIsDragging(false);

        // Flatten the offset to avoid issues
        pan.flattenOffset();

        const { dx, dy } = gestureState;

        // Reset animations
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();

        // Call the drag end handler with raw values
        onDragEnd?.(dx, dy);
      },

      // The gesture was cancelled
      onPanResponderTerminate: () => {
        logger.debug(`Drag TERMINATED for event: ${event.id}`);
        setIsDragging(false);

        // Reset animations
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
      },
    })
  ).current;

  // Handle layout
  const onLayout = useCallback((event: any) => {
    const { layout } = event.nativeEvent;
    setLayout(layout);
  }, []);

  return {
    pan,
    panHandlers: panResponder.panHandlers,
    animatedStyle: {
      transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
      opacity,
    },
    isDragging,
    onLayout,
  };
};
