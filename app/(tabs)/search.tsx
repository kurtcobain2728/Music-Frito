/**
 * Search Screen
 * Search for tracks, artists, and albums
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  FlatList, 
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius } from '@/constants/theme';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { TrackItem } from '@/components/TrackItem';
import type { Track } from '@/types/audio';

// =============================================================================
// Component
// =============================================================================

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, searchTracks } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const [query, setQuery] = useState('');

  /**
   * Get search results
   */
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchTracks(query);
  }, [query, searchTracks]);

  /**
   * Get recent/suggested tracks (random selection)
   */
  const suggestedTracks = useMemo(() => {
    if (tracks.length === 0) return [];
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [tracks]);

  /**
   * Handle track press
   */
  const handleTrackPress = useCallback((track: Track) => {
    const playQueue = query.trim() ? searchResults : suggestedTracks;
    controls.playTrack(track, playQueue);
    Keyboard.dismiss();
  }, [controls, searchResults, suggestedTracks, query]);

  /**
   * Clear search
   */
  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  /**
   * Render track item
   */
  const renderTrackItem = useCallback(({ item }: { item: Track }) => (
    <TrackItem
      track={item}
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
   * Display data - search results or suggestions
   */
  const displayData = query.trim() ? searchResults : suggestedTracks;
  const showingResults = query.trim() && searchResults.length > 0;
  const showingNoResults = query.trim() && searchResults.length === 0;
  const showingSuggestions = !query.trim() && suggestedTracks.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Canciones, artistas o álbumes"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Section Header */}
      {(showingResults || showingSuggestions) && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showingResults 
              ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`
              : 'Sugerencias para ti'}
          </Text>
        </View>
      )}

      {/* No Results Message */}
      {showingNoResults && (
        <View style={styles.noResults}>
          <Ionicons name="search" size={48} color={Colors.textMuted} />
          <Text style={styles.noResultsTitle}>Sin resultados</Text>
          <Text style={styles.noResultsText}>
            No encontramos nada para "{query}"
          </Text>
        </View>
      )}

      {/* Empty State */}
      {tracks.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Sin música</Text>
          <Text style={styles.emptyText}>
            Añade música a tu dispositivo para buscar
          </Text>
        </View>
      )}

      {/* Track List */}
      <FlatList
        data={displayData}
        renderItem={renderTrackItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
    marginBottom: Spacing.base,
  },
  
  // Search input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundHighlight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  
  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  
  // No results
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noResultsTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  noResultsText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
  
  // List
  listContent: {
    paddingBottom: Layout.screenPaddingBottom,
  },
});
