import { Platform } from 'react-native';

interface PaletteColors {
  dominant?: string;
  vibrant?: string;
  muted?: string;
  darkVibrant?: string;
  darkMuted?: string;
  lightVibrant?: string;
}

interface IMediaServiceModule {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  updateMetadata(
    title: string,
    artist: string,
    album: string,
    durationMs: number,
    trackUri: string | null,
  ): Promise<boolean>;
  updatePlaybackState(playing: boolean, positionMs: number): Promise<boolean>;
  extractPalette(trackUri: string): Promise<PaletteColors>;
  extractPaletteFromBase64(base64Data: string): Promise<PaletteColors>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

let MediaServiceModule: IMediaServiceModule | null = null;

if (Platform.OS === 'android') {
  try {
    const ExpoModulesCore = require('expo-modules-core');
    if (ExpoModulesCore && ExpoModulesCore.requireNativeModule) {
      MediaServiceModule = ExpoModulesCore.requireNativeModule('MediaServiceModule');
    }
  } catch (_e) {
    MediaServiceModule = null;
  }

  if (!MediaServiceModule) {
    try {
      const { NativeModules } = require('react-native');
      if (NativeModules && NativeModules.MediaServiceModule) {
        MediaServiceModule = NativeModules.MediaServiceModule;
      }
    } catch (_e2) {
      MediaServiceModule = null;
    }
  }
}

export default MediaServiceModule;
export type { IMediaServiceModule, PaletteColors };
