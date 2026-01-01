/**
 * MiniPlayer Component
 * Floating bar at bottom showing current track with basic controls
 */

import React, { memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Layout, Shadows } from '@/constants/theme';
import { usePlayer } from '@/contexts/PlayerContext';
import { calculateProgress } from '@/utils/formatters';

// =============================================================================
// Constants
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// Component
// =============================================================================

function MiniPlayerComponent() {
  const { state, controls } = usePlayer();
  const { currentTrack, isPlaying, position, duration } = state;

  // Don't render if no track is loaded
  if (!currentTrack) return null;

  // Calculate progress for the thin bar
  const progress = calculateProgress(position, duration);

  /**
   * Navigate to full player screen
   */
  const handlePress = () => {
    router.push('/modal');
  };

  /**
   * Handle play/pause button
   */
  const handlePlayPause = () => {
    controls.togglePlayPause();
  };

  /**
   * Handle next track button
   */
  const handleNext = () => {
    controls.next();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {/* Background with gradient */}
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.backgroundElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.background}
      >
        {/* Progress bar at top */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Artwork */}
          <View style={styles.artworkContainer}>
            {currentTrack.artwork ? (
              <Image 
                source={{ uri: currentTrack.artwork }} 
                style={styles.artwork}
              />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Ionicons 
                  name="musical-note" 
                  size={20} 
                  color={Colors.textMuted} 
                />
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Play/Pause Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePlayPause}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleNext}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="play-forward"
                size={24}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Layout.tabBarHeight + 8,
    left: Spacing.sm,
    right: Spacing.sm,
    height: Layout.miniPlayerHeight,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  background: {
    flex: 1,
  },
  
  // Progress bar
  progressContainer: {
    height: 2,
    backgroundColor: Colors.progressBar,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  
  // Content
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  
  // Artwork
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundPressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Track info
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  artist: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: Spacing.sm,
  },
});

// =============================================================================
// Export
// =============================================================================

export const MiniPlayer = memo(MiniPlayerComponent);
export default MiniPlayer;
