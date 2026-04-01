import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { TrackItem } from '@/components/TrackItem';
import { BorderRadius, Layout, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import type { Track } from '@/types/audio';
import { formatLongDuration, formatTrackCount } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SortOption = 'title' | 'artist' | 'album' | 'recent';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, isScanning, scanLibrary } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const flatListRef = useRef<FlatList>(null);

  const sortedTracks = useMemo(() => {
    const sorted = [...tracks];
    switch (sortBy) {
      case 'title': return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist': return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      case 'album': return sorted.sort((a, b) => a.album.localeCompare(b.album));
      case 'recent': return sorted.sort((a, b) => b.createdAt - a.createdAt);
      default: return sorted;
    }
  }, [tracks, sortBy]);

  const totalDuration = useMemo(() => tracks.reduce((s, t) => s + t.duration, 0), [tracks]);

  const handleTrackPress = useCallback((track: Track) => { controls.playTrack(track, sortedTracks); }, [controls, sortedTracks]);
  const handlePlayAllShuffle = useCallback(() => {
    if (sortedTracks.length > 0) { controls.playTrack(sortedTracks[0], sortedTracks); controls.toggleShuffle(); }
  }, [controls, sortedTracks]);
  const handlePlayAll = useCallback(() => { if (sortedTracks.length > 0) controls.playTrack(sortedTracks[0], sortedTracks); }, [controls, sortedTracks]);

  const renderTrackItem = useCallback(({ item, index }: { item: Track; index: number }) => (
    <TrackItem track={item} index={index} showHeart={true} isPlaying={state.isPlaying && state.currentTrack?.id === item.id} isCurrent={state.currentTrack?.id === item.id} onPress={handleTrackPress} />
  ), [state.currentTrack, state.isPlaying, handleTrackPress]);

  const keyExtractor = useCallback((item: Track) => item.id, []);
  const getItemLayout = useCallback((_: any, index: number) => ({ length: Layout.trackItemHeight, offset: Layout.trackItemHeight * index, index }), []);

  useEffect(() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }, [sortBy]);

  const sortOpts: { key: SortOption; label: string }[] = [
    { key: 'title', label: 'Título' }, { key: 'artist', label: 'Artista' }, { key: 'album', label: 'Álbum' }, { key: 'recent', label: 'Reciente' },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Tu Biblioteca</Text>
      </View>
      <Text style={[styles.stats, { color: c.textSecondary }]}>
        {`${formatTrackCount(tracks.length)} • ${formatLongDuration(totalDuration)}`}
      </Text>
      <View style={styles.sortContainer}>
        {sortOpts.map(({ key, label }) => (
          <TouchableOpacity key={key} style={[styles.sortButton, { backgroundColor: sortBy === key ? c.primary : c.backgroundHighlight }]} onPress={() => setSortBy(key)}>
            <Text style={[styles.sortText, { color: sortBy === key ? '#000' : c.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {sortedTracks.length > 0 && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.shuffleButton, { backgroundColor: c.backgroundHighlight }]} onPress={handlePlayAllShuffle}>
            <Ionicons name="shuffle" size={20} color={c.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playAllButton, { backgroundColor: c.primary }]} onPress={handlePlayAll}>
            <Ionicons name="play" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient} />
        <FlatList
          ref={flatListRef}
          data={sortedTracks}
          renderItem={renderTrackItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            isScanning ? <View style={styles.emptyState}><ActivityIndicator size="large" color={c.primary} /><Text style={[styles.emptyText, { color: c.textSecondary }]}>Cargando...</Text></View>
            : <View style={styles.emptyState}><Ionicons name="musical-notes" size={64} color={c.textMuted} /><Text style={[styles.emptyText, { color: c.textSecondary }]}>Sin canciones</Text></View>
          }
          contentContainerStyle={[styles.listContent, sortedTracks.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={15}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
          refreshControl={<RefreshControl refreshing={isScanning} onRefresh={scanLibrary} tintColor={c.primary} colors={[c.primary]} />}
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  title: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold },
  stats: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.base },
  sortContainer: { flexDirection: 'row', marginBottom: Spacing.base, flexWrap: 'wrap', gap: Spacing.xs },
  sortButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  sortText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  actionButtons: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  shuffleButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  playAllButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingLeft: 3, ...Shadows.md },
  listContent: { paddingBottom: Layout.screenPaddingBottom },
  listContentEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, marginTop: 100 },
  emptyText: { fontSize: Typography.fontSize.base, textAlign: 'center', marginTop: Spacing.lg },
});
