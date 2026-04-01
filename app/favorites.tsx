import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { TrackItem } from '@/components/TrackItem';
import { BorderRadius, Layout, Spacing, Typography } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import type { Track } from '@/types/audio';
import { formatTrackCount } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FavoritesHeaderProps {
  trackCount: number;
  onShuffle: () => void;
  onPlayAll: () => void;
  colors: ThemeColors;
}

const FavoritesHeader = memo(function FavoritesHeader({ trackCount, onShuffle, onPlayAll, colors }: FavoritesHeaderProps) {
  return (
    <View style={styles.header}>
      <LinearGradient colors={['#FF6B6B', '#FF4757']} style={styles.iconContainer}>
        <Ionicons name="heart" size={48} color="white" />
      </LinearGradient>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Favoritos</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{formatTrackCount(trackCount)}</Text>
      {trackCount > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.shuffleButton, { backgroundColor: colors.backgroundHighlight }]} onPress={onShuffle}>
            <Ionicons name="shuffle" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]} onPress={onPlayAll}>
            <Ionicons name="play" size={28} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const FavoritesEmpty = memo(function FavoritesEmpty({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Toca el corazón en cualquier canción para agregarla aquí</Text>
    </View>
  );
});

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { tracks } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const { favorites } = useFavorites();

  const favoriteTracks = useMemo(() => tracks.filter(t => favorites.includes(t.id)), [tracks, favorites]);

  const handleTrackPress = useCallback((track: Track) => { controls.playTrack(track, favoriteTracks); }, [controls, favoriteTracks]);
  const handlePlayAll = useCallback(() => { if (favoriteTracks.length > 0) controls.playTrack(favoriteTracks[0], favoriteTracks); }, [controls, favoriteTracks]);
  const handleShuffle = useCallback(() => { if (favoriteTracks.length > 0) { controls.playTrack(favoriteTracks[0], favoriteTracks); controls.toggleShuffle(); } }, [controls, favoriteTracks]);

  const renderItem = useCallback(({ item }: { item: Track }) => (
    <TrackItem track={item} isPlaying={state.isPlaying && state.currentTrack?.id === item.id} isCurrent={state.currentTrack?.id === item.id} onPress={handleTrackPress} showHeart={true} />
  ), [state.isPlaying, state.currentTrack?.id, handleTrackPress]);

  const header = useMemo(() => (
    <FavoritesHeader trackCount={favoriteTracks.length} onShuffle={handleShuffle} onPlayAll={handlePlayAll} colors={c} />
  ), [favoriteTracks.length, handleShuffle, handlePlayAll, c]);

  const empty = useMemo(() => <FavoritesEmpty colors={c} />, [c]);

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <LinearGradient colors={['#FF6B6B40', c.background]} style={styles.gradient} />
        <TouchableOpacity style={[styles.backButton, { top: insets.top + Spacing.sm }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={c.textPrimary} />
        </TouchableOpacity>
        <FlatList
          data={favoriteTracks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={[styles.listContent, { paddingBottom: Layout.screenPaddingBottom + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  backButton: { position: 'absolute', left: Spacing.base, zIndex: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 22 },
  header: { alignItems: 'center', paddingTop: Spacing['3xl'], paddingBottom: Spacing.xl, paddingHorizontal: Spacing.base },
  iconContainer: { width: 120, height: 120, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center' },
  shuffleButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  listContent: { flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, marginTop: 50 },
  emptyText: { fontSize: Typography.fontSize.base, textAlign: 'center', marginTop: Spacing.lg },
});
