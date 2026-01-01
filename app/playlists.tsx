/**
 * Playlists Screen
 * Shows all user playlists with option to create new ones
 */

import React, { useState, useCallback } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout, BorderRadius, Shadows } from '@/constants/theme';
import { useFavorites } from '@/contexts/FavoritesContext';
import { formatTrackCount } from '@/utils/formatters';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import type { Playlist } from '@/types/audio';

// =============================================================================
// Playlist Card Component
// =============================================================================

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
}

function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
  return (
    <TouchableOpacity 
      style={styles.playlistCard}
      onPress={() => onPress(playlist)}
      activeOpacity={0.7}
    >
      {/* Artwork */}
      <View style={styles.playlistArtwork}>
        {playlist.artwork ? (
          <Image source={{ uri: playlist.artwork }} style={styles.artwork} />
        ) : (
          <LinearGradient
            colors={[Colors.primary + '60', Colors.primary + '30']}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name="musical-notes" size={28} color={Colors.primary} />
          </LinearGradient>
        )}
      </View>
      
      {/* Info */}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.playlistTracks}>{formatTrackCount(playlist.trackCount)}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const { playlists, createPlaylist } = useFavorites();
  const [showCreateModal, setShowCreateModal] = useState(false);

  /**
   * Navigate back
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * Open playlist detail
   */
  const handlePlaylistPress = useCallback((playlist: Playlist) => {
    router.push({
      pathname: '/playlist/[id]' as any,
      params: { id: playlist.id, name: playlist.name }
    });
  }, []);

  /**
   * Create new playlist
   */
  const handleCreatePlaylist = useCallback(async (name: string) => {
    await createPlaylist(name);
    setShowCreateModal(false);
  }, [createPlaylist]);

  /**
   * Render playlist item
   */
  const renderPlaylistItem = useCallback(({ item }: { item: Playlist }) => (
    <PlaylistCard playlist={item} onPress={handlePlaylistPress} />
  ), [handlePlaylistPress]);

  /**
   * Get unique key
   */
  const keyExtractor = useCallback((item: Playlist) => item.id, []);

  /**
   * Render header
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Icon */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.iconContainer}
      >
        <Ionicons name="list" size={48} color="white" />
      </LinearGradient>

      <Text style={styles.title}>Listas de Reproducción</Text>
      <Text style={styles.subtitle}>{playlists.length} lista{playlists.length !== 1 ? 's' : ''}</Text>

      {/* Create button */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={20} color={Colors.background} />
        <Text style={styles.createButtonText}>Crear lista</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Sin listas</Text>
      <Text style={styles.emptyText}>
        Crea tu primera lista de reproducción
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

      {/* Playlist list */}
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          playlists.length === 0 && styles.listContentEmpty,
          { paddingBottom: Layout.screenPaddingBottom + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePlaylist}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  
  // Create button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  createButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.background,
    marginLeft: Spacing.sm,
  },
  
  // Playlist card
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  playlistArtwork: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
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
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  playlistTracks: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
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
