import { BorderRadius, Layout, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { calculateProgress } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useRef } from 'react';
import {
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { OptimizedArtwork } from './OptimizedArtwork';

function MiniPlayerComponent() {
  const { state, controls } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const { currentTrack, isPlaying, position, duration } = state;

  if (!currentTrack) return null;

  const progress = calculateProgress(position, duration);

  const translateX = useSharedValue(0);
  const swipeHandled = useRef(false);

  const SWIPE_THRESHOLD = 60;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        swipeHandled.current = false;
      },
      onPanResponderMove: (_, gs) => {
        translateX.value = gs.dx;
        if (!swipeHandled.current && Math.abs(gs.dx) > SWIPE_THRESHOLD) {
          swipeHandled.current = true;
          if (gs.dx < -SWIPE_THRESHOLD) {
            controls.next();
          } else if (gs.dx > SWIPE_THRESHOLD) {
            controls.previous();
          }
        }
      },
      onPanResponderRelease: () => {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      },
      onPanResponderTerminate: () => {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      },
    })
  ).current;

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.3 }],
    opacity: 1 - Math.abs(translateX.value) / 300,
  }));

  const handlePress = useCallback(() => { router.push('/modal'); }, []);
  const handlePlayPause = useCallback(() => { controls.togglePlayPause(); }, [controls]);
  const handleNext = useCallback(() => { controls.next(); }, [controls]);

  const innerContent = (
    <>
      <View style={[styles.progressContainer, { backgroundColor: c.progressBar }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: c.primary }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.artworkContainer}>
          <OptimizedArtwork
            uri={currentTrack.artwork}
            trackUri={currentTrack.uri}
            trackId={currentTrack.id}
            size={48}
            borderRadius={BorderRadius.sm}
          />
        </View>
        <View style={styles.trackInfo}>
          <Text style={[styles.title, { color: c.textPrimary }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artist, { color: c.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handlePlayPause} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={c.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="play-forward" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <Animated.View style={[styles.container, { ...Shadows.lg }, swipeAnimatedStyle]} {...panResponder.panHandlers}>
    <TouchableOpacity
      style={styles.touchable}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {theme.isBlurred ? (
        (() => {
          const supportsNativeBlur = Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 31);
          if (supportsNativeBlur) {
            return (
              <BlurView intensity={c.blurIntensity} tint={c.blurTint} style={styles.background}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                {innerContent}
              </BlurView>
            );
          }
          return (
            <LinearGradient
              colors={['rgba(25, 25, 40, 0.95)', 'rgba(15, 15, 28, 0.97)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.background}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
              {innerContent}
            </LinearGradient>
          );
        })()
      ) : (
        <LinearGradient
          colors={[c.backgroundHighlight, c.backgroundElevated]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.background}
        >
          {innerContent}
        </LinearGradient>
      )}
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.sm,
    right: Spacing.sm,
    height: Layout.miniPlayerHeight,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  background: { flex: 1 },
  progressContainer: { height: 2 },
  progressBar: { height: '100%' },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  artwork: { width: '100%', height: '100%' },
  trackInfo: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  artist: { fontSize: Typography.fontSize.sm },
  controls: { flexDirection: 'row', alignItems: 'center' },
  controlButton: { padding: Spacing.sm },
  touchable: { flex: 1 },
});

export const MiniPlayer = memo(MiniPlayerComponent);
export default MiniPlayer;
