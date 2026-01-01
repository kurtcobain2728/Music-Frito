/**
 * Tabs Layout
 * Bottom tab navigation with Home, Library, Search, More icons
 * Adapted for both gesture and button navigation modes
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Layout, Shadows } from '@/constants/theme';
import { MiniPlayer } from '@/components/MiniPlayer';

// =============================================================================
// Tab Bar Icon Component
// =============================================================================

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}

function TabBarIcon({ name, color, focused }: TabBarIconProps) {
  return (
    <Ionicons 
      name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap} 
      size={22} 
      color={color} 
    />
  );
}

// =============================================================================
// Tabs Layout Component
// =============================================================================

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height including safe area for button navigation
  const tabBarHeight = Layout.tabBarHeight + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <View style={styles.container}>
      {/* Tab Navigator */}
      <Tabs
        screenOptions={{
          // Header styling
          headerShown: false,
          
          // Tab bar styling
          tabBarActiveTintColor: Colors.textPrimary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: [
            styles.tabBar, 
            { 
              height: tabBarHeight,
              paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 8,
            }
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          
          // Background
          tabBarBackground: () => (
            <View style={styles.tabBarBackground} />
          ),
        }}
      >
        {/* Home Tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="home" color={color} focused={focused} />
            ),
          }}
        />
        
        {/* Library Tab */}
        <Tabs.Screen
          name="library"
          options={{
            title: 'Biblioteca',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="library" color={color} focused={focused} />
            ),
          }}
        />
        
        {/* Search Tab */}
        <Tabs.Screen
          name="search"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="search" color={color} focused={focused} />
            ),
          }}
        />
        
        {/* More Tab */}
        <Tabs.Screen
          name="more"
          options={{
            title: 'Más',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="ellipsis-horizontal" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
      
      {/* Mini Player - Fixed at bottom above tab bar */}
      <MiniPlayer />
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
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 6,
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    opacity: 0.98,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});

