/**
 * Playlist Detail Screen
 * Shows tracks in a specific playlist
 */

import React, { useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius, Shadows } from '@/constants/theme';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { TrackItem } from '@/components/TrackItem';
import { formatTrackCount, formatLongDuration } from '@/utils/formatters';
import type { Track } from '@/types/audio';

// =============================================================================
// Component
// =============================================================================

export default function PlaylistDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { state, controls } = usePlayer();
  const { getPlaylist, removeFromPlaylist, deletePlaylist } = useFavorites();

  /**
   * Get playlist data
   */
  const playlist = useMemo(() => {
    if (!id) return null;
    return getPlaylist(id);
  }, [id, getPlaylist]);

  const playlistTracks = playlist?.tracks || [];

  /**
   * Calculate total duration
   */
  const totalDuration = useMemo(() => {
    return playlistTracks.reduce((sum, track) => sum + track.duration, 0);
  }, [playlistTracks]);

  /**
   * Navigate back
   */
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Handle track press
   */
  const handleTrackPress = useCallback((track: Track) => {
    controls.playTrack(track, playlistTracks);
  }, [controls, playlistTracks]);

  /**
   * Play all tracks
   */
  const handlePlayAll = useCallback(() => {
    if (playlistTracks.length > 0) {
      controls.playTrack(playlistTracks[0], playlistTracks);
    }
  }, [controls, playlistTracks]);

  /**
   * Shuffle all tracks
   */
  const handleShuffle = useCallback(() => {
    if (playlistTracks.length > 0) {
      controls.playTrack(playlistTracks[0], playlistTracks);
      controls.toggleShuffle();
    }
  }, [controls, playlistTracks]);

  /**
   * Delete playlist
   */
  const handleDeletePlaylist = useCallback(() => {
    Alert.alert(
      'Eliminar lista',
      `¿Estás seguro de eliminar "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deletePlaylist(id);
              router.back();
            }
          }
        },
      ]
    );
  }, [id, name, deletePlaylist]);

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
   * Render header
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Playlist artwork */}
      <View style={styles.artworkContainer}>
        {playlist?.artwork ? (
          <Image 
            source={{ uri: playlist.artwork }} 
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.primary + '60', Colors.primary + '30']}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name="musical-notes" size={60} color={Colors.primary} />
          </LinearGradient>
        )}
      </View>

      {/* Info */}
      <Text style={styles.playlistName}>{name || 'Lista'}</Text>
      <Text style={styles.playlistStats}>
        {formatTrackCount(playlistTracks.length)} • {formatLongDuration(totalDuration)}
      </Text>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Delete button */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeletePlaylist}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
        </TouchableOpacity>

        {/* Shuffle button */}
        <TouchableOpacity 
          style={styles.shuffleButton}
          onPress={handleShuffle}
        >
          <Ionicons name="shuffle" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* Play button */}
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayAll}
        >
          <Ionicons name="play" size={28} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Lista vacía</Text>
      <Text style={styles.emptyText}>
        Agrega canciones desde el reproductor
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.primary + '40', Colors.background]}
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
        data={playlistTracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          playlistTracks.length === 0 && styles.listContentEmpty,
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
    height: 400,
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
  
  // Artwork
  artworkContainer: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
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
  
  // Info
  playlistName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  playlistStats: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
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
    ...Shadows.lg,
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
