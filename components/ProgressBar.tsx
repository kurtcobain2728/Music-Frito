/**
 * ProgressBar Component
 * Interactive progress bar for audio playback with seek functionality
 */

import React, { memo, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet,
  LayoutChangeEvent,
  Text,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { formatDuration } from '@/utils/formatters';

// =============================================================================
// Types
// =============================================================================

interface ProgressBarProps {
  /** Current position in milliseconds */
  position: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Callback when user seeks to a position */
  onSeek: (position: number) => void;
  /** Whether to show time labels */
  showTimeLabels?: boolean;
  /** Height of the progress bar */
  height?: number;
}

// =============================================================================
// Component
// =============================================================================

function ProgressBarComponent({
  position,
  duration,
  onSeek,
  showTimeLabels = true,
  height = 4,
}: ProgressBarProps) {
  // Track width for calculating seek position
  const [barWidth, setBarWidth] = useState(0);
  
  // Animated values for interaction
  const thumbScale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const dragPosition = useSharedValue(0);

  // Calculate progress percentage
  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  /**
   * Handle layout to get bar width
   */
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  }, []);

  /**
   * Calculate position from x coordinate
   */
  const calculatePositionFromX = useCallback((x: number): number => {
    if (barWidth <= 0) return 0;
    const clampedX = Math.max(0, Math.min(barWidth, x));
    return (clampedX / barWidth) * duration;
  }, [barWidth, duration]);

  /**
   * Handle seek callback
   */
  const handleSeek = useCallback((newPosition: number) => {
    onSeek(newPosition);
  }, [onSeek]);

  // Gesture handler for seeking
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      isDragging.value = true;
      thumbScale.value = withTiming(1.5, { duration: 100 });
      dragPosition.value = event.x;
    })
    .onUpdate((event) => {
      dragPosition.value = event.x;
    })
    .onEnd((event) => {
      isDragging.value = false;
      thumbScale.value = withTiming(1, { duration: 100 });
      const newPosition = calculatePositionFromX(event.x);
      runOnJS(handleSeek)(newPosition);
    })
    .onFinalize(() => {
      isDragging.value = false;
      thumbScale.value = withTiming(1, { duration: 100 });
    });

  // Tap gesture for quick seek
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const newPosition = calculatePositionFromX(event.x);
      runOnJS(handleSeek)(newPosition);
    });

  // Combine gestures
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Animated styles for thumb
  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Progress Bar Track */}
      <GestureDetector gesture={composedGesture}>
        <View 
          style={[styles.trackContainer, { height: height + 20 }]}
          onLayout={handleLayout}
        >
          {/* Background track */}
          <View style={[styles.track, { height }]}>
            {/* Filled portion */}
            <View 
              style={[
                styles.filled, 
                { 
                  height,
                  width: `${progress * 100}%`,
                }
              ]} 
            />
          </View>

          {/* Thumb indicator */}
          <Animated.View 
            style={[
              styles.thumb,
              thumbAnimatedStyle,
              { 
                left: `${progress * 100}%`,
                marginLeft: -6, // Center the thumb
              }
            ]}
          />
        </View>
      </GestureDetector>

      {/* Time Labels */}
      {showTimeLabels && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatDuration(position)}
          </Text>
          <Text style={styles.timeText}>
            {formatDuration(duration)}
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  
  // Track
  trackContainer: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 6, // Space for thumb overflow
  },
  track: {
    width: '100%',
    backgroundColor: Colors.progressBar,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  filled: {
    backgroundColor: Colors.progressBarFilled,
    borderRadius: BorderRadius.full,
  },
  
  // Thumb
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.sliderThumb,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Time labels
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  timeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.regular,
  },
});

// =============================================================================
// Export
// =============================================================================

export const ProgressBar = memo(ProgressBarComponent);
export default ProgressBar;
