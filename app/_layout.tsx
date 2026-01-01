/**
 * Root Layout
 * Sets up the main navigation structure and global providers
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { PlayerProvider } from '@/contexts/PlayerContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { Colors } from '@/constants/theme';

// Export error boundary from expo-router
export { ErrorBoundary } from 'expo-router';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configure initial route settings
 */
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// =============================================================================
// Custom Dark Theme
// =============================================================================

/**
 * Custom dark theme matching our Spotify-inspired design
 */
const MusicPlayerTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundElevated,
    text: Colors.textPrimary,
    border: Colors.surfaceBorder,
    notification: Colors.primary,
  },
};

// =============================================================================
// Root Layout Component
// =============================================================================

export default function RootLayout() {
  // Load custom fonts
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Handle font loading errors
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Show nothing while loading
  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// =============================================================================
// Navigation Layout
// =============================================================================

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={MusicPlayerTheme}>
        <FavoritesProvider>
          <PlayerProvider>
            {/* Status bar configuration */}
            <StatusBar style="light" />
            
            {/* Main navigation stack */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_bottom',
              }}
            >
              {/* Main tabs */}
              <Stack.Screen 
                name="(tabs)" 
                options={{ headerShown: false }} 
              />
              
              {/* Full player modal */}
              <Stack.Screen 
                name="modal" 
                options={{ 
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: 'vertical',
                }} 
              />
              
              {/* Folder detail screen */}
              <Stack.Screen 
                name="folder/[id]" 
                options={{
                  animation: 'slide_from_right',
                }}
              />
              
              {/* Favorites screen */}
              <Stack.Screen 
                name="favorites" 
                options={{
                  animation: 'slide_from_right',
                }}
              />
              
              {/* Playlists screen */}
              <Stack.Screen 
                name="playlists" 
                options={{
                  animation: 'slide_from_right',
                }}
              />
              
              {/* Playlist detail screen */}
              <Stack.Screen 
                name="playlist/[id]" 
                options={{
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
          </PlayerProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

