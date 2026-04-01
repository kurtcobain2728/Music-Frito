import ArtworkModule from '@/modules/artwork';

const memoryCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();
const MAX_CACHE = 200;

function evictOldest() {
  if (memoryCache.size > MAX_CACHE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
}

export async function getArtwork(uri: string, maxSize = 300): Promise<string | null> {
  if (!uri) return null;

  const cached = memoryCache.get(uri);
  if (cached) return cached;

  const pending = pendingRequests.get(uri);
  if (pending) return pending;

  if (!ArtworkModule) return null;

  const request = (async () => {
    try {
      const result = await ArtworkModule.getArtwork(uri, maxSize);
      if (result) {
        evictOldest();
        memoryCache.set(uri, result);
      }
      return result;
    } catch (_e) {
      return null;
    } finally {
      pendingRequests.delete(uri);
    }
  })();

  pendingRequests.set(uri, request);
  return request;
}

export async function getMetadata(uri: string) {
  if (!ArtworkModule || !uri) return null;
  try {
    return await ArtworkModule.getMetadata(uri);
  } catch (_e) {
    return null;
  }
}

export function getCachedArtwork(uri: string): string | null {
  return memoryCache.get(uri) || null;
}

export function clearArtworkCache() {
  memoryCache.clear();
  if (ArtworkModule) {
    ArtworkModule.clearCache().catch(() => {});
  }
}
