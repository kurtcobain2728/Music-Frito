import { useTheme } from '@/contexts/ThemeContext';
import React, { memo, useEffect, useRef } from 'react';
import { PanResponder, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface InteractiveScrollBarProps {
  contentHeight: number;
  visibleHeight: number;
  scrollOffset: number;
  isScrolling: boolean;
  onDrag?: (scrollOffset: number) => void;
}

const THUMB_MIN_HEIGHT = 40;
const BAR_WIDTH = 6;
const TOUCH_WIDTH = 28;
const HIDE_DELAY = 1500;

function InteractiveScrollBarComponent({
  contentHeight,
  visibleHeight,
  scrollOffset,
  isScrolling,
  onDrag,
}: InteractiveScrollBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const opacity = useSharedValue(0);
  const isDragging = useRef(false);
  const barWidth = useSharedValue(BAR_WIDTH);

  const ratio = contentHeight > 0 ? visibleHeight / contentHeight : 1;
  const thumbHeight = Math.max(THUMB_MIN_HEIGHT, ratio * visibleHeight);
  const maxScroll = contentHeight - visibleHeight;
  const maxThumbOffset = visibleHeight - thumbHeight;

  useEffect(() => {
    if (isScrolling || isDragging.current) {
      opacity.value = withTiming(1, { duration: 120 });
    } else {
      opacity.value = withDelay(HIDE_DELAY, withTiming(0, { duration: 400 }));
    }
  }, [isScrolling, opacity]);

  const thumbOffset =
    maxScroll > 0 ? interpolate(scrollOffset, [0, maxScroll], [0, maxThumbOffset], Extrapolation.CLAMP) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        opacity.value = withTiming(1, { duration: 80 });
        barWidth.value = withTiming(10, { duration: 100 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (!onDrag || maxThumbOffset <= 0) return;
        const currentThumbPos = thumbOffset + gestureState.dy;
        const clampedPos = Math.max(0, Math.min(currentThumbPos, maxThumbOffset));
        const scrollRatio = clampedPos / maxThumbOffset;
        const newScrollOffset = scrollRatio * maxScroll;
        onDrag(newScrollOffset);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        barWidth.value = withTiming(BAR_WIDTH, { duration: 200 });
        opacity.value = withDelay(HIDE_DELAY, withTiming(0, { duration: 400 }));
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        barWidth.value = withTiming(BAR_WIDTH, { duration: 200 });
        opacity.value = withDelay(HIDE_DELAY, withTiming(0, { duration: 400 }));
      },
    }),
  ).current;

  const barAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const trackWidthStyle = useAnimatedStyle(() => ({
    width: barWidth.value,
    borderRadius: barWidth.value / 2,
  }));

  const thumbWidthStyle = useAnimatedStyle(() => ({
    width: barWidth.value,
    borderRadius: barWidth.value / 2,
  }));

  if (ratio >= 1) return null;

  return (
    <Animated.View style={[styles.container, barAnimatedStyle]} {...panResponder.panHandlers}>
      <Animated.View style={[styles.track, { backgroundColor: c.surfaceBorder }, trackWidthStyle]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              height: thumbHeight,
              top: thumbOffset,
              backgroundColor: c.textSecondary,
            },
            thumbWidthStyle,
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TOUCH_WIDTH,
    alignItems: 'flex-end',
    paddingRight: 2,
    zIndex: 100,
  },
  track: {
    width: BAR_WIDTH,
    flex: 1,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: BAR_WIDTH,
  },
});

export const InteractiveScrollBar = memo(InteractiveScrollBarComponent);
export default InteractiveScrollBar;
