/**
 * Home Screen (Dashboard)
 * Displays music folders in a grid layout, similar to Spotify's home screen
 */

import React, { useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Layout } from '@/constants/theme';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { FolderCard } from '@/components/FolderCard';
import type { Folder } from '@/types/audio';

// =============================================================================
// Constants
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = Spacing.sm;
const NUM_COLUMNS = 2;

// =============================================================================
// Component
// =============================================================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { folders, isScanning, isLoaded, error, scanLibrary } = useAudioLibrary();

  /**
   * Navigate to folder detail screen
   */
  const handleFolderPress = useCallback((folder: Folder) => {
    router.push({
      pathname: '/folder/[id]',
      params: { id: folder.id, name: folder.name },
    });
  }, []);

  /**
   * Render folder card item
   */
  const renderFolderCard = useCallback(({ item }: { item: Folder }) => (
    <View style={styles.cardWrapper}>
      <FolderCard folder={item} onPress={handleFolderPress} />
    </View>
  ), [handleFolderPress]);

  /**
   * Get unique key for each folder
   */
  const keyExtractor = useCallback((item: Folder) => item.id, []);

  /**
   * Render header with greeting
   */
  const renderHeader = () => {
    const hour = new Date().getHours();
    let greeting = 'Buenas noches';
    if (hour >= 5 && hour < 12) greeting = 'Buenos días';
    else if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';

    return (
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>Tus carpetas de música</Text>
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (isScanning) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyText}>Escaneando tu música...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.emptyTitle}>Error al cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-open" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No se encontró música</Text>
        <Text style={styles.emptyText}>
          Añade archivos de audio a tu dispositivo para empezar
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.background]}
        style={styles.gradient}
      />
      
      {/* Folder list */}
      <FlatList
        data={folders}
        renderItem={renderFolderCard}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          folders.length === 0 && styles.listContentEmpty,
        ]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isScanning}
            onRefresh={scanLibrary}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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
    height: 300,
  },
  
  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
  },
  
  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Layout.screenPaddingBottom,
  },
  listContentEmpty: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: CARD_MARGIN,
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
});
