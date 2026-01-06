type CachedData<T> = {
  data: T;
  timestamp: number;
  version: number;
};

const CACHE_VERSION = 1;
const CACHE_KEYS = {
  MODELS: "bobrchat_models_cache",
} as const;

/**
 * Check if a cached entry is still fresh (within TTL)
 */
function isCacheFresh<T>(cached: CachedData<T> | null, ttlMs: number): boolean {
  if (!cached)
    return false;
  if (cached.version !== CACHE_VERSION)
    return false;
  const now = Date.now();
  return now - cached.timestamp < ttlMs;
}

/**
 * Get cached models from localStorage
 * @returns Cached data or null if cache doesn't exist/is stale
 */
export function getCachedModels<T>(): {
  data: T | null;
  isFresh: boolean;
} {
  if (typeof window === "undefined") {
    return { data: null, isFresh: false };
  }

  try {
    const cached = localStorage.getItem(CACHE_KEYS.MODELS);
    if (!cached) {
      return { data: null, isFresh: false };
    }

    const parsed: CachedData<T> = JSON.parse(cached);

    // 24 hour TTL
    const TTL_MS = 24 * 60 * 60 * 1000;
    const fresh = isCacheFresh(parsed, TTL_MS);

    return {
      data: parsed.data,
      isFresh: fresh,
    };
  }
  catch (error) {
    console.error("[ModelCache] Failed to retrieve cache:", error);
    return { data: null, isFresh: false };
  }
}

/**
 * Set models in localStorage cache
 */
export function setCachedModels<T>(data: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_KEYS.MODELS, JSON.stringify(cacheData));
  }
  catch (error) {
    console.error("[ModelCache] Failed to set cache:", error);
  }
}

/**
 * Clear models cache
 */
export function clearModelCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEYS.MODELS);
  }
  catch (error) {
    console.error("[ModelCache] Failed to clear cache:", error);
  }
}
