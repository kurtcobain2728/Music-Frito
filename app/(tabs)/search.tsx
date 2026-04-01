import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Layout, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlaybackMetadata, usePlaybackControls } from '@/contexts/PlayerContext';
import { TrackItem } from '@/components/TrackItem';
import type { Track } from '@/types/audio';

function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, searchTracks } = useAudioLibrary();
  const { currentTrack, isPlaying } = usePlaybackMetadata();
  const controls = usePlaybackControls();
  const { theme } = useTheme();
  const c = theme.colors;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const seedRef = useRef(Date.now() % 2147483647);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const searchResults = useMemo(
    () => (debouncedQuery.trim() ? searchTracks(debouncedQuery) : []),
    [debouncedQuery, searchTracks],
  );
  const suggestedTracks = useMemo(() => {
    if (tracks.length === 0) return [];
    return seededShuffle(tracks, seedRef.current).slice(0, 10);
  }, [tracks]);

  const handleTrackPress = useCallback(
    (track: Track) => {
      controls.playTrack(track, debouncedQuery.trim() ? searchResults : suggestedTracks);
      Keyboard.dismiss();
    },
    [controls, searchResults, suggestedTracks, debouncedQuery],
  );

  const displayData = debouncedQuery.trim() ? searchResults : suggestedTracks;
  const showingResults = debouncedQuery.trim() && searchResults.length > 0;
  const showingNoResults = debouncedQuery.trim() && searchResults.length === 0;

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <TrackItem
        track={item}
        isPlaying={isPlaying && currentTrack?.id === item.id}
        isCurrent={currentTrack?.id === item.id}
        onPress={handleTrackPress}
      />
    ),
    [isPlaying, currentTrack?.id, handleTrackPress],
  );

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Buscar</Text>
          <View style={[styles.searchContainer, { backgroundColor: c.backgroundHighlight }]}>
            <Ionicons name="search" size={20} color={c.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              placeholder="Canciones, artistas o álbumes"
              placeholderTextColor={c.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {(showingResults || !debouncedQuery.trim()) && displayData.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
              {showingResults
                ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`
                : 'Sugerencias para ti'}
            </Text>
          </View>
        )}
        {showingNoResults && (
          <View style={styles.noResults}>
            <Ionicons name="search" size={48} color={c.textMuted} />
            <Text style={[styles.noResultsTitle, { color: c.textPrimary }]}>Sin resultados</Text>
            <Text style={[styles.noResultsText, { color: c.textSecondary }]}>No encontramos nada para "{query}"</Text>
          </View>
        )}
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  title: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.base },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: Typography.fontSize.md, marginLeft: Spacing.sm },
  sectionHeader: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  noResults: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  noResultsTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  noResultsText: { fontSize: Typography.fontSize.base, textAlign: 'center' },
  listContent: { paddingBottom: Layout.screenPaddingBottom },
});
