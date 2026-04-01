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

  const cacheKey = `${uri}:${maxSize}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  if (!ArtworkModule) return null;

  const request = (async () => {
    try {
      const result = await ArtworkModule.getArtwork(uri, maxSize);
      if (result) {
        evictOldest();
        memoryCache.set(cacheKey, result);
      }
      return result;
    } catch (_e) {
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, request);
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
  if (!uri) return null;
  for (const [key, value] of memoryCache) {
    if (key.startsWith(uri + ':')) return value;
  }
  return null;
}

export function clearArtworkCache() {
  memoryCache.clear();
  if (ArtworkModule) {
    ArtworkModule.clearCache().catch(() => {});
  }
}
