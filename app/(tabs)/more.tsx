/**
 * More Screen
 * Shows options for Favorites and Playlists
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '@/constants/theme';
import { useFavorites } from '@/contexts/FavoritesContext';

// =============================================================================
// Menu Item Component
// =============================================================================

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
}

function MenuItem({ icon, title, subtitle, onPress, iconColor = Colors.primary }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, playlists } = useFavorites();

  const handleFavorites = () => {
    router.push('/favorites' as any);
  };

  const handlePlaylists = () => {
    router.push('/playlists' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.backgroundHighlight, Colors.background]}
        style={styles.gradient}
      />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Layout.screenPaddingBottom + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Más</Text>
          <Text style={styles.subtitle}>Tu colección personal</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon="heart"
            title="Favoritos"
            subtitle={`${favorites.length} canción${favorites.length !== 1 ? 'es' : ''}`}
            onPress={handleFavorites}
            iconColor="#FF6B6B"
          />
          
          <MenuItem
            icon="list"
            title="Listas de Reproducción"
            subtitle={`${playlists.length} lista${playlists.length !== 1 ? 's' : ''}`}
            onPress={handlePlaylists}
            iconColor={Colors.primary}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="musical-notes" size={48} color={Colors.textMuted} />
          <Text style={styles.infoTitle}>Organiza tu música</Text>
          <Text style={styles.infoText}>
            Marca canciones como favoritas o crea listas de reproducción personalizadas
          </Text>
        </View>
      </ScrollView>
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
    height: 200,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  
  // Menu
  menuContainer: {
    paddingHorizontal: Spacing.base,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Info section
  infoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  infoTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
