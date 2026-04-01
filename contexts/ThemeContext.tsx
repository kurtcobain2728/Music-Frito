import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, View, ActivityIndicator, StyleSheet } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'crystal' | 'auto';
export type AccentColor = 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'custom';

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  backgroundHighlight: string;
  backgroundPressed: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  border: string;
  divider: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  progressBar: string;
  progressBarFill: string;
  sliderThumb: string;
  playerBackground: string;
  gradientStart: string;
  gradientEnd: string;
  blurTint: 'light' | 'dark' | 'default';
  blurIntensity: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  accentColor: AccentColor;
  customAccentColor?: string;
  isDark: boolean;
  isBlurred: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor, customColor?: string) => void;
  toggleTheme: () => void;
}

const ACCENT_COLORS: Record<AccentColor, string> = {
  green: '#1DB954',
  blue: '#1E88E5',
  purple: '#9C27B0',
  pink: '#E91E63',
  orange: '#FF9800',
  red: '#F44336',
  custom: '#1DB954',
};

const HEX_REGEX = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function adjustColor(color: string, amount: number): string {
  if (!HEX_REGEX.test(color)) return color;
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) return color;
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function makeDarkColors(primary: string): ThemeColors {
  return {
    background: '#121212',
    backgroundElevated: '#181818',
    backgroundHighlight: '#282828',
    backgroundPressed: '#333333',
    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textMuted: '#6A6A6A',
    textDisabled: '#404040',
    primary,
    primaryDark: adjustColor(primary, -20),
    primaryLight: adjustColor(primary, 20),
    border: '#2A2A2A',
    divider: '#2A2A2A',
    error: '#FF4444',
    success: primary,
    warning: '#FFAA00',
    info: '#4688F1',
    surface: '#1E1E1E',
    surfaceLight: '#242424',
    surfaceBorder: '#2A2A2A',
    progressBar: '#535353',
    progressBarFill: primary,
    sliderThumb: '#FFFFFF',
    playerBackground: '#0D0D0D',
    gradientStart: primary,
    gradientEnd: '#121212',
    blurTint: 'dark',
    blurIntensity: 80,
  };
}

function makeLightColors(primary: string): ThemeColors {
  return {
    background: '#FFFFFF',
    backgroundElevated: '#F5F5F5',
    backgroundHighlight: '#EEEEEE',
    backgroundPressed: '#E0E0E0',
    textPrimary: '#111111',
    textSecondary: '#555555',
    textMuted: '#999999',
    textDisabled: '#CCCCCC',
    primary,
    primaryDark: adjustColor(primary, -25),
    primaryLight: adjustColor(primary, 25),
    border: '#E0E0E0',
    divider: '#E8E8E8',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#F57C00',
    info: '#1976D2',
    surface: '#FAFAFA',
    surfaceLight: '#F0F0F0',
    surfaceBorder: '#E0E0E0',
    progressBar: '#D0D0D0',
    progressBarFill: primary,
    sliderThumb: '#FFFFFF',
    playerBackground: '#F5F5F5',
    gradientStart: primary,
    gradientEnd: '#FFFFFF',
    blurTint: 'light',
    blurIntensity: 80,
  };
}

function makeCrystalColors(primary: string): ThemeColors {
  return {
    background: 'rgba(15, 15, 20, 0.65)',
    backgroundElevated: 'rgba(255, 255, 255, 0.08)',
    backgroundHighlight: 'rgba(255, 255, 255, 0.12)',
    backgroundPressed: 'rgba(255, 255, 255, 0.18)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.70)',
    textMuted: 'rgba(255, 255, 255, 0.40)',
    textDisabled: 'rgba(255, 255, 255, 0.20)',
    primary: primary || '#007AFF',
    primaryDark: adjustColor(primary || '#007AFF', -25),
    primaryLight: adjustColor(primary || '#007AFF', 25),
    border: 'rgba(255, 255, 255, 0.10)',
    divider: 'rgba(255, 255, 255, 0.08)',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    info: '#64D2FF',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceLight: 'rgba(255, 255, 255, 0.10)',
    surfaceBorder: 'rgba(255, 255, 255, 0.12)',
    progressBar: 'rgba(255, 255, 255, 0.10)',
    progressBarFill: primary || '#007AFF',
    sliderThumb: '#FFFFFF',
    playerBackground: 'rgba(10, 10, 15, 0.75)',
    gradientStart: primary || '#007AFF',
    gradientEnd: 'rgba(15, 15, 20, 0.65)',
    blurTint: 'dark',
    blurIntensity: 120,
  };
}

const STORAGE_KEYS = {
  THEME_MODE: '@frito_music/theme_mode',
  ACCENT_COLOR: '@frito_music/accent_color',
  CUSTOM_ACCENT: '@frito_music/custom_accent',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColorState] = useState<AccentColor>('green');
  const [customAccentColor, setCustomAccentColor] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedAccent, savedCustom] = await AsyncStorage.multiGet([
          STORAGE_KEYS.THEME_MODE,
          STORAGE_KEYS.ACCENT_COLOR,
          STORAGE_KEYS.CUSTOM_ACCENT,
        ]);
        if (savedMode[1]) setThemeModeState(savedMode[1] as ThemeMode);
        if (savedAccent[1]) setAccentColorState(savedAccent[1] as AccentColor);
        if (savedCustom[1]) setCustomAccentColor(savedCustom[1]);
      } catch (_e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (themeMode === 'auto') {
      const sub = Appearance.addChangeListener(({ colorScheme }) => {
        setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
      });
      return () => sub.remove();
    }
  }, [themeMode]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (mode === 'auto') {
      setSystemScheme(Appearance.getColorScheme() === 'light' ? 'light' : 'dark');
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (_e) {}
  }, []);

  const setAccentColor = useCallback(async (color: AccentColor, customColor?: string) => {
    setAccentColorState(color);
    if (customColor) setCustomAccentColor(customColor);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCENT_COLOR, color],
        [STORAGE_KEYS.CUSTOM_ACCENT, customColor || ''],
      ]);
    } catch (_e) {}
  }, []);

  const toggleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['dark', 'light', 'crystal', 'auto'];
    const idx = modes.indexOf(themeMode);
    setThemeMode(modes[(idx + 1) % modes.length]);
  }, [themeMode, setThemeMode]);

  const theme = useMemo((): Theme => {
    let effectiveMode: ThemeMode = themeMode;
    if (themeMode === 'auto') {
      effectiveMode = systemScheme;
    }

    const primaryColor = accentColor === 'custom' && customAccentColor
      ? customAccentColor
      : ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

    let colors: ThemeColors;
    switch (effectiveMode) {
      case 'light':
        colors = makeLightColors(primaryColor);
        break;
      case 'crystal':
        colors = makeCrystalColors(primaryColor);
        break;
      default:
        colors = makeDarkColors(primaryColor);
        break;
    }

    return {
      mode: effectiveMode,
      colors,
      accentColor,
      customAccentColor,
      isDark: effectiveMode === 'dark',
      isBlurred: effectiveMode === 'crystal',
    };
  }, [themeMode, accentColor, customAccentColor, systemScheme]);

  const ctx = useMemo<ThemeContextValue>(() => ({
    theme,
    setThemeMode,
    setAccentColor,
    toggleTheme,
  }), [theme, setThemeMode, setAccentColor, toggleTheme]);

  if (!loaded) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="small" color="#1DB954" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={ctx}>
      {children}
    </ThemeContext.Provider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
