/**
 * FolderCard Component
 * Displays a music folder as a card with artwork preview and track count
 * Responsive design that adapts to any screen size
 */

import React, { memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { formatTrackCount } from '@/utils/formatters';
import type { Folder } from '@/types/audio';

// =============================================================================
// Types
// =============================================================================

interface FolderCardProps {
  /** Folder data to display */
  folder: Folder;
  /** Callback when card is pressed */
  onPress: (folder: Folder) => void;
}

// =============================================================================
// Component
// =============================================================================

function FolderCardComponent({ folder, onPress }: FolderCardProps) {
  // Use dynamic dimensions that update on rotation/resize
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive card dimensions
  const cardMargin = Spacing.sm;
  const numColumns = 2;
  const horizontalPadding = Spacing.base * 2;
  const cardWidth = (screenWidth - horizontalPadding - cardMargin * (numColumns - 1)) / numColumns;
  const cardHeight = cardWidth * 1.25; // Slightly shorter ratio for better fit
  
  // Scale icons based on card size
  const iconSize = Math.min(40, cardWidth * 0.25);
  const playButtonSize = Math.min(44, cardWidth * 0.28);

  const handlePress = () => onPress(folder);

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          width: cardWidth, 
          height: cardHeight,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Artwork Section */}
      <View style={styles.artworkContainer}>
        {folder.artwork ? (
          <Image 
            source={{ uri: folder.artwork }} 
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          // Placeholder with gradient
          <LinearGradient
            colors={[Colors.backgroundHighlight, Colors.background]}
            style={styles.artworkPlaceholder}
          >
            <Ionicons 
              name="folder-open" 
              size={iconSize} 
              color={Colors.textMuted} 
            />
          </LinearGradient>
        )}
        
        {/* Play button overlay */}
        <View style={styles.playButtonContainer}>
          <View style={[
            styles.playButton,
            { width: playButtonSize, height: playButtonSize, borderRadius: playButtonSize / 2 }
          ]}>
            <Ionicons 
              name="play" 
              size={playButtonSize * 0.5} 
              color={Colors.background} 
            />
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.folderName} numberOfLines={2}>
          {folder.name}
        </Text>
        <Text style={styles.trackCount}>
          {formatTrackCount(folder.trackCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundElevated,
    overflow: 'hidden',
    ...Shadows.md,
  },
  
  // Artwork
  artworkContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
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
  
  // Play button
  playButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    opacity: 0.95,
  },
  playButton: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  
  // Info section
  infoSection: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  folderName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  trackCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});

// =============================================================================
// Export
// =============================================================================

export const FolderCard = memo(FolderCardComponent);
export default FolderCard;
