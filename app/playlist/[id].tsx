import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { TrackItem } from '@/components/TrackItem';
import { BorderRadius, Layout, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import type { Track } from '@/types/audio';
import { formatLongDuration, formatTrackCount } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlaylistDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { state, controls } = usePlayer();
  const { getPlaylist, removeFromPlaylist, deletePlaylist } = useFavorites();
  const { theme } = useTheme();
  const c = theme.colors;

  const playlist = useMemo(() => {
    if (!id) return null;
    return getPlaylist(id);
  }, [id, getPlaylist]);

  const playlistTracks = playlist?.tracks || [];

  const totalDuration = useMemo(() => {
    return playlistTracks.reduce((sum, track) => sum + track.duration, 0);
  }, [playlistTracks]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleTrackPress = useCallback((track: Track) => {
    controls.playTrack(track, playlistTracks);
  }, [controls, playlistTracks]);

  const handlePlayAll = useCallback(() => {
    if (playlistTracks.length > 0) {
      controls.playTrack(playlistTracks[0], playlistTracks);
    }
  }, [controls, playlistTracks]);

  const handleShuffle = useCallback(() => {
    if (playlistTracks.length > 0) {
      controls.playTrack(playlistTracks[0], playlistTracks);
      controls.toggleShuffle();
    }
  }, [controls, playlistTracks]);

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

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.artworkContainer, { ...Shadows.xl }]}>
        {playlist?.artwork ? (
          <Image 
            source={{ uri: playlist.artwork }} 
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[c.primary + '60', c.primary + '30']}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name="musical-notes" size={60} color={c.primary} />
          </LinearGradient>
        )}
      </View>

      <Text style={[styles.playlistName, { color: c.textPrimary }]}>{name || 'Lista'}</Text>
      <Text style={[styles.playlistStats, { color: c.textSecondary }]}>
        {formatTrackCount(playlistTracks.length)} • {formatLongDuration(totalDuration)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: c.backgroundHighlight }]}
          onPress={handleDeletePlaylist}
        >
          <Ionicons name="trash-outline" size={22} color={c.error} />
        </TouchableOpacity>

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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color={c.textMuted} />
      <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Lista vacía</Text>
      <Text style={[styles.emptyText, { color: c.textSecondary }]}>
        Agrega canciones desde el reproductor
      </Text>
    </View>
  );

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <LinearGradient
          colors={[c.primary + '40', c.background]}
          style={styles.gradient}
        />

        <TouchableOpacity 
          style={[styles.backButton, { top: insets.top + Spacing.sm }]}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={28} color={c.textPrimary} />
        </TouchableOpacity>
        
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
    width: 180,
    height: 180,
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
  playlistName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  playlistStats: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
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
    flexGrow: 1,
  },
  listContentEmpty: {
    flex: 1,
  },
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
});
