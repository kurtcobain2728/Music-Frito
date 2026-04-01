export interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  syncedLyrics: string | null;
  plainLyrics: string | null;
}

const LRCLIB_BASE = 'https://lrclib.net/api';

export async function searchLyrics(
  title: string,
  artist?: string,
  album?: string,
  duration?: number,
): Promise<LrcLibResult[]> {
  try {
    const params = new URLSearchParams();
    params.set('track_name', title);
    if (artist && artist !== 'Unknown Artist') params.set('artist_name', artist);
    if (album) params.set('album_name', album);
    if (duration && duration > 0) params.set('duration', Math.round(duration / 1000).toString());

    const response = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`, {
      headers: { 'User-Agent': 'FritoMusic/1.0' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (_e) {
    return [];
  }
}

export async function getLyricsByGet(
  title: string,
  artist: string,
  album?: string,
  duration?: number,
): Promise<LrcLibResult | null> {
  try {
    const params = new URLSearchParams();
    params.set('track_name', title);
    params.set('artist_name', artist);
    if (album) params.set('album_name', album);
    if (duration && duration > 0) params.set('duration', Math.round(duration / 1000).toString());

    const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
      headers: { 'User-Agent': 'FritoMusic/1.0' },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (_e) {
    return null;
  }
}
