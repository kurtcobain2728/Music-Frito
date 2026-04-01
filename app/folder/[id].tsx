import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Layout, BorderRadius, Shadows } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlaybackMetadata, usePlaybackControls } from '@/contexts/PlayerContext';
import { TrackItem } from '@/components/TrackItem';
import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { formatTrackCount, formatLongDuration } from '@/utils/formatters';
import type { Track } from '@/types/audio';

export default function FolderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { getTracksForFolder } = useAudioLibrary();
  const { currentTrack, isPlaying } = usePlaybackMetadata();
  const controls = usePlaybackControls();
  const { theme } = useTheme();
  const c = theme.colors;

  const folderTracks = useMemo(() => {
    if (!id) return [];
    return getTracksForFolder(id);
  }, [id, getTracksForFolder]);

  const totalDuration = useMemo(() => {
    return folderTracks.reduce((sum, track) => sum + track.duration, 0);
  }, [folderTracks]);

  const folderArtwork = useMemo(() => {
    return folderTracks.find(t => t.artwork)?.artwork;
  }, [folderTracks]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleTrackPress = useCallback(
    (track: Track) => {
      controls.playTrack(track, folderTracks);
    },
    [controls, folderTracks],
  );

  const handlePlayAll = useCallback(() => {
    if (folderTracks.length > 0) {
      controls.playTrack(folderTracks[0], folderTracks);
    }
  }, [controls, folderTracks]);

  const handleShuffle = useCallback(() => {
    if (folderTracks.length > 0) {
      controls.playTrack(folderTracks[0], folderTracks);
      controls.toggleShuffle();
    }
  }, [controls, folderTracks]);

  const renderTrackItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <TrackItem
        track={item}
        index={index}
        showIndex={true}
        isPlaying={isPlaying && currentTrack?.id === item.id}
        isCurrent={currentTrack?.id === item.id}
        onPress={handleTrackPress}
      />
    ),
    [currentTrack, isPlaying, handleTrackPress],
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.artworkContainer, { ...Shadows.xl }]}>
        {folderArtwork ? (
          <Image source={{ uri: folderArtwork }} style={styles.artwork} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.artworkPlaceholder}>
            <Ionicons name="folder-open" size={80} color={c.textMuted} />
          </LinearGradient>
        )}
      </View>

      <Text style={[styles.folderName, { color: c.textPrimary }]}>{name || 'Carpeta'}</Text>
      <Text style={[styles.folderStats, { color: c.textSecondary }]}>
        {formatTrackCount(folderTracks.length)} • {formatLongDuration(totalDuration)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.shuffleButton, { backgroundColor: c.backgroundHighlight }]}
          onPress={handleShuffle}
        >
          <Ionicons name="shuffle" size={24} color={c.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: c.primary, ...Shadows.lg }]}
          onPress={handlePlayAll}
        >
          <Ionicons name="play" size={28} color={c.background} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient} />

        <TouchableOpacity style={[styles.backButton, { top: insets.top + Spacing.sm }]} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={c.textPrimary} />
        </TouchableOpacity>

        <FlatList
          data={folderTracks}
          renderItem={renderTrackItem}
          keyExtractor={keyExtractor}
          getItemLayout={(_: any, index: number) => ({
            length: Layout.trackItemHeight,
            offset: Layout.trackItemHeight * index,
            index,
          })}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: Layout.screenPaddingBottom + 20 }]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={15}
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
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
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  artworkContainer: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
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
  folderName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  folderStats: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shuffleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: Layout.screenPaddingBottom,
  },
});
