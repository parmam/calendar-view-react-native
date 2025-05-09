import { useState, useRef, useCallback } from "react";
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  ScrollViewProps,
} from "react-native";
import { logger } from "./logger";

/**
 * Scroll position data
 */
export interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Hook for managing scroll position in calendar views
 */
export const useScrollHandler = (
  initialPosition: ScrollPosition = { x: 0, y: 0 }
) => {
  // Reference to the ScrollView component
  const scrollViewRef = useRef<ScrollView>(null);

  // Current scroll position
  const [scrollPosition, setScrollPosition] =
    useState<ScrollPosition>(initialPosition);

  // Handle scroll events - no dependencies to avoid re-creation
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      try {
        const { x, y } = event.nativeEvent.contentOffset;
        // Only update state if values have changed
        setScrollPosition((prev) => {
          if (prev.x !== x || prev.y !== y) {
            return { x, y };
          }
          return prev;
        });
      } catch (error) {
        logger.error("Error handling scroll event", error);
      }
    },
    []
  );

  // Scroll to a specific position - no dependencies to avoid re-creation
  const scrollTo = useCallback(
    (options: { x?: number; y?: number; animated?: boolean }) => {
      try {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo(options);
        }
      } catch (error) {
        logger.error("Error scrolling to position", error);
      }
    },
    []
  );

  // Return both current values and functions
  return {
    scrollViewRef,
    scrollPosition,
    handleScroll,
    scrollTo,
    // Utility props to simplify ScrollView integration with enhanced properties
    scrollProps: {
      ref: scrollViewRef,
      onScroll: handleScroll,
      scrollEventThrottle: 16,
      nestedScrollEnabled: true,
      keyboardShouldPersistTaps: "handled",
      alwaysBounceVertical: true,
      showsVerticalScrollIndicator: true,
      overScrollMode: "always", // for Android
    } as ScrollViewProps,
  };
};
