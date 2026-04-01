import MediaServiceModule from '@/modules/media-service';
import { useTheme, type AdaptivePalette } from '@/contexts/ThemeContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { getCachedArtwork } from '@/utils/artworkCache';
import { useEffect, useRef } from 'react';

export function useAdaptivePalette() {
  const { theme, setAdaptivePalette } = useTheme();
  const { state } = usePlayer();
  const prevTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!theme.isAdaptive) return;

    const trackId = state.currentTrack?.id ?? null;
    if (!trackId || trackId === prevTrackIdRef.current) return;
    prevTrackIdRef.current = trackId;

    const trackUri = state.currentTrack?.uri;
    if (!trackUri) return;

    let cancelled = false;

    const extract = async () => {
      if (!MediaServiceModule) return;

      try {
        const cachedBase64 = getCachedArtwork(trackUri);
        let colors;

        if (cachedBase64) {
          colors = await MediaServiceModule.extractPaletteFromBase64(cachedBase64);
        } else {
          colors = await MediaServiceModule.extractPalette(trackUri);
        }

        if (cancelled) return;

        if (colors && Object.keys(colors).length > 0) {
          const palette: AdaptivePalette = {
            dominant: colors.dominant || '#1a1a2e',
            vibrant: colors.vibrant || colors.dominant || '#1DB954',
            muted: colors.muted || colors.dominant || '#333333',
            darkVibrant: colors.darkVibrant || colors.dominant || '#0d0d1a',
            darkMuted: colors.darkMuted || '#1a1a2e',
            lightVibrant: colors.lightVibrant || '#cccccc',
          };
          setAdaptivePalette(palette);
        }
      } catch (_e) {}
    };

    extract();

    return () => {
      cancelled = true;
    };
  }, [state.currentTrack?.id, theme.isAdaptive, setAdaptivePalette]);
}
