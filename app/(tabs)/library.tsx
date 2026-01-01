/**
 * Library Screen
 * Displays all tracks in the library with sorting and filtering options
 */

import React, { useCallback, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '@/constants/theme';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { TrackItem } from '@/components/TrackItem';
import { formatTrackCount, formatLongDuration } from '@/utils/formatters';
import type { Track } from '@/types/audio';

// =============================================================================
// Types
// =============================================================================

type SortOption = 'title' | 'artist' | 'album' | 'recent';

// =============================================================================
// Component
// =============================================================================

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, isScanning, isLoaded, error, scanLibrary } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const [sortBy, setSortBy] = useState<SortOption>('title');

  /**
   * Sort tracks based on selected option
   */
  const sortedTracks = useMemo(() => {
    const sorted = [...tracks];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      case 'album':
        return sorted.sort((a, b) => a.album.localeCompare(b.album));
      case 'recent':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      default:
        return sorted;
    }
  }, [tracks, sortBy]);

  /**
   * Calculate total duration of all tracks
   */
  const totalDuration = useMemo(() => {
    return tracks.reduce((sum, track) => sum + track.duration, 0);
  }, [tracks]);

  /**
   * Handle track press - play track with full library as queue
   */
  const handleTrackPress = useCallback((track: Track) => {
    controls.playTrack(track, sortedTracks);
  }, [controls, sortedTracks]);

  /**
   * Play all tracks (shuffle)
   */
  const handlePlayAllShuffle = useCallback(() => {
    if (sortedTracks.length > 0) {
      controls.playTrack(sortedTracks[0], sortedTracks);
      controls.toggleShuffle();
    }
  }, [controls, sortedTracks]);

  /**
   * Render track item
   */
  const renderTrackItem = useCallback(({ item, index }: { item: Track; index: number }) => (
    <TrackItem
      track={item}
      index={index}
      showIndex={true}
      isPlaying={state.isPlaying && state.currentTrack?.id === item.id}
      isCurrent={state.currentTrack?.id === item.id}
      onPress={handleTrackPress}
    />
  ), [state.currentTrack, state.isPlaying, handleTrackPress]);

  /**
   * Get unique key for each track
   */
  const keyExtractor = useCallback((item: Track) => item.id, []);

  /**
   * Render header with stats and controls
   */
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Tu Biblioteca</Text>
      
      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {formatTrackCount(tracks.length)} • {formatLongDuration(totalDuration)}
        </Text>
      </View>

      {/* Sort options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'title' && styles.sortButtonActive]}
          onPress={() => setSortBy('title')}
        >
          <Text style={[styles.sortText, sortBy === 'title' && styles.sortTextActive]}>
            Título
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'artist' && styles.sortButtonActive]}
          onPress={() => setSortBy('artist')}
        >
          <Text style={[styles.sortText, sortBy === 'artist' && styles.sortTextActive]}>
            Artista
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
          onPress={() => setSortBy('recent')}
        >
          <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
            Reciente
          </Text>
        </TouchableOpacity>
      </View>

      {/* Play all button */}
      {tracks.length > 0 && (
        <TouchableOpacity 
          style={styles.playAllButton}
          onPress={handlePlayAllShuffle}
        >
          <Ionicons name="shuffle" size={20} color={Colors.background} />
          <Text style={styles.playAllText}>Reproducir aleatorio</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (isScanning) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyText}>Cargando biblioteca...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="musical-notes" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Sin canciones</Text>
        <Text style={styles.emptyText}>
          Añade música a tu dispositivo y vuelve a escanear
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.background]}
        style={styles.gradient}
      />
      
      {/* Track list */}
      <FlatList
        data={sortedTracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          sortedTracks.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isScanning}
            onRefresh={scanLibrary}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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
    height: 300,
  },
  
  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  stats: {
    marginBottom: Spacing.base,
  },
  statsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Sort options
  sortContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  sortButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundHighlight,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary,
  },
  sortText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  sortTextActive: {
    color: Colors.background,
  },
  
  // Play all button
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  playAllText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.background,
    marginLeft: Spacing.sm,
  },
  
  // List
  listContent: {
    paddingBottom: Layout.screenPaddingBottom,
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
    marginTop: 100,
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
