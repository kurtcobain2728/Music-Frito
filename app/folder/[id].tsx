/**
 * Folder Detail Screen
 * Shows all tracks in a specific folder
 */

import React, { useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius, Shadows } from '@/constants/theme';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { TrackItem } from '@/components/TrackItem';
import { formatTrackCount, formatLongDuration } from '@/utils/formatters';
import type { Track } from '@/types/audio';

// =============================================================================
// Component
// =============================================================================

export default function FolderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { getTracksForFolder } = useAudioLibrary();
  const { state, controls } = usePlayer();

  /**
   * Get tracks for this folder
   */
  const folderTracks = useMemo(() => {
    if (!id) return [];
    return getTracksForFolder(id);
  }, [id, getTracksForFolder]);

  /**
   * Calculate total duration
   */
  const totalDuration = useMemo(() => {
    return folderTracks.reduce((sum, track) => sum + track.duration, 0);
  }, [folderTracks]);

  /**
   * Get folder artwork (first track with artwork)
   */
  const folderArtwork = useMemo(() => {
    return folderTracks.find(t => t.artwork)?.artwork;
  }, [folderTracks]);

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
    controls.playTrack(track, folderTracks);
  }, [controls, folderTracks]);

  /**
   * Play all tracks
   */
  const handlePlayAll = useCallback(() => {
    if (folderTracks.length > 0) {
      controls.playTrack(folderTracks[0], folderTracks);
    }
  }, [controls, folderTracks]);

  /**
   * Shuffle all tracks
   */
  const handleShuffle = useCallback(() => {
    if (folderTracks.length > 0) {
      controls.playTrack(folderTracks[0], folderTracks);
      controls.toggleShuffle();
    }
  }, [controls, folderTracks]);

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
   * Render header with folder info and controls
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Folder artwork */}
      <View style={styles.artworkContainer}>
        {folderArtwork ? (
          <Image 
            source={{ uri: folderArtwork }} 
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.backgroundHighlight, Colors.background]}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name="folder-open" size={80} color={Colors.textMuted} />
          </LinearGradient>
        )}
      </View>

      {/* Folder info */}
      <Text style={styles.folderName}>{name || 'Carpeta'}</Text>
      <Text style={styles.folderStats}>
        {formatTrackCount(folderTracks.length)} • {formatLongDuration(totalDuration)}
      </Text>

      {/* Action buttons */}
      <View style={styles.actions}>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.background]}
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
        data={folderTracks}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
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
    width: 200,
    height: 200,
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
  folderName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  folderStats: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
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
    ...Shadows.lg,
  },
  
  // List
  listContent: {
    paddingBottom: Layout.screenPaddingBottom,
  },
});
