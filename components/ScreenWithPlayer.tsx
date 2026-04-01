import { MiniPlayer } from '@/components/MiniPlayer';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWithPlayerProps {
  children: React.ReactNode;
}

/**
 * ScreenWithPlayer wraps each screen with:
 *   – A full-screen background (theme-dependent)
 *   – The floating MiniPlayer at the bottom
 *
 * Crystal / Glassmorphism mode:
 *   On iOS, BlurView works out of the box.
 *   On Android <12, BlurView renders a semi-transparent view (no actual blur).
 *   To simulate the frosted-glass look on Android we layer:
 *     1. A dark solid base
 *     2. A subtle gradient for depth
 *     3. A very light translucent overlay for the "ice" feel
 */
export function ScreenWithPlayer({ children }: ScreenWithPlayerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const c = theme.colors;
  const miniPlayerBottom = Math.max(insets.bottom, Spacing.base) + Spacing.sm;

  const renderBackground = () => {
    if (!theme.isBlurred) {
      return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
          {children}
        </View>
      );
    }

    // Crystal / Glassmorphism mode
    const supportsNativeBlur = Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 31);

    return (
      <View style={[styles.container, { backgroundColor: '#080810' }]}>
        {supportsNativeBlur ? (
          // Real blur on supported platforms
          <BlurView
            intensity={c.blurIntensity}
            tint={c.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          // Simulated glassmorphism for older Android
          <LinearGradient
            colors={['rgba(20, 20, 35, 0.92)', 'rgba(10, 10, 18, 0.96)', 'rgba(8, 8, 16, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Subtle frosted overlay that gives the "glass" tint */}
        <View style={[StyleSheet.absoluteFill, styles.crystalOverlay]} />
        {children}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderBackground()}
      <View style={[styles.miniPlayerWrapper, { bottom: miniPlayerBottom }]}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  miniPlayerWrapper: { position: 'absolute', left: 0, right: 0 },
  crystalOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
});

export default ScreenWithPlayer;
