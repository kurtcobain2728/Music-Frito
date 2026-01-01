/**
 * TrackItem Component
 * Displays a single track in a list with artwork, title, artist, duration and favorite button
 */

import React, { memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '@/constants/theme';
import { formatDuration } from '@/utils/formatters';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Track } from '@/types/audio';

// =============================================================================
// Types
// =============================================================================

interface TrackItemProps {
  /** Track data to display */
  track: Track;
  /** Whether this track is currently playing */
  isPlaying?: boolean;
  /** Whether this track is the current track (even if paused) */
  isCurrent?: boolean;
  /** Index in the list (for numbered lists) */
  index?: number;
  /** Show index instead of artwork */
  showIndex?: boolean;
  /** Show heart button for favorites */
  showHeart?: boolean;
  /** Callback when track is pressed */
  onPress: (track: Track) => void;
  /** Callback for options/more button */
  onOptionsPress?: (track: Track) => void;
}

// =============================================================================
// Component
// =============================================================================

function TrackItemComponent({
  track,
  isPlaying = false,
  isCurrent = false,
  index,
  showIndex = false,
  showHeart = false,
  onPress,
  onOptionsPress,
}: TrackItemProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(track.id);

  // Handle press events
  const handlePress = () => onPress(track);
  const handleOptionsPress = () => onOptionsPress?.(track);
  const handleHeartPress = () => toggleFavorite(track);

  return (
    <TouchableOpacity
      style={[styles.container, isCurrent && styles.containerActive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Left section: Index or Artwork */}
      <View style={styles.leftSection}>
        {showIndex && index !== undefined ? (
          // Show index number
          <View style={styles.indexContainer}>
            {isPlaying ? (
              <Ionicons 
                name="musical-notes" 
                size={16} 
                color={Colors.primary} 
              />
            ) : (
              <Text style={[
                styles.indexText,
                isCurrent && styles.indexTextActive
              ]}>
                {index + 1}
              </Text>
            )}
          </View>
        ) : (
          // Show artwork
          <View style={styles.artworkContainer}>
            {track.artwork ? (
              <Image 
                source={{ uri: track.artwork }} 
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
            {/* Playing indicator overlay */}
            {isPlaying && (
              <View style={styles.playingOverlay}>
                <Ionicons 
                  name="volume-high" 
                  size={16} 
                  color={Colors.primary} 
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Middle section: Title and Artist */}
      <View style={styles.infoSection}>
        <Text 
          style={[styles.title, isCurrent && styles.titleActive]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {/* Right section: Heart, Duration and Options */}
      <View style={styles.rightSection}>
        {showHeart && (
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={handleHeartPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={favorite ? 'heart' : 'heart-outline'} 
              size={20} 
              color={favorite ? '#FF6B6B' : Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        <Text style={styles.duration}>
          {formatDuration(track.duration)}
        </Text>
        {onOptionsPress && (
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={handleOptionsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="ellipsis-horizontal" 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.trackItemHeight,
    paddingHorizontal: Spacing.base,
    backgroundColor: 'transparent',
  },
  containerActive: {
    backgroundColor: Colors.backgroundHighlight,
  },
  
  // Left section
  leftSection: {
    marginRight: Spacing.md,
  },
  indexContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.regular,
  },
  indexTextActive: {
    color: Colors.primary,
  },
  
  // Artwork
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Info section
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  titleActive: {
    color: Colors.primary,
  },
  artist: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Right section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  duration: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  optionsButton: {
    padding: Spacing.xs,
  },
});

// =============================================================================
// Export
// =============================================================================

export const TrackItem = memo(TrackItemComponent);
export default TrackItem;
