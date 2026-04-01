import type { AudioFormat, Folder, Track } from '@/types/audio';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

const CACHE_KEYS = {
  TRACKS: '@frito_music/library_tracks',
  FOLDERS: '@frito_music/library_folders',
  LAST_SCAN: '@frito_music/last_scan_at',
};

const SUPPORTED_EXTENSIONS = new Set([
  'mp3',
  'flac',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'wma',
  'opus',
  'webm',
  'oga',
  'mka',
  'mid',
  'midi',
  'aiff',
  'aif',
  'ape',
  'wv',
  'mpc',
  'ac3',
  'dts',
  'mp2',
  'mp1',
  '3gp',
  '3gpp',
  'amr',
  'awb',
  'caf',
  'au',
  'snd',
  'ra',
  'rm',
  'spx',
  'tta',
  'voc',
  'gsm',
  'dff',
  'dsf',
]);

const PAGE_SIZE = 500;

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

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

function extractFolderPath(uri: string): string {
  const lastSlash = uri.lastIndexOf('/');
  return lastSlash > 0 ? uri.substring(0, lastSlash) : uri;
}

function extractFolderName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? path.substring(lastSlash + 1) || 'Unknown Folder' : 'Unknown Folder';
}

function cleanTitle(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const withoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const cleaned = withoutExt.replace(/[_-]/g, ' ');
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getAlbumArtworkUri(asset: MediaLibrary.Asset): string | undefined {
  const assetId = asset.id;
  if (assetId) {
    const numericId = assetId.match(/\d+/)?.[0];
    if (numericId) {
      return `content://media/external/audio/media/${numericId}/albumart`;
    }
  }
  return undefined;
}

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

function groupTracksByFolder(tracks: Track[]): Folder[] {
  const folderMap = new Map<string, Track[]>();

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    let arr = folderMap.get(track.folderPath);
    if (!arr) {
      arr = [];
      folderMap.set(track.folderPath, arr);
    }
    arr.push(track);
  }

  const folders: Folder[] = [];
  folderMap.forEach((folderTracks, path) => {
    folderTracks.sort((a, b) => a.title.localeCompare(b.title));
    folders.push({
      id: path,
      name: extractFolderName(path),
      path,
      trackCount: folderTracks.length,
      previewTracks: folderTracks.slice(0, 4),
      artwork: folderTracks[0]?.artwork,
    });
  });

  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function saveToCache(tracks: Track[], folders: Folder[]): Promise<void> {
  try {
    const tracksJson = JSON.stringify(tracks);
    const foldersJson = JSON.stringify(folders);
    await AsyncStorage.multiSet([
      [CACHE_KEYS.TRACKS, tracksJson],
      [CACHE_KEYS.FOLDERS, foldersJson],
      [CACHE_KEYS.LAST_SCAN, Date.now().toString()],
    ]);
    logger.log(`Cached ${tracks.length} tracks and ${folders.length} folders`);
  } catch (error) {
    logger.error('Error saving library to cache:', error);
  }
}

async function loadFromCache(): Promise<{
  tracks: Track[];
  folders: Folder[];
  lastScanAt: number | null;
} | null> {
  try {
    const results = await AsyncStorage.multiGet([CACHE_KEYS.TRACKS, CACHE_KEYS.FOLDERS, CACHE_KEYS.LAST_SCAN]);

    const tracksJson = results[0][1];
    const foldersJson = results[1][1];
    const lastScanStr = results[2][1];

    if (tracksJson && foldersJson) {
      try {
        await yieldToUI();
        const tracks = JSON.parse(tracksJson);
        await yieldToUI();
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

interface UseAudioLibraryResult {
  tracks: Track[];
  folders: Folder[];
  isScanning: boolean;
  isLoaded: boolean;
  lastScanAt: number | null;
  error: string | null;
  scanLibrary: () => Promise<void>;
  getTracksForFolder: (folderId: string) => Track[];
  searchTracks: (query: string) => Track[];
}

export function useAudioLibrary(): UseAudioLibraryResult {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedCache = useRef(false);
  const scanCancelledRef = useRef(false);

  const scanLibrary = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      scanCancelledRef.current = false;

      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);

      if (status !== 'granted') {
        setError('Permiso denegado. Ve a Ajustes > Apps > Frito Music y activa permisos de almacenamiento.');
        setIsScanning(false);
        setIsLoaded(true);
        return;
      }

      const allTracks: Track[] = [];
      let hasMore = true;
      let endCursor: string | undefined;

      while (hasMore) {
        if (scanCancelledRef.current) return;

        const result = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: PAGE_SIZE,
          after: endCursor,
          sortBy: [MediaLibrary.SortBy.default],
        });

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          const ext = getFileExtension(asset.filename);
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            allTracks.push(assetToTrack(asset));
          }
        }

        hasMore = result.hasNextPage;
        endCursor = result.endCursor;

        await yieldToUI();
      }

      if (scanCancelledRef.current) return;

      await yieldToUI();
      const groupedFolders = groupTracksByFolder(allTracks);

      setTracks(allTracks);
      setFolders(groupedFolders);
      setLastScanAt(Date.now());
      setIsLoaded(true);

      InteractionManager.runAfterInteractions(() => {
        saveToCache(allTracks, groupedFolders);
      });
    } catch (err) {
      if (scanCancelledRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

      if (errorMessage.includes('AUDIO permission') || errorMessage.includes('AndroidManifest')) {
        setError(
          'Para usar esta app necesitas un Development Build. Expo Go no soporta acceso a archivos de audio. Ejecuta: npx expo run:android',
        );
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
        InteractionManager.runAfterInteractions(() => {
          scanLibrary();
        });
      }
    };

    loadCache();

    return () => {
      scanCancelledRef.current = true;
    };
  }, [scanLibrary]);

  const getTracksForFolder = useCallback(
    (folderId: string): Track[] => {
      return tracks.filter(track => track.folderPath === folderId).sort((a, b) => a.title.localeCompare(b.title));
    },
    [tracks],
  );

  const searchTracks = useCallback(
    (query: string): Track[] => {
      if (!query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      return tracks.filter(
        track =>
          track.title.toLowerCase().includes(lowerQuery) ||
          track.artist.toLowerCase().includes(lowerQuery) ||
          track.album.toLowerCase().includes(lowerQuery) ||
          track.filename.toLowerCase().includes(lowerQuery),
      );
    },
    [tracks],
  );

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
