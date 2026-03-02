type CacheEntry<T> = {
  data: T;
  expiry: number;
};

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set a value in the cache
   * @param key Unique key for the cache entry
   * @param data Data to store
   * @param ttl Time-To-Live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get a value from the cache
   * @param key Unique key for the cache entry
   * @returns Data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear a specific key or the entire cache
   * @param key Optional key to clear. If omitted, clears entire cache.
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Global singleton instance
export const globalCache = new MemoryCache();
export default globalCache;
