import type { AudioFormat, Folder, Track } from '@/types/audio';
import {
  getAllTrackIds,
  getAllTracks,
  getFolders,
  getScanMeta,
  getTrackCount,
  removeTracksByIds,
  replaceAllTracks,
  setScanMeta,
  upsertTracks,
} from '@/db/library';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

const LEGACY_CACHE_KEYS = [
  '@frito_music/library_tracks',
  '@frito_music/library_folders',
  '@frito_music/last_scan_at',
  '@frito_music/library_track_count',
];

const RESCAN_THRESHOLD_MS = 6 * 60 * 60 * 1000;

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

  return {
    id: asset.id,
    uri: asset.uri,
    title: cleanTitle(asset.filename),
    artist: 'Unknown Artist',
    album: extractFolderName(folderPath),
    duration: (asset.duration || 0) * 1000,
    artwork: getAlbumArtworkUri(asset),
    folderPath,
    filename: asset.filename,
    format: getAudioFormat(extension),
    fileSize: 0,
    createdAt: asset.creationTime,
  };
}

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function migrateFromAsyncStorage(): Promise<boolean> {
  try {
    const alreadyMigrated = await getScanMeta('migrated_from_async_storage');
    if (alreadyMigrated === 'true') return false;

    const results = await AsyncStorage.multiGet([LEGACY_CACHE_KEYS[0], LEGACY_CACHE_KEYS[1], LEGACY_CACHE_KEYS[2]]);

    const tracksJson = results[0][1];
    const lastScanStr = results[2][1];

    if (tracksJson) {
      const tracks: Track[] = JSON.parse(tracksJson);
      if (Array.isArray(tracks) && tracks.length > 0) {
        logger.log(`Migrating ${tracks.length} tracks from AsyncStorage to SQLite...`);
        await replaceAllTracks(tracks);
        if (lastScanStr) {
          await setScanMeta('last_scan_at', lastScanStr);
        }
        await setScanMeta('migrated_from_async_storage', 'true');
        await AsyncStorage.multiRemove(LEGACY_CACHE_KEYS);
        logger.log('Migration from AsyncStorage complete');
        return true;
      }
    }

    await setScanMeta('migrated_from_async_storage', 'true');
    return false;
  } catch (error) {
    logger.error('Error migrating from AsyncStorage:', error);
    return false;
  }
}

async function scanAllAssets(): Promise<Track[]> {
  const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  if (status !== 'granted') {
    throw new Error('Permiso denegado. Ve a Ajustes > Apps > Frito Music y activa permisos de almacenamiento.');
  }

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

  return allTracks;
}

async function getQuickAssetCount(): Promise<number> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    if (status !== 'granted') return -1;
    const result = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 1,
    });
    return result.totalCount;
  } catch {
    return -1;
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

  const hasInitialized = useRef(false);
  const scanCancelledRef = useRef(false);

  const loadFromDb = useCallback(async () => {
    const dbTracks = await getAllTracks();
    const dbFolders = await getFolders();
    const lastScan = await getScanMeta('last_scan_at');
    setTracks(dbTracks);
    setFolders(dbFolders);
    setLastScanAt(lastScan ? parseInt(lastScan, 10) : null);
    return { tracks: dbTracks, lastScanAt: lastScan ? parseInt(lastScan, 10) : null };
  }, []);

  const scanLibrary = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      scanCancelledRef.current = false;

      const scannedTracks = await scanAllAssets();
      if (scanCancelledRef.current) return;

      const existingIds = await getAllTrackIds();
      const scannedIds = new Set(scannedTracks.map(t => t.id));

      const removedIds = [...existingIds].filter(id => !scannedIds.has(id));
      const newOrUpdated = scannedTracks;

      if (removedIds.length > 0) {
        await removeTracksByIds(removedIds);
        logger.log(`Removed ${removedIds.length} tracks no longer on device`);
      }

      await upsertTracks(newOrUpdated);
      await setScanMeta('last_scan_at', Date.now().toString());

      if (scanCancelledRef.current) return;

      await loadFromDb();
      setIsLoaded(true);

      logger.log(`Scan complete: ${scannedTracks.length} tracks (${removedIds.length} removed)`);
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
  }, [loadFromDb]);

  const backgroundSync = useCallback(
    async (cachedTrackCount: number, cachedLastScan: number | null) => {
      const timeSinceLastScan = cachedLastScan ? Date.now() - cachedLastScan : Infinity;
      if (timeSinceLastScan <= RESCAN_THRESHOLD_MS) {
        const currentCount = await getQuickAssetCount();
        if (currentCount >= 0 && currentCount === cachedTrackCount) {
          logger.log('Track count unchanged, skipping background sync');
          return;
        }
      }

      logger.log('Starting background sync...');
      await scanLibrary();
    },
    [scanLibrary],
  );

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      try {
        await migrateFromAsyncStorage();

        const dbTrackCount = await getTrackCount();

        if (dbTrackCount > 0) {
          const loaded = await loadFromDb();
          setIsLoaded(true);
          logger.log(`Loaded ${dbTrackCount} tracks from SQLite`);

          InteractionManager.runAfterInteractions(() => {
            backgroundSync(dbTrackCount, loaded.lastScanAt);
          });
        } else {
          InteractionManager.runAfterInteractions(() => {
            scanLibrary();
          });
        }
      } catch (err) {
        logger.error('Error initializing library:', err);
        InteractionManager.runAfterInteractions(() => {
          scanLibrary();
        });
      }
    };

    init();

    return () => {
      scanCancelledRef.current = true;
    };
  }, [scanLibrary, loadFromDb, backgroundSync]);

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
