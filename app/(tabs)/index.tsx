import { ArtworkPlaceholder } from '@/components/ArtworkPlaceholder';
import { ExpressiveScrollBar } from '@/components/ExpressiveScrollBar';
import { FolderIcon } from '@/components/FolderIcon';
import { ScreenWithPlayer } from '@/components/ScreenWithPlayer';
import { BorderRadius, Layout, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import type { Folder, Track } from '@/types/audio';
import { formatDuration } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FileSystemNode {
  type: 'folder' | 'track';
  name: string;
  path: string;
  data?: Track;
  trackCount?: number;
  artwork?: string;
  children?: string[];
}

function getAudioFormat(filename: string): string {
  return (filename.split('.').pop()?.toLowerCase() || '').toUpperCase();
}

function isLosslessFormat(format: string): boolean {
  return ['FLAC', 'WAV', 'AIFF', 'APE', 'DFF', 'DSF'].includes(format);
}

/**
 * Well-known Android storage root paths.
 * We use these to avoid descending too deep into the tree.
 */
const ANDROID_STORAGE_ROOTS = [
  '/storage/emulated/0',
  '/sdcard',
  '/storage/sdcard0',
  '/mnt/sdcard',
];

/**
 * Find a sensible root to show the user.
 * Instead of computing the deepest common ancestor (which often points to a single
 * band/album folder), we look for a well-known Android storage root in the paths.
 * If none found, we fall back to one level above the deepest common ancestor so that
 * at least the top-level music folders are visible.
 */
function findStorageRoot(paths: string[]): string {
  if (paths.length === 0) return '/storage/emulated/0';

  // Check if all paths share a well-known root
  for (const root of ANDROID_STORAGE_ROOTS) {
    if (paths.every(p => p.startsWith(root))) {
      return root;
    }
  }

  // Fallback: compute common ancestor but stop one level higher than deepest common
  if (paths.length === 1) {
    // Single folder: go up two levels so the user can see the parent
    const parts = paths[0].split('/').filter(Boolean);
    if (parts.length > 2) {
      parts.pop(); // remove folder itself
      parts.pop(); // go one more up
      return '/' + parts.join('/');
    }
    parts.pop();
    return '/' + parts.join('/');
  }

  const splitPaths = paths.map(p => p.split('/').filter(Boolean));
  const minLength = Math.min(...splitPaths.map(p => p.length));
  const commonParts: string[] = [];
  for (let i = 0; i < minLength; i++) {
    const part = splitPaths[0][i];
    if (splitPaths.every(p => p[i] === part)) commonParts.push(part);
    else break;
  }
  return '/' + commonParts.join('/');
}

function buildFileSystemTree(folders: Folder[], tracks: Track[]): Map<string, FileSystemNode[]> {
  const tree = new Map<string, FileSystemNode[]>();
  const allPaths = new Set<string>();
  folders.forEach(f => allPaths.add(f.path));
  const storageRoot = findStorageRoot(Array.from(allPaths));

  // Collect all intermediate directories between the storage root and each music folder
  const folderSet = new Set<string>();
  folders.forEach(folder => {
    folderSet.add(folder.path);
    let currentPath = folder.path;
    while (currentPath !== storageRoot && currentPath.length > storageRoot.length) {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      if (parentPath.length >= storageRoot.length) folderSet.add(parentPath);
      currentPath = parentPath;
    }
  });

  // Create nodes for each folder
  const folderNodes = new Map<string, FileSystemNode>();
  folders.forEach(folder => {
    folderNodes.set(folder.path, {
      type: 'folder',
      name: folder.name,
      path: folder.path,
      trackCount: folder.trackCount,
      artwork: folder.artwork,
    });
  });

  // Create intermediate folder nodes (directories that don't directly contain music)
  folderSet.forEach(path => {
    if (!folderNodes.has(path)) {
      const name = path.split('/').filter(Boolean).pop() || 'Storage';
      folderNodes.set(path, { type: 'folder', name, path, trackCount: 0 });
    }
  });

  // Propagate track counts upward through intermediate directories
  folders.forEach(folder => {
    let currentPath = folder.path;
    while (currentPath !== storageRoot && currentPath.length > storageRoot.length) {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      if (parentPath.length >= storageRoot.length) {
        const parentNode = folderNodes.get(parentPath);
        if (parentNode) {
          parentNode.trackCount = (parentNode.trackCount || 0) + folder.trackCount;
          if (!parentNode.artwork && folder.artwork) parentNode.artwork = folder.artwork;
        }
      }
      currentPath = parentPath;
    }
  });

  // Build parent → children relationships
  folderNodes.forEach((node, path) => {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || storageRoot;
    if (path !== storageRoot) {
      const siblings = tree.get(parentPath) || [];
      siblings.push(node);
      tree.set(parentPath, siblings);
    }
  });

  // Add tracks to their parent folders
  tracks.forEach(track => {
    const siblings = tree.get(track.folderPath) || [];
    siblings.push({ type: 'track', name: track.title, path: track.uri, data: track });
    tree.set(track.folderPath, siblings);
  });

  // Sort: folders first, then tracks, alphabetically
  tree.forEach((items) => {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });

  return tree;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { folders, tracks, isScanning, error, scanLibrary } = useAudioLibrary();
  const { state, controls } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [scrollState, setScrollState] = useState({ offset: 0, contentHeight: 0, visibleHeight: 0, isScrolling: false });
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileSystemTree = useMemo(() => buildFileSystemTree(folders, tracks), [folders, tracks]);
  const rootPath = useMemo(() => findStorageRoot(folders.map(f => f.path)), [folders]);
  const currentFolderName = useMemo(() => {
    if (!currentPath) return 'Almacenamiento';
    return currentPath.split('/').filter(Boolean).pop() || 'Almacenamiento';
  }, [currentPath]);

  const displayItems = useMemo((): FileSystemNode[] => {
    const key = currentPath || rootPath;
    const items = fileSystemTree.get(key);
    if (items && items.length > 0) return items;

    // If at root and nothing found, try showing immediate children from the tree
    if (!currentPath) {
      // Gather all top-level entries from the tree that are direct children of rootPath
      const rootChildren: FileSystemNode[] = [];
      fileSystemTree.forEach((children, parentPath) => {
        if (parentPath === rootPath) {
          rootChildren.push(...children);
        }
      });
      if (rootChildren.length > 0) return rootChildren;

      // Last fallback: show all unique top-level folders
      const topFolders = new Map<string, FileSystemNode>();
      fileSystemTree.forEach((children) => {
        children.forEach(child => {
          if (child.type === 'folder' && !topFolders.has(child.path)) {
            topFolders.set(child.path, child);
          }
        });
      });
      return Array.from(topFolders.values());
    }
    return [];
  }, [currentPath, rootPath, fileSystemTree]);

  const currentFolderTracks = useMemo(
    () => displayItems.filter(i => i.type === 'track' && i.data).map(i => i.data as Track),
    [displayItems]
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentPath && currentPath !== rootPath) { handleBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [currentPath, rootPath]);

  const handleFolderPress = useCallback((node: FileSystemNode) => {
    setNavigationHistory(prev => [...prev, currentPath || rootPath]);
    setCurrentPath(node.path);
  }, [currentPath, rootPath]);

  const handleTrackPress = useCallback((track: Track) => {
    controls.playTrack(track, currentFolderTracks);
  }, [controls, currentFolderTracks]);

  const handleBack = useCallback(() => {
    const prev = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(p => p.slice(0, -1));
    setCurrentPath(prev === rootPath ? null : prev);
  }, [navigationHistory, rootPath]);

  const handlePlayAll = useCallback(() => {
    if (currentFolderTracks.length > 0) controls.playTrack(currentFolderTracks[0], currentFolderTracks);
  }, [controls, currentFolderTracks]);

  const renderItem = useCallback(({ item }: { item: FileSystemNode }) => {
    if (item.type === 'folder') {
      return (
        <Pressable style={[styles.itemRow, { backgroundColor: c.backgroundElevated }]} onPress={() => handleFolderPress(item)}>
          <View style={styles.itemIcon}><FolderIcon folderName={item.name} size={48} trackCount={item.trackCount} /></View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemSubtitle, { color: c.textSecondary }]} numberOfLines={1}>{item.trackCount} {item.trackCount === 1 ? 'canción' : 'canciones'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
        </Pressable>
      );
    } else if (item.data) {
      const track = item.data;
      const isCurrent = state.currentTrack?.id === track.id;
      const isPlaying = state.isPlaying && isCurrent;
      const format = getAudioFormat(track.filename);
      const lossless = isLosslessFormat(format);
      return (
        <Pressable style={[styles.itemRow, { backgroundColor: isCurrent ? c.backgroundHighlight : c.backgroundElevated }]} onPress={() => handleTrackPress(track)}>
          <View style={styles.itemIcon}>
            {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.itemImage} /> : <ArtworkPlaceholder trackId={track.id} size={48} borderRadius={BorderRadius.sm} />}
            {isPlaying && <View style={styles.playingOverlay}><Ionicons name="volume-high" size={16} color={c.primary} /></View>}
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.itemTitle, { color: isCurrent ? c.primary : c.textPrimary }]} numberOfLines={1}>{track.title}</Text>
              <View style={[styles.formatBadge, { backgroundColor: lossless ? c.primary : c.backgroundHighlight }]}>
                <Text style={[styles.formatText, { color: lossless ? '#000' : c.textSecondary }]}>{format}</Text>
              </View>
            </View>
            <Text style={[styles.itemSubtitle, { color: c.textSecondary }]} numberOfLines={1}>{track.artist} • {formatDuration(track.duration)}</Text>
          </View>
        </Pressable>
      );
    }
    return null;
  }, [handleFolderPress, handleTrackPress, state.currentTrack, state.isPlaying, c]);

  const keyExtractor = useCallback((item: FileSystemNode) => item.path, []);
  const folderCount = displayItems.filter(i => i.type === 'folder').length;
  const trackCount = displayItems.filter(i => i.type === 'track').length;

  const renderHeader = () => {
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
              {folderCount > 0 && trackCount > 0 && ' • '}
              {trackCount > 0 && `${trackCount} cancion${trackCount !== 1 ? 'es' : ''}`}
            </Text>
          </View>
          {trackCount > 0 && (
            <TouchableOpacity onPress={handlePlayAll} style={[styles.headerPlayButton, { backgroundColor: c.primary }]}>
              <Ionicons name="play" size={20} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    const hour = new Date().getHours();
    let greeting = 'Buenas noches';
    if (hour >= 5 && hour < 12) greeting = 'Buenos días';
    else if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>{greeting}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {folders.length > 0 ? `${tracks.length} canciones en ${folders.length} carpeta${folders.length !== 1 ? 's' : ''}` : 'Tu biblioteca de música'}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isScanning) return <View style={styles.emptyState}><ActivityIndicator size="large" color={c.primary} /><Text style={[styles.emptyText, { color: c.textSecondary }]}>Escaneando tu música...</Text></View>;
    if (error) return <View style={styles.emptyState}><Ionicons name="alert-circle" size={64} color={c.error} /><Text style={[styles.emptyText, { color: c.textSecondary }]}>{error}</Text></View>;
    return <View style={styles.emptyState}><Ionicons name="folder-open" size={64} color={c.textMuted} /><Text style={[styles.emptyText, { color: c.textSecondary }]}>No se encontró música</Text></View>;
  };

  return (
    <ScreenWithPlayer>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient} />
        <FlatList
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.listContent, displayItems.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          refreshControl={<RefreshControl refreshing={isScanning} onRefresh={scanLibrary} tintColor={c.primary} colors={[c.primary]} />}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setScrollState({ offset: contentOffset.y, contentHeight: contentSize.height, visibleHeight: layoutMeasurement.height, isScrolling: true });
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => setScrollState(prev => ({ ...prev, isScrolling: false })), 150);
          }}
          scrollEventThrottle={16}
        />
        <ExpressiveScrollBar
          contentHeight={scrollState.contentHeight}
          visibleHeight={scrollState.visibleHeight}
          scrollOffset={scrollState.offset}
          isScrolling={scrollState.isScrolling}
        />
      </View>
    </ScreenWithPlayer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  headerContent: { flex: 1 },
  greeting: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.fontSize.md },
  folderTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: 2 },
  folderSubtitle: { fontSize: Typography.fontSize.sm },
  headerPlayButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: Layout.screenPaddingBottom },
  listContentEmpty: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  itemIcon: { width: 48, height: 48, borderRadius: BorderRadius.sm, overflow: 'hidden', marginRight: Spacing.md, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  playingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  itemTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, flex: 1 },
  itemSubtitle: { fontSize: Typography.fontSize.sm },
  formatBadge: { marginLeft: Spacing.xs, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  formatText: { fontSize: 9, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, marginTop: 100 },
  emptyText: { fontSize: Typography.fontSize.base, textAlign: 'center', marginTop: Spacing.lg },
});
