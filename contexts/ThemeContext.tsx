import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, View, ActivityIndicator, StyleSheet } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'adaptive' | 'auto';
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
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  accentColor: AccentColor;
  customAccentColor?: string;
  isDark: boolean;
  isAdaptive: boolean;
  adaptivePalette: AdaptivePalette | null;
}

export interface AdaptivePalette {
  dominant: string;
  vibrant: string;
  muted: string;
  darkVibrant: string;
  darkMuted: string;
  lightVibrant: string;
}

interface ThemeContextValue {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor, customColor?: string) => void;
  toggleTheme: () => void;
  setAdaptivePalette: (palette: AdaptivePalette | null) => void;
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
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
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
  };
}

function makeAdaptiveColors(palette: AdaptivePalette | null, fallbackPrimary: string): ThemeColors {
  const dom = palette?.dominant || fallbackPrimary;
  const vib = palette?.vibrant || dom;
  const darkMuted = palette?.darkMuted || '#1a1a2e';
  const lightVib = palette?.lightVibrant || adjustColor(dom, 60);

  const bgLum = luminance(darkMuted);
  const textColor = bgLum > 128 ? '#111111' : '#FFFFFF';
  const textSecondary = bgLum > 128 ? '#444444' : '#CCCCCC';
  const textMuted = bgLum > 128 ? '#777777' : '#888888';

  return {
    background: adjustColor(darkMuted, -30),
    backgroundElevated: adjustColor(darkMuted, -10),
    backgroundHighlight: adjustColor(darkMuted, 20),
    backgroundPressed: adjustColor(darkMuted, 35),
    textPrimary: textColor,
    textSecondary,
    textMuted,
    textDisabled: adjustColor(textMuted, -40),
    primary: vib,
    primaryDark: adjustColor(vib, -25),
    primaryLight: lightVib,
    border: adjustColor(darkMuted, 25),
    divider: adjustColor(darkMuted, 15),
    error: '#FF4444',
    success: vib,
    warning: '#FFAA00',
    info: '#4688F1',
    surface: adjustColor(darkMuted, 5),
    surfaceLight: adjustColor(darkMuted, 15),
    surfaceBorder: adjustColor(darkMuted, 25),
    progressBar: adjustColor(darkMuted, 35),
    progressBarFill: vib,
    sliderThumb: '#FFFFFF',
    playerBackground: adjustColor(darkMuted, -40),
    gradientStart: dom,
    gradientEnd: adjustColor(darkMuted, -30),
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
  const [adaptivePalette, setAdaptivePaletteState] = useState<AdaptivePalette | null>(null);
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark',
  );

  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedAccent, savedCustom] = await AsyncStorage.multiGet([
          STORAGE_KEYS.THEME_MODE,
          STORAGE_KEYS.ACCENT_COLOR,
          STORAGE_KEYS.CUSTOM_ACCENT,
        ]);
        if (savedMode[1]) {
          const validModes: ThemeMode[] = ['light', 'dark', 'adaptive', 'auto'];
          const mode = savedMode[1] as string;
          setThemeModeState(validModes.includes(mode as ThemeMode) ? (mode as ThemeMode) : 'dark');
        }
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
    const modes: ThemeMode[] = ['dark', 'light', 'adaptive', 'auto'];
    const idx = modes.indexOf(themeMode);
    setThemeMode(modes[(idx + 1) % modes.length]);
  }, [themeMode, setThemeMode]);

  const setAdaptivePalette = useCallback((palette: AdaptivePalette | null) => {
    setAdaptivePaletteState(palette);
  }, []);

  const theme = useMemo((): Theme => {
    let effectiveMode: ThemeMode = themeMode;
    if (themeMode === 'auto') {
      effectiveMode = systemScheme;
    }

    const primaryColor =
      accentColor === 'custom' && customAccentColor
        ? customAccentColor
        : ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

    let colors: ThemeColors;
    switch (effectiveMode) {
      case 'light':
        colors = makeLightColors(primaryColor);
        break;
      case 'adaptive':
        colors = makeAdaptiveColors(adaptivePalette, primaryColor);
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
      isDark: effectiveMode === 'dark' || effectiveMode === 'adaptive',
      isAdaptive: effectiveMode === 'adaptive',
      adaptivePalette,
    };
  }, [themeMode, accentColor, customAccentColor, systemScheme, adaptivePalette]);

  const ctx = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setThemeMode,
      setAccentColor,
      toggleTheme,
      setAdaptivePalette,
    }),
    [theme, setThemeMode, setAccentColor, toggleTheme, setAdaptivePalette],
  );

  if (!loaded) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="small" color="#1DB954" />
      </View>
    );
  }

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
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
