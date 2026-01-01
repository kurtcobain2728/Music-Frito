/**
 * Favorites Screen
 * Shows all favorited tracks
 */

import React, { useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '@/constants/theme';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { TrackItem } from '@/components/TrackItem';
import { formatTrackCount } from '@/utils/formatters';
import type { Track } from '@/types/audio';

// =============================================================================
// Component
// =============================================================================

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { tracks } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const { favorites } = useFavorites();

  /**
   * Get favorite tracks from library
   */
  const favoriteTracks = useMemo(() => {
    return tracks.filter(track => favorites.includes(track.id));
  }, [tracks, favorites]);

  /**
   * Navigate back
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * Handle track press
   */
  const handleTrackPress = useCallback((track: Track) => {
    controls.playTrack(track, favoriteTracks);
  }, [controls, favoriteTracks]);

  /**
   * Play all favorites
   */
  const handlePlayAll = useCallback(() => {
    if (favoriteTracks.length > 0) {
      controls.playTrack(favoriteTracks[0], favoriteTracks);
    }
  }, [controls, favoriteTracks]);

  /**
   * Shuffle all favorites
   */
  const handleShuffle = useCallback(() => {
    if (favoriteTracks.length > 0) {
      controls.playTrack(favoriteTracks[0], favoriteTracks);
      controls.toggleShuffle();
    }
  }, [controls, favoriteTracks]);

  /**
   * Render track item
   */
  const renderTrackItem = useCallback(({ item }: { item: Track }) => (
    <TrackItem
      track={item}
      isPlaying={state.isPlaying && state.currentTrack?.id === item.id}
      isCurrent={state.currentTrack?.id === item.id}
      onPress={handleTrackPress}
      showHeart={true}
    />
  ), [state.currentTrack, state.isPlaying, handleTrackPress]);

  /**
   * Get unique key for each track
   */
  const keyExtractor = useCallback((item: Track) => item.id, []);

  /**
   * Render header
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Heart icon */}
      <LinearGradient
        colors={['#FF6B6B', '#FF4757']}
        style={styles.iconContainer}
      >
        <Ionicons name="heart" size={48} color="white" />
      </LinearGradient>

      <Text style={styles.title}>Favoritos</Text>
      <Text style={styles.subtitle}>{formatTrackCount(favoriteTracks.length)}</Text>

      {/* Action buttons */}
      {favoriteTracks.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
            <Ionicons name="shuffle" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.playButton} onPress={handlePlayAll}>
            <Ionicons name="play" size={28} color={Colors.background} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  /**
   * Empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Sin favoritos</Text>
      <Text style={styles.emptyText}>
        Toca el corazón en cualquier canción para agregarla aquí
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#FF6B6B40', Colors.background]}
        style={styles.gradient}
      />

      {/* Back button */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + Spacing.sm }]}
        onPress={handleBack}
      >
        <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Track list */}
      <FlatList
        data={favoriteTracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          favoriteTracks.length === 0 && styles.listContentEmpty,
          { paddingBottom: Layout.screenPaddingBottom + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  
  // Back button
  backButton: {
    position: 'absolute',
    left: Spacing.base,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
  },
  
  // Header
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shuffleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // List
  listContent: {
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
