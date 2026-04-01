/**
 * useAudioLibrary Hook
 * Scans device for audio files using expo-media-library
 * Caches library data to AsyncStorage for fast startup
 * Groups tracks by folders and extracts metadata
 * Optimized for performance with incremental updates
 */

import type { AudioFormat, Folder, Track } from '@/types/audio';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// Constants
// =============================================================================

/**
 * Cache keys for AsyncStorage
 */
const CACHE_KEYS = {
  TRACKS: '@frito_music/library_tracks',
  FOLDERS: '@frito_music/library_folders',
  LAST_SCAN: '@frito_music/last_scan_at',
};

/**
 * Supported audio file extensions - expanded list to catch all audio files
 * Includes all common audio formats used on Android devices
 */
const SUPPORTED_EXTENSIONS = [
  // Common formats
  'mp3',
  'flac',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'wma',
  // Additional formats
  'opus',
  'webm',
  'oga',
  'mka',
  'mid',
  'midi',
  'aiff',
  'aif',
  'ape',
  'wv',      // WavPack
  'mpc',     // Musepack
  'ac3',
  'dts',
  'mp2',
  'mp1',
  '3gp',
  '3gpp',
  'amr',
  'awb',
  'caf',     // Core Audio Format
  'au',      // Sun/Unix audio
  'snd',
  'ra',      // RealAudio
  'rm',
  'spx',     // Speex
  'tta',     // TTA
  'voc',
  'gsm',
  'dff',     // DSD
  'dsf',     // DSD
];

/**
 * Page size for fetching assets
 */
const PAGE_SIZE = 1000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts the file extension from a filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Determines the audio format from file extension
 */
function getAudioFormat(extension: string): AudioFormat {
  const formatMap: Record<string, AudioFormat> = {
    mp3: 'mp3',
    flac: 'flac',
    wav: 'wav',
    aac: 'aac',
    m4a: 'm4a',
    ogg: 'ogg',
    wma: 'wma',
  };
  return formatMap[extension] || 'unknown';
}

/**
 * Extracts folder path from full file URI
 */
function extractFolderPath(uri: string): string {
  const parts = uri.split('/');
  parts.pop();
  return parts.join('/');
}

/**
 * Extracts folder name from path
 */
function extractFolderName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Unknown Folder';
}

/**
 * Cleans up title by removing extension and underscores
 */
function cleanTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[_-]/g, ' ');
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generates album art URI from Android MediaStore
 * Uses the media ID to construct the album art content URI
 */
function getAlbumArtworkUri(asset: MediaLibrary.Asset): string | undefined {
  // Extract numeric ID from asset ID for album art lookup
  // Asset IDs in expo-media-library are typically in format like "123" or contain numbers
  const assetId = asset.id;
  
  if (assetId) {
    // Try to extract numeric ID
    const numericId = assetId.match(/\d+/)?.[0];
    if (numericId) {
      // Use Android's MediaStore album art content provider
      // This URI format works for embedded album art in audio files
      return `content://media/external/audio/media/${numericId}/albumart`;
    }
  }
  
  return undefined;
}

/**
 * Converts MediaLibrary asset to Track
 */
function assetToTrack(asset: MediaLibrary.Asset): Track {
  const extension = getFileExtension(asset.filename);
  const folderPath = extractFolderPath(asset.uri);
  const artworkUri = getAlbumArtworkUri(asset);
  
  return {
    id: asset.id,
    uri: asset.uri,
    title: cleanTitle(asset.filename),
    artist: 'Unknown Artist',
    album: extractFolderName(folderPath),
    duration: (asset.duration || 0) * 1000,
    artwork: artworkUri,
    folderPath,
    filename: asset.filename,
    format: getAudioFormat(extension),
    fileSize: 0,
    createdAt: asset.creationTime,
  };
}

/**
 * Groups tracks by folder and creates Folder objects
 */
function groupTracksByFolder(tracks: Track[]): Folder[] {
  const folderMap = new Map<string, Track[]>();
  
  tracks.forEach(track => {
    const existing = folderMap.get(track.folderPath) || [];
    existing.push(track);
    folderMap.set(track.folderPath, existing);
  });
  
  const folders: Folder[] = [];
  folderMap.forEach((folderTracks, path) => {
    const sortedTracks = folderTracks.sort((a, b) => 
      a.title.localeCompare(b.title)
    );
    
    folders.push({
      id: path,
      name: extractFolderName(path),
      path,
      trackCount: sortedTracks.length,
      previewTracks: sortedTracks.slice(0, 4),
      artwork: sortedTracks[0]?.artwork,
    });
  });
  
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

// =============================================================================
// Cache Functions
// =============================================================================

/**
 * Save library data to cache
 */
async function saveToCache(tracks: Track[], folders: Folder[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEYS.TRACKS, JSON.stringify(tracks)],
      [CACHE_KEYS.FOLDERS, JSON.stringify(folders)],
      [CACHE_KEYS.LAST_SCAN, Date.now().toString()],
    ]);
    logger.log(`Cached ${tracks.length} tracks and ${folders.length} folders`);
  } catch (error) {
    logger.error('Error saving library to cache:', error);
  }
}

