/**
 * AddToPlaylistModal Component
 * Modal to add a track to an existing playlist
 */

import React, { memo } from 'react';
import { 
  View, 
  Text, 
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Track, Playlist } from '@/types/audio';

// =============================================================================
// Types
// =============================================================================

interface AddToPlaylistModalProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
}

// =============================================================================
// Playlist Item Component
// =============================================================================

interface PlaylistItemProps {
  playlist: Playlist;
  onPress: () => void;
}

function PlaylistItem({ playlist, onPress }: PlaylistItemProps) {
  return (
    <TouchableOpacity style={styles.playlistItem} onPress={onPress}>
      {/* Artwork */}
      <View style={styles.playlistArtwork}>
        {playlist.artwork ? (
          <Image source={{ uri: playlist.artwork }} style={styles.artwork} />
        ) : (
          <LinearGradient
            colors={[Colors.primary + '60', Colors.primary + '30']}
            style={styles.artworkPlaceholder}
          >
            <Ionicons name="musical-notes" size={20} color={Colors.primary} />
          </LinearGradient>
        )}
      </View>
      
      {/* Info */}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.playlistTracks}>{playlist.trackCount} canciones</Text>
      </View>
      
      <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
    </TouchableOpacity>
  );
}

// =============================================================================
// Component
// =============================================================================

function AddToPlaylistModalComponent({ visible, track, onClose }: AddToPlaylistModalProps) {
  const { playlists, addToPlaylist } = useFavorites();

  const handleAddToPlaylist = async (playlistId: string) => {
    if (track) {
      await addToPlaylist(playlistId, [track]);
      onClose();
    }
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <PlaylistItem 
      playlist={item} 
      onPress={() => handleAddToPlaylist(item.id)} 
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.container}>
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Agregar a lista</Text>
            {track && (
              <Text style={styles.trackName} numberOfLines={1}>{track.title}</Text>
            )}
          </View>

          {/* Playlists */}
          {playlists.length > 0 ? (
            <FlatList
              data={playlists}
              renderItem={renderPlaylist}
              keyExtractor={(item) => item.id}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No tienes listas de reproducción</Text>
              <Text style={styles.emptySubtext}>Crea una desde la sección "Más"</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    backgroundColor: Colors.backgroundElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area
  },
  
  // Handle
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  
  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  trackName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // List
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  
  // Playlist item
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  playlistArtwork: {
    width: 48,
    height: 48,
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
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  playlistTracks: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

// =============================================================================
// Export
// =============================================================================

export const AddToPlaylistModal = memo(AddToPlaylistModalComponent);
export default AddToPlaylistModal;
