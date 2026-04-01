import { Platform } from 'react-native';

interface EQBandResult {
  band: number;
  centerFreq: number;
  level: number;
}

interface InitResult {
  bands: EQBandResult[];
  minLevel: number;
  maxLevel: number;
  presets: string[];
  numBands: number;
  sessionId?: number;
}

interface ReattachResult {
  bands: EQBandResult[];
  sessionId: number;
  enabled: boolean;
}

interface IEqualizerModule {
  initialize(audioSessionId: number): Promise<InitResult>;
  reattach(): Promise<ReattachResult>;
  setEnabled(enabled: boolean): Promise<boolean>;
  setBandLevel(band: number, level: number): Promise<number>;
  applyNativePreset(presetIndex: number): Promise<EQBandResult[]>;
  release(): Promise<boolean>;
}

let EqualizerModule: IEqualizerModule | null = null;

if (Platform.OS === 'android') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    EqualizerModule = requireNativeModule('EqualizerModule');
  } catch (_e) {
    try {
      const { NativeModules } = require('react-native');
      EqualizerModule = NativeModules.EqualizerModule;
    } catch (_e2) {
      EqualizerModule = null;
    }
  }
}

export default EqualizerModule;
export type { IEqualizerModule, InitResult, ReattachResult, EQBandResult };