/**
 * Load library data from cache
 */
async function loadFromCache(): Promise<{
  tracks: Track[];
  folders: Folder[];
  lastScanAt: number | null;
} | null> {
  try {
    const results = await AsyncStorage.multiGet([
      CACHE_KEYS.TRACKS,
      CACHE_KEYS.FOLDERS,
      CACHE_KEYS.LAST_SCAN,
    ]);
    
    const tracksJson = results[0][1];
    const foldersJson = results[1][1];
    const lastScanStr = results[2][1];
    
    if (tracksJson && foldersJson) {
      try {
        const tracks = JSON.parse(tracksJson);
        const folders = JSON.parse(foldersJson);
        if (!Array.isArray(tracks) || !Array.isArray(folders)) return null;
        return {
          tracks,
          folders,
          lastScanAt: lastScanStr ? parseInt(lastScanStr, 10) : null,
        };
      } catch {
        return null;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error loading library from cache:', error);
    return null;
  }
}

// =============================================================================
// Hook
// =============================================================================

interface UseAudioLibraryResult {
  tracks: Track[];
  folders: Folder[];
  isScanning: boolean;
  isLoaded: boolean;
  lastScanAt: number | null;
  error: string | null;
  /** Request permission and scan library */
  scanLibrary: () => Promise<void>;
  /** Get tracks for a specific folder */
  getTracksForFolder: (folderId: string) => Track[];
  /** Search tracks by query */
  searchTracks: (query: string) => Track[];
}

export function useAudioLibrary(): UseAudioLibraryResult {
  // State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we've tried loading cache
  const hasLoadedCache = useRef(false);

  const scanLibrary = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Request permission with granular audio access
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
      
      if (status !== 'granted') {
        setError('Permiso denegado. Ve a Ajustes > Apps > Frito Music y activa permisos de almacenamiento.');
        setIsScanning(false);
        setIsLoaded(true);
        return;
      }
      
      // Fetch all audio assets with pagination
      const allTracks: Track[] = [];
      let hasMore = true;
      let endCursor: string | undefined;
      
      while (hasMore) {
        const result = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: PAGE_SIZE,
          after: endCursor,
          sortBy: [MediaLibrary.SortBy.default],
        });
        
        // Filter by supported extensions and convert to tracks
        const pageTracks = result.assets
          .filter(asset => {
            const ext = getFileExtension(asset.filename);
            return SUPPORTED_EXTENSIONS.includes(ext);
          })
          .map(assetToTrack);
        
        allTracks.push(...pageTracks);
        hasMore = result.hasNextPage;
        endCursor = result.endCursor;
      }
      
      // Group tracks by folder
      const groupedFolders = groupTracksByFolder(allTracks);
      
      // Update state
      setTracks(allTracks);
      setFolders(groupedFolders);
      setLastScanAt(Date.now());
      setIsLoaded(true);
      
      // Save to cache for next app launch
      await saveToCache(allTracks, groupedFolders);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errorMessage.includes('AUDIO permission') || errorMessage.includes('AndroidManifest')) {
        setError('Para usar esta app necesitas un Development Build. Expo Go no soporta acceso a archivos de audio. Ejecuta: npx expo run:android');
      } else {
        setError(errorMessage);
      }
      
      logger.error('Error scanning audio library:', err);
      setIsLoaded(true);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedCache.current) return;
    hasLoadedCache.current = true;
    
    const loadCache = async () => {
      const cached = await loadFromCache();
      
      if (cached && cached.tracks.length > 0) {
        setTracks(cached.tracks);
        setFolders(cached.folders);
        setLastScanAt(cached.lastScanAt);
        setIsLoaded(true);
        logger.log(`Loaded ${cached.tracks.length} tracks from cache`);
      } else {
        scanLibrary();
      }
    };
    
    loadCache();
  }, [scanLibrary]);

  const getTracksForFolder = useCallback((folderId: string): Track[] => {
    return tracks
      .filter(track => track.folderPath === folderId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tracks]);

  /**
   * Search tracks by query
   */
  const searchTracks = useCallback((query: string): Track[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(lowerQuery) ||
      track.artist.toLowerCase().includes(lowerQuery) ||
      track.album.toLowerCase().includes(lowerQuery) ||
      track.filename.toLowerCase().includes(lowerQuery)
    );
  }, [tracks]);

  return {
    tracks,
    folders,
    isScanning,
    isLoaded,
    lastScanAt,
    error,
    scanLibrary,
    getTracksForFolder,
    searchTracks,
  };
}

export default useAudioLibrary;
