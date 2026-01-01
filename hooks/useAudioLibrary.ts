/**
 * useAudioLibrary Hook
 * Scans device for audio files using expo-media-library
 * Groups tracks by folders and extracts metadata
 */

import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import type { Track, Folder, AudioFormat, LibraryState } from '@/types/audio';

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported audio file extensions
 */
const SUPPORTED_EXTENSIONS = [
  'mp3',
  'flac',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'wma',
];

/**
 * Page size for fetching assets
 */
const PAGE_SIZE = 500;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns Lowercase extension without the dot
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Determines the audio format from file extension
 * @param extension - File extension
 * @returns AudioFormat type
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
 * @param uri - Full file URI
 * @returns Folder path
 */
function extractFolderPath(uri: string): string {
  const parts = uri.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

/**
 * Extracts folder name from path
 * @param path - Full folder path
 * @returns Folder name
 */
function extractFolderName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Unknown Folder';
}

/**
 * Cleans up title by removing extension and underscores
 * @param filename - Original filename
 * @returns Clean title
 */
function cleanTitle(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  // Replace underscores and dashes with spaces
  const cleaned = withoutExt.replace(/[_-]/g, ' ');
  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts MediaLibrary asset to Track
 * @param asset - MediaLibrary asset
 * @returns Track object
 */
function assetToTrack(asset: MediaLibrary.Asset): Track {
  const extension = getFileExtension(asset.filename);
  const folderPath = extractFolderPath(asset.uri);
  
  return {
    id: asset.id,
    uri: asset.uri,
    title: cleanTitle(asset.filename),
    artist: 'Unknown Artist', // MediaLibrary doesn't provide this
    album: extractFolderName(folderPath), // Use folder name as album
    duration: (asset.duration || 0) * 1000, // Convert to ms
    artwork: undefined, // Would need additional library for artwork
    folderPath,
    filename: asset.filename,
    format: getAudioFormat(extension),
    fileSize: asset.width || 0, // MediaLibrary uses width for file size in some cases
    createdAt: asset.creationTime,
  };
}

/**
 * Groups tracks by folder and creates Folder objects
 * @param tracks - Array of tracks
 * @returns Array of folders
 */
function groupTracksByFolder(tracks: Track[]): Folder[] {
  const folderMap = new Map<string, Track[]>();
  
  // Group tracks by folder path
  tracks.forEach(track => {
    const existing = folderMap.get(track.folderPath) || [];
    existing.push(track);
    folderMap.set(track.folderPath, existing);
  });
  
  // Convert to Folder objects
  const folders: Folder[] = [];
  folderMap.forEach((folderTracks, path) => {
    // Sort tracks by title within folder
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
  
  // Sort folders by name
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

// =============================================================================
// Hook
// =============================================================================

interface UseAudioLibraryResult extends LibraryState {
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

  /**
   * Request permission and scan the audio library
   */
  const scanLibrary = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Request permission with granular audio access
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
      
      if (status !== 'granted') {
        setError('Permiso denegado. Ve a Ajustes > Apps > Music Player y activa permisos de almacenamiento.');
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
      
    } catch (err) {
      // Check if error is due to Expo Go limitations
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errorMessage.includes('AUDIO permission') || errorMessage.includes('AndroidManifest')) {
        setError('Para usar esta app necesitas un Development Build. Expo Go no soporta acceso a archivos de audio. Ejecuta: npx expo run:android');
      } else {
        setError(errorMessage);
      }
      
      console.error('Error scanning audio library:', err);
      setIsLoaded(true);
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Get all tracks for a specific folder
   * @param folderId - Folder ID (path)
   * @returns Array of tracks in the folder
   */
  const getTracksForFolder = useCallback((folderId: string): Track[] => {
    return tracks
      .filter(track => track.folderPath === folderId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tracks]);

  /**
   * Search tracks by query (searches title, artist, album)
   * @param query - Search query
   * @returns Array of matching tracks
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

  // Auto-scan on mount
  useEffect(() => {
    if (!isLoaded && !isScanning) {
      scanLibrary();
    }
  }, [isLoaded, isScanning, scanLibrary]);

  return {
    tracks,
    folders,
    playlists: [], // Playlists not implemented yet
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
