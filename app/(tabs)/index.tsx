import { ArtworkPlaceholder } from '@/components/ArtworkPlaceholder';
import { FolderIcon } from '@/components/FolderIcon';
import { InteractiveScrollBar } from '@/components/InteractiveScrollBar';
import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { TrackItem } from '@/components/TrackItem';
import { BorderRadius, Layout, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlaybackMetadata, usePlaybackControls } from '@/contexts/PlayerContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FileExplorerModule, { type DirectoryEntry, type FileEntry } from '@/modules/file-explorer';
import type { Folder, Track } from '@/types/audio';
import { formatDuration, formatTrackCount } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NativeListItem = { type: 'folder'; entry: DirectoryEntry } | { type: 'file'; entry: FileEntry; track?: Track };

function getAudioFormat(filename: string): string {
  return (filename.split('.').pop()?.toLowerCase() || '').toUpperCase();
}

function isLosslessFormat(format: string): boolean {
  return ['FLAC', 'WAV', 'AIFF', 'APE', 'DFF', 'DSF'].includes(format);
}

function cleanTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  return withoutExt
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function fileToTrack(file: FileEntry): Track {
  const folderPath = file.folderPath || file.path.substring(0, file.path.lastIndexOf('/'));
  const folderName = folderPath.split('/').filter(Boolean).pop() || 'Unknown';
  return {
    id: file.uri,
    uri: file.uri,
    title: cleanTitle(file.filename),
    artist: 'Unknown Artist',
    album: folderName,
    duration: 0,
    artwork: undefined,
    folderPath,
    filename: file.filename,
    format: (file.extension as any) || 'unknown',
    fileSize: file.size,
    createdAt: file.lastModified,
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    tracks: libraryTracks,
    folders: libraryFolders,
    isScanning,
    isLoaded: libraryLoaded,
    scanLibrary,
    getTracksForFolder,
  } = useAudioLibrary();
  const { currentTrack, isPlaying } = usePlaybackMetadata();
  const controls = usePlaybackControls();
  const { theme } = useTheme();
  const c = theme.colors;
  const flatListRef = useRef<FlatList>(null);

  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState('/storage/emulated/0');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [nativeItems, setNativeItems] = useState<NativeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useNativeExplorer, setUseNativeExplorer] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [scrollState, setScrollState] = useState({ offset: 0, contentHeight: 0, visibleHeight: 0, isScrolling: false });
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackMapRef = useRef(new Map<string, Track>());
  const dirCacheRef = useRef(new Map<string, NativeListItem[]>());

  useEffect(() => {
    if (libraryTracks.length === 0) return;
    const map = new Map<string, Track>();
    for (let i = 0; i < libraryTracks.length; i++) {
      const t = libraryTracks[i];
      map.set(t.uri, t);
      const filePath = t.uri.replace('file://', '');
      map.set(filePath, t);
    }
    trackMapRef.current = map;
    dirCacheRef.current.clear();
  }, [libraryTracks]);

  const loadDirectory = useCallback(async (path: string, forceRefresh = false) => {
    if (!FileExplorerModule) return;

    if (!forceRefresh) {
      const cached = dirCacheRef.current.get(path);
      if (cached) {
        setNativeItems(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await FileExplorerModule.listDirectory(path);
      const map = trackMapRef.current;
      const listItems: NativeListItem[] = [];
      result.folders.forEach((folder: DirectoryEntry) => {
        listItems.push({ type: 'folder', entry: folder });
      });
      result.files.forEach((file: FileEntry) => {
        const existing = map.get(file.uri) || map.get(file.path);
        listItems.push({ type: 'file', entry: file, track: existing });
      });
      dirCacheRef.current.set(path, listItems);
      setNativeItems(listItems);
    } catch (_e) {
      setNativeItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initDoneRef = useRef(false);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      if (FileExplorerModule) {
        try {
          const hasPermission = await FileExplorerModule.hasStoragePermission();
          if (hasPermission) {
            const root = await FileExplorerModule.getStorageRoot();
            setRootPath(root);
            setUseNativeExplorer(true);
            setNativeReady(true);
            await loadDirectory(root);
            return;
          }
        } catch (_e) {}
      }
      setUseNativeExplorer(false);
      setNativeReady(true);
      setIsLoading(false);
    };
    init();
  }, [loadDirectory]);

  useEffect(() => {
    if (!useNativeExplorer || !nativeReady || !initDoneRef.current) return;
    if (!currentPath) return;
    loadDirectory(currentPath);
  }, [currentPath, useNativeExplorer, nativeReady, loadDirectory]);

  const currentFolderName = useMemo(() => {
    if (!currentPath) return 'Almacenamiento';
    return currentPath.split('/').filter(Boolean).pop() || 'Almacenamiento';
  }, [currentPath]);

  const currentFileTracks = useMemo(() => {
    if (useNativeExplorer) {
      return nativeItems
        .filter((i): i is NativeListItem & { type: 'file' } => i.type === 'file')
        .map(i => i.track || fileToTrack(i.entry));
    }
    return [];
  }, [nativeItems, useNativeExplorer]);

  const handleBack = useCallback(() => {
    const prev = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(p => p.slice(0, -1));
    setCurrentPath(prev === rootPath ? null : prev);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [navigationHistory, rootPath]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useNativeExplorer && currentPath && currentPath !== rootPath) {
        handleBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentPath, rootPath, handleBack, useNativeExplorer]);

  const handleFolderPress = useCallback(
    (folder: DirectoryEntry) => {
      setNavigationHistory(prev => [...prev, currentPath || rootPath]);
      setCurrentPath(folder.path);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [currentPath, rootPath],
  );

  const handleLegacyFolderPress = useCallback((folder: Folder) => {
    router.push({ pathname: '/folder/[id]', params: { id: folder.id } });
  }, []);

  const handleFilePress = useCallback(
    (file: FileEntry, existingTrack?: Track) => {
      const track = existingTrack || fileToTrack(file);
      controls.playTrack(track, currentFileTracks);
    },
    [controls, currentFileTracks],
  );

  const handleLegacyTrackPress = useCallback(
    (track: Track) => {
      controls.playTrack(track, libraryTracks);
    },
    [controls, libraryTracks],
  );

  const handlePlayAll = useCallback(() => {
    if (useNativeExplorer && currentFileTracks.length > 0) {
      controls.playTrack(currentFileTracks[0], currentFileTracks);
    }
  }, [controls, currentFileTracks, useNativeExplorer]);

  const handleRefresh = useCallback(async () => {
    if (useNativeExplorer) {
      await loadDirectory(currentPath || rootPath, true);
    } else {
      await scanLibrary();
    }
  }, [useNativeExplorer, loadDirectory, currentPath, rootPath, scanLibrary]);

  const handleScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrollState({
      offset: contentOffset.y,
      contentHeight: contentSize.height,
      visibleHeight: layoutMeasurement.height,
      isScrolling: true,
    });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setScrollState(prev => ({ ...prev, isScrolling: false })), 150);
  }, []);

  const handleScrollBarDrag = useCallback((offset: number) => {
    flatListRef.current?.scrollToOffset({ offset, animated: false });
  }, []);

  const renderNativeItem = useCallback(
    ({ item }: { item: NativeListItem }) => {
      if (item.type === 'folder') {
        const folder = item.entry;
        return (
          <Pressable
            style={[styles.itemRow, { backgroundColor: c.backgroundElevated }]}
            onPress={() => handleFolderPress(folder)}
          >
            <View style={styles.itemIcon}>
              <FolderIcon folderName={folder.name} size={48} trackCount={folder.audioCount} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: c.textPrimary }]} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={[styles.itemSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
                {formatTrackCount(folder.audioCount)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </Pressable>
        );
      }
      const file = item.entry;
      const track = item.track || fileToTrack(file);
      const isCurrent = currentTrack?.id === track.id || currentTrack?.uri === track.uri;
      const isPlayingCurrent = isPlaying && isCurrent;
      const format = getAudioFormat(file.filename);
      const lossless = isLosslessFormat(format);

      return (
        <Pressable
          style={[styles.itemRow, { backgroundColor: isCurrent ? c.backgroundHighlight : c.backgroundElevated }]}
          onPress={() => handleFilePress(file, item.track)}
        >
          <View style={styles.itemIcon}>
            {track.artwork ? (
              <Image source={{ uri: track.artwork }} style={styles.itemImage} />
            ) : (
              <ArtworkPlaceholder trackId={track.id} size={48} borderRadius={BorderRadius.sm} />
            )}
            {isPlayingCurrent && (
              <View style={styles.playingOverlay}>
                <Ionicons name="volume-high" size={16} color={c.primary} />
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.itemTitle, { color: isCurrent ? c.primary : c.textPrimary }]} numberOfLines={1}>
                {track.title}
              </Text>
              <View style={[styles.formatBadge, { backgroundColor: lossless ? c.primary : c.backgroundHighlight }]}>
                <Text style={[styles.formatText, { color: lossless ? '#000' : c.textSecondary }]}>{format}</Text>
              </View>
            </View>
            <Text style={[styles.itemSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
              {track.artist}
              {track.duration > 0 ? ` • ${formatDuration(track.duration)}` : ''}
            </Text>
          </View>
        </Pressable>
      );
    },
    [handleFolderPress, handleFilePress, currentTrack, isPlaying, c],
  );

  const renderLegacyFolderItem = useCallback(
    ({ item }: { item: Folder }) => (
      <Pressable
        style={[styles.itemRow, { backgroundColor: c.backgroundElevated }]}
        onPress={() => handleLegacyFolderPress(item)}
      >
        <View style={styles.itemIcon}>
          <FolderIcon folderName={item.name} size={48} trackCount={item.trackCount} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: c.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.itemSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
            {formatTrackCount(item.trackCount)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </Pressable>
    ),
    [c, handleLegacyFolderPress],
  );

  const nativeKeyExtractor = useCallback((item: NativeListItem) => {
    return item.type === 'folder' ? `f:${item.entry.path}` : `t:${item.entry.path}`;
  }, []);

  const legacyKeyExtractor = useCallback((item: Folder) => item.id, []);

  const ITEM_HEIGHT = 72;
  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  const folderCount = useNativeExplorer ? nativeItems.filter(i => i.type === 'folder').length : 0;
  const fileCount = useNativeExplorer ? nativeItems.filter(i => i.type === 'file').length : 0;

  const hour = new Date().getHours();
  let greeting = 'Buenas noches';
  if (hour >= 5 && hour < 12) greeting = 'Buenos días';
  else if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';

  const renderNativeHeader = () => {
    const isAtRoot = !currentPath || currentPath === rootPath;
    if (!isAtRoot) {
      return (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.folderTitle, { color: c.textPrimary }]}>{currentFolderName}</Text>
            <Text style={[styles.folderSubtitle, { color: c.textSecondary }]}>
              {folderCount > 0 && `${folderCount} carpeta${folderCount !== 1 ? 's' : ''}`}
              {folderCount > 0 && fileCount > 0 && ' • '}
              {fileCount > 0 && `${fileCount} cancion${fileCount !== 1 ? 'es' : ''}`}
            </Text>
          </View>
          {fileCount > 0 && (
            <TouchableOpacity onPress={handlePlayAll} style={[styles.headerPlayButton, { backgroundColor: c.primary }]}>
              <Ionicons name="play" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>{greeting}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>Explorador de archivos</Text>
        </View>
      </View>
    );
  };

  const renderLegacyHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.greeting, { color: c.textPrimary }]}>{greeting}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {libraryFolders.length} carpeta{libraryFolders.length !== 1 ? 's' : ''} • {libraryTracks.length} canciones
        </Text>
      </View>
    </View>
  );

  const showLoading = useNativeExplorer ? isLoading : isScanning && !libraryLoaded;

  const renderEmptyState = () => {
    if (showLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>Escaneando...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-open" size={64} color={c.textMuted} />
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>
          {useNativeExplorer ? 'No se encontró música en esta carpeta' : 'No se encontró música'}
        </Text>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: c.primary }]} onPress={handleRefresh}>
          <Text style={[styles.refreshText, { color: '#000' }]}>Volver a escanear</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (useNativeExplorer) {
    return (
      <ScreenWithPlayer>
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
          <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient} />
          <FlatList
            ref={flatListRef}
            data={nativeItems}
            renderItem={renderNativeItem}
            keyExtractor={nativeKeyExtractor}
            getItemLayout={getItemLayout}
            ListHeaderComponent={renderNativeHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={[styles.listContent, nativeItems.length === 0 && styles.listContentEmpty]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
          <InteractiveScrollBar
            contentHeight={scrollState.contentHeight}
            visibleHeight={scrollState.visibleHeight}
            scrollOffset={scrollState.offset}
            isScrolling={scrollState.isScrolling}
            onDrag={handleScrollBarDrag}
          />
        </View>
      </ScreenWithPlayer>
    );
  }

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient} />
        <FlatList
          ref={flatListRef}
          data={libraryFolders}
          renderItem={renderLegacyFolderItem}
          keyExtractor={legacyKeyExtractor}
          getItemLayout={getItemLayout}
          ListHeaderComponent={renderLegacyHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.listContent, libraryFolders.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={isScanning}
              onRefresh={scanLibrary}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
        <InteractiveScrollBar
          contentHeight={scrollState.contentHeight}
          visibleHeight={scrollState.visibleHeight}
          scrollOffset={scrollState.offset}
          isScrolling={scrollState.isScrolling}
          onDrag={handleScrollBarDrag}
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerContent: { flex: 1 },
  greeting: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.md },
  folderTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: 2 },
  folderSubtitle: { fontSize: Typography.fontSize.sm },
  headerPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: Layout.screenPaddingBottom },
  listContentEmpty: { flex: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginRight: Spacing.md,
    position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  itemTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, flex: 1 },
  itemSubtitle: { fontSize: Typography.fontSize.sm },
  formatBadge: { marginLeft: Spacing.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  formatText: { fontSize: 9, fontWeight: '700' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: 100,
  },
  emptyText: { fontSize: Typography.fontSize.base, textAlign: 'center', marginTop: Spacing.lg },
  refreshButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  refreshText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
});
