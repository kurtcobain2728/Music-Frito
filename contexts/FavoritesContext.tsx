/**
 * FavoritesContext - Global state for favorites and playlists
 * Persists data using AsyncStorage
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  type ReactNode 
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track, Playlist } from '@/types/audio';

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  FAVORITES: '@musicplayer/favorites',
  PLAYLISTS: '@musicplayer/playlists',
} as const;

// =============================================================================
// Context Types
// =============================================================================

interface FavoritesContextValue {
  /** List of favorite track IDs */
  favorites: string[];
  /** List of user playlists */
  playlists: Playlist[];
  /** Loading state */
  isLoading: boolean;
  /** Check if a track is favorited */
  isFavorite: (trackId: string) => boolean;
  /** Toggle favorite status for a track */
  toggleFavorite: (track: Track) => Promise<void>;
  /** Create a new playlist */
  createPlaylist: (name: string, tracks?: Track[]) => Promise<Playlist>;
  /** Add tracks to a playlist */
  addToPlaylist: (playlistId: string, tracks: Track[]) => Promise<void>;
  /** Remove a track from a playlist */
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  /** Delete a playlist */
  deletePlaylist: (playlistId: string) => Promise<void>;
  /** Get a playlist by ID */
  getPlaylist: (playlistId: string) => Playlist | undefined;
}

// =============================================================================
// Context Creation
// =============================================================================

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

// =============================================================================
// Provider Component
// =============================================================================

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // =============================================================================
  // Load Data from Storage
  // =============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load favorites
      const favoritesJson = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (favoritesJson) {
        setFavorites(JSON.parse(favoritesJson));
      }
      
      // Load playlists
      const playlistsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsJson) {
        setPlaylists(JSON.parse(playlistsJson));
      }
    } catch (error) {
      console.error('Error loading favorites/playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // Save Data to Storage
  // =============================================================================

  const saveFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const savePlaylists = async (newPlaylists: Playlist[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  };

  // =============================================================================
  // Favorites Functions
  // =============================================================================

  /**
   * Check if a track is in favorites
   */
  const isFavorite = useCallback((trackId: string): boolean => {
    return favorites.includes(trackId);
  }, [favorites]);

  /**
   * Toggle favorite status for a track
   */
  const toggleFavorite = useCallback(async (track: Track) => {
    const newFavorites = favorites.includes(track.id)
      ? favorites.filter(id => id !== track.id)
      : [...favorites, track.id];
    
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  }, [favorites]);

  // =============================================================================
  // Playlist Functions
  // =============================================================================

  /**
   * Generate unique ID for playlist
   */
  const generateId = (): string => {
    return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Create a new playlist
   */
  const createPlaylist = useCallback(async (name: string, tracks: Track[] = []): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: generateId(),
      name,
      tracks,
      trackCount: tracks.length,
      artwork: tracks[0]?.artwork,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const newPlaylists = [...playlists, newPlaylist];
    setPlaylists(newPlaylists);
    await savePlaylists(newPlaylists);
    
    return newPlaylist;
  }, [playlists]);

  /**
   * Add tracks to an existing playlist
   */
  const addToPlaylist = useCallback(async (playlistId: string, tracks: Track[]) => {
    const newPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        // Filter out duplicates
        const existingIds = new Set(playlist.tracks.map(t => t.id));
        const newTracks = tracks.filter(t => !existingIds.has(t.id));
        const updatedTracks = [...playlist.tracks, ...newTracks];
        
        return {
          ...playlist,
          tracks: updatedTracks,
          trackCount: updatedTracks.length,
          artwork: updatedTracks[0]?.artwork || playlist.artwork,
          updatedAt: Date.now(),
        };
      }
      return playlist;
    });
    
    setPlaylists(newPlaylists);
    await savePlaylists(newPlaylists);
  }, [playlists]);

  /**
   * Remove a track from a playlist
   */
  const removeFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    const newPlaylists = playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const updatedTracks = playlist.tracks.filter(t => t.id !== trackId);
        return {
          ...playlist,
          tracks: updatedTracks,
          trackCount: updatedTracks.length,
          artwork: updatedTracks[0]?.artwork,
          updatedAt: Date.now(),
        };
      }
      return playlist;
    });
    
    setPlaylists(newPlaylists);
    await savePlaylists(newPlaylists);
  }, [playlists]);

  /**
   * Delete a playlist
   */
  const deletePlaylist = useCallback(async (playlistId: string) => {
    const newPlaylists = playlists.filter(p => p.id !== playlistId);
    setPlaylists(newPlaylists);
    await savePlaylists(newPlaylists);
  }, [playlists]);

  /**
   * Get a playlist by ID
   */
  const getPlaylist = useCallback((playlistId: string): Playlist | undefined => {
    return playlists.find(p => p.id === playlistId);
  }, [playlists]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const contextValue: FavoritesContextValue = {
    favorites,
    playlists,
    isLoading,
    isFavorite,
    toggleFavorite,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    getPlaylist,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access favorites and playlists
 */
export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  
  return context;
}

export default FavoritesContext;
