import { Platform } from 'react-native';

interface AudioMetadata {
  bitrate: number | null;
  sampleRate: number | null;
  mimeType: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  hasArtwork: boolean;
}

interface ArtworkBatchResult {
  uri: string;
  artwork: string | null;
}

interface IArtworkModule {
  getArtwork(uri: string, maxSize: number): Promise<string | null>;
  getMetadata(uri: string): Promise<AudioMetadata>;
  getArtworkBatch(uris: string[], maxSize: number): Promise<ArtworkBatchResult[]>;
  clearCache(): Promise<boolean>;
}

let ArtworkModule: IArtworkModule | null = null;

if (Platform.OS === 'android') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    ArtworkModule = requireNativeModule('ArtworkModule');
  } catch (_e) {
    try {
      const { NativeModules } = require('react-native');
      ArtworkModule = NativeModules.ArtworkModule;
    } catch (_e2) {
      ArtworkModule = null;
    }
  }
}

export default ArtworkModule;
export type { IArtworkModule, AudioMetadata, ArtworkBatchResult };
