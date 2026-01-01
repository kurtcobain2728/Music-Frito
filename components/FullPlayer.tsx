/**
 * FullPlayer Component
 * Full-screen player with all controls, artwork, progress, favorites and playlist options
 * Spotify-style design with responsive layout for all screen sizes
 */

import React, { memo, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ProgressBar } from './ProgressBar';
import { AddToPlaylistModal } from './AddToPlaylistModal';

// =============================================================================
// Component
// =============================================================================

function FullPlayerComponent() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { state, controls } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  const { 
    currentTrack, 
    isPlaying, 
    position, 
    duration,
    shuffle,
    repeat,
    queue,
    currentIndex,
  } = state;

  // Responsive artwork size - adapts to screen height for small phones
  const maxArtworkSize = screenWidth - Spacing.xl * 2;
  const availableHeight = screenHeight - insets.top - insets.bottom - 350;
  const artworkSize = Math.min(maxArtworkSize, availableHeight, 320);
  
  // Scale controls based on screen size
  const playButtonSize = Math.min(64, screenWidth * 0.16);
  const skipButtonSize = Math.min(28, screenWidth * 0.07);
  const secondaryIconSize = Math.min(22, screenWidth * 0.055);

  // Check if current track is favorite
  const isCurrentFavorite = currentTrack ? isFavorite(currentTrack.id) : false;

  // If no track, show placeholder
  if (!currentTrack) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[Colors.backgroundHighlight, Colors.background]}
          style={styles.gradient}
        >
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No hay canción reproduciéndose</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  /**
   * Close the full player
   */
  const handleClose = () => {
    router.back();
  };

  /**
   * Toggle favorite for current track
   */
  const handleToggleFavorite = () => {
    if (currentTrack) {
      toggleFavorite(currentTrack);
    }
  };

  /**
   * Open add to playlist modal
   */
  const handleAddToPlaylist = () => {
    setShowPlaylistModal(true);
  };

  /**
   * Get repeat icon color
   */
  const getRepeatColor = () => {
    return repeat !== 'off' ? Colors.primary : Colors.textSecondary;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.background, Colors.background]}
        locations={[0, 0.3, 1]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleClose}
            >
              <Ionicons name="chevron-down" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerLabel}>REPRODUCIENDO DE</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentTrack.album}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.headerButton} onPress={handleAddToPlaylist}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Artwork */}
          <View style={[styles.artworkContainer, { width: artworkSize, height: artworkSize }]}>
            {currentTrack.artwork ? (
              <Image 
                source={{ uri: currentTrack.artwork }} 
                style={styles.artwork}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[Colors.backgroundHighlight, Colors.background]}
                style={styles.artworkPlaceholder}
              >
                <Ionicons 
                  name="musical-notes" 
                  size={artworkSize * 0.35} 
                  color={Colors.textMuted} 
                />
              </LinearGradient>
            )}
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <View style={styles.trackInfoText}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            
            {/* Like button */}
            <TouchableOpacity style={styles.likeButton} onPress={handleToggleFavorite}>
              <Ionicons 
                name={isCurrentFavorite ? 'heart' : 'heart-outline'} 
                size={26} 
                color={isCurrentFavorite ? '#FF6B6B' : Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <ProgressBar
              position={position}
              duration={duration}
              onSeek={controls.seek}
              showTimeLabels={true}
            />
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            {/* Shuffle */}
            <TouchableOpacity 
              style={styles.secondaryControl}
              onPress={controls.toggleShuffle}
            >
              <Ionicons 
                name="shuffle" 
                size={secondaryIconSize} 
                color={shuffle ? Colors.primary : Colors.textSecondary} 
              />
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity 
              style={styles.skipControl}
              onPress={controls.previous}
            >
              <Ionicons name="play-skip-back" size={skipButtonSize} color={Colors.textPrimary} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity 
              style={[
                styles.playButton,
                { width: playButtonSize, height: playButtonSize, borderRadius: playButtonSize / 2 }
              ]}
              onPress={controls.togglePlayPause}
            >
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={playButtonSize * 0.45} 
                color={Colors.background} 
              />
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity 
              style={styles.skipControl}
              onPress={controls.next}
            >
              <Ionicons name="play-skip-forward" size={skipButtonSize} color={Colors.textPrimary} />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity 
              style={styles.secondaryControl}
              onPress={controls.toggleRepeat}
            >
              <View>
                <Ionicons 
                  name="repeat" 
                  size={secondaryIconSize} 
                  color={getRepeatColor()} 
                />
                {repeat === 'one' && (
                  <View style={styles.repeatOneBadge}>
                    <Text style={styles.repeatOneText}>1</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.base }]}>
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomButton}>
              <Ionicons name="list" size={18} color={Colors.textSecondary} />
              <Text style={styles.queueText}>
                {currentIndex + 1}/{queue.length}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showPlaylistModal}
        track={currentTrack}
        onClose={() => setShowPlaylistModal(false)}
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textMuted,
    marginTop: Spacing.base,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  
  // Artwork
  artworkContainer: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Track Info
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  trackInfoText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  likeButton: {
    padding: Spacing.sm,
  },
  
  // Progress
  progressContainer: {
    marginTop: Spacing.lg,
  },
  
  // Main Controls
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.sm,
  },
  secondaryControl: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipControl: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  repeatOneBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: {
    fontSize: 8,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.background,
  },
  
  // Bottom Controls
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  queueText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
});

// =============================================================================
// Export
// =============================================================================

export const FullPlayer = memo(FullPlayerComponent);
export default FullPlayer;
