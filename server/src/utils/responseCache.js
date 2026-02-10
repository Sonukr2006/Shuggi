/**
 * Response Cache - Caches responses to reduce API calls and improve latency
 * Production-grade caching system
 */

const CACHE_TTL = 86400000; // 24 hours
const MAX_CACHE_SIZE = 1000; // Max entries

class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.accessLog = [];
  }

  /**
   * Generate cache key from query
   */
  generateKey(query) {
    return query.toLowerCase().trim();
  }

  /**
   * Get cached response
   */
  get(query) {
    const key = this.generateKey(query);
    
    if (!this.cache.has(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    
    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access metadata
    entry.hits++;
    entry.lastAccessed = Date.now();
    
    return entry.response;
  }

  /**
   * Set cache entry
   */
  set(query, response, metadata = {}) {
    const key = this.generateKey(query);

    // Enforce cache size limit
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      hits: 0,
      metadata,
    });
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let lruKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let totalEntries = this.cache.size;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      totalEntries,
      totalHits,
      cacheHitRate: totalEntries > 0 ? (totalHits / (totalHits + totalEntries)).toFixed(2) : 0,
      maxSize: MAX_CACHE_SIZE,
    };
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const responseCache = new ResponseCache();

// Periodically clear expired entries
setInterval(() => {
  responseCache.clearExpired();
}, 3600000); // Every hour
