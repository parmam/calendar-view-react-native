import { useRef, useState, useCallback } from 'react';
import { PanResponder, Animated, LayoutRectangle } from 'react-native';
import { CalendarEvent } from '../types';

interface UseDraggableEventProps {
  event: CalendarEvent;
  hourHeight: number;
  timeInterval: number;
  columnWidth: number;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: (deltaX: number, deltaY: number) => void;
}

export const useDraggableEvent = ({
  event,
  hourHeight,
  timeInterval,
  columnWidth,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseDraggableEventProps) => {
  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);

  // Track drag start position
  const dragStartPosition = useRef({ x: 0, y: 0 });

  // Create pan responder
  const panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder
      onStartShouldSetPanResponder: () => event.isDraggable !== false,
      onMoveShouldSetPanResponder: () => event.isDraggable !== false,

      // The gesture has started
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(true);

        // Store initial position
        dragStartPosition.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        };

        // Set the initial value to the current state
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });

        // Animate scale and opacity
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.05,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        onDragStart?.();
      },

      // The gesture is moving
      onPanResponderMove: (evt, gestureState) => {
        // Update pan position
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });

        onDragMove?.(gestureState.dx, gestureState.dy);
      },

      // The gesture has ended
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);

        // Flatten the offset to avoid issues
        pan.flattenOffset();

        // Calculate final position
        const finalDeltaX = gestureState.dx;
        const finalDeltaY = gestureState.dy;

        // Reset animations
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Call the drag end handler
        onDragEnd?.(finalDeltaX, finalDeltaY);
      },

      // The gesture was cancelled
      onPanResponderTerminate: () => {
        setIsDragging(false);

        // Reset animations
        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
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
    panHandlers: panResponder.panHandlers,
    animatedStyle: {
      transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
      opacity,
    },
    isDragging,
    onLayout,
  };
};
