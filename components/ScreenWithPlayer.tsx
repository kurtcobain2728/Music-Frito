import { MiniPlayer } from '@/components/MiniPlayer';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWithPlayerProps {
  children: React.ReactNode;
}

export function ScreenWithPlayer({ children }: ScreenWithPlayerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const c = theme.colors;
  const miniPlayerBottom = Math.max(insets.bottom, Spacing.base) + Spacing.sm;

  return (
    <View style={styles.container}>
      <View style={[styles.container, { backgroundColor: c.background }]}>{children}</View>
      <View style={[styles.miniPlayerWrapper, { bottom: miniPlayerBottom }]}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  miniPlayerWrapper: { position: 'absolute', left: 0, right: 0 },
});

export default ScreenWithPlayer;
