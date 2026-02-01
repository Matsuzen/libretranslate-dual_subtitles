// Two-tier cache manager for translation results

class CacheManager {
  constructor() {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;

    // Memory cache (fast, limited size)
    this.memoryCache = new Map();
    this.memoryCacheKeys = []; // For LRU tracking

    // Storage cache (slower, larger capacity)
    this.storageCacheLoaded = false;
    this.storageCache = new Map();

    // Initialize
    this.init();
  }

  async init() {
    await this.loadStorageCache();
    this.startCleanupTimer();
    this.logger?.debug('Cache manager initialized');
  }

  /**
   * Load cache from chrome.storage.local
   */
  async loadStorageCache() {
    try {
      const data = await chrome.storage.local.get(['cacheData']);
      if (data.cacheData) {
        this.storageCache = new Map(Object.entries(data.cacheData));
        this.logger?.info(`Loaded ${this.storageCache.size} entries from storage cache`);
      }
      this.storageCacheLoaded = true;
    } catch (error) {
      this.logger?.error('Failed to load storage cache:', error);
      this.storageCacheLoaded = true;
    }
  }

  /**
   * Save cache to chrome.storage.local
   */
  async saveStorageCache() {
    try {
      const cacheData = Object.fromEntries(this.storageCache);
      await chrome.storage.local.set({ cacheData });
      this.logger?.debug(`Saved ${this.storageCache.size} entries to storage cache`);
    } catch (error) {
      this.logger?.error('Failed to save storage cache:', error);
    }
  }

  /**
   * Generate cache key from text and language pair
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {string} - Cache key
   */
  generateKey(text, sourceLang, targetLang) {
    const normalized = text.toLowerCase().trim();
    const hash = this.hashString(normalized);
    return `${sourceLang}-${targetLang}-${hash}`;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} - Hash string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached translation
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {Promise<string|null>} - Cached translation or null
   */
  async get(text, sourceLang, targetLang) {
    const key = this.generateKey(text, sourceLang, targetLang);

    // Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);

      // Check if expired
      if (this.isExpired(entry.timestamp)) {
        this.memoryCache.delete(key);
        this.logger?.debug('Memory cache entry expired:', key);
      } else {
        // Update LRU
        this.updateLRU(key);
        this.logger?.debug('Memory cache hit:', key);
        return entry.translation;
      }
    }

    // Check storage cache (slower)
    if (!this.storageCacheLoaded) {
      await this.loadStorageCache();
    }

    if (this.storageCache.has(key)) {
      const entry = this.storageCache.get(key);

      // Check if expired
      if (this.isExpired(entry.timestamp)) {
        this.storageCache.delete(key);
        await this.saveStorageCache();
        this.logger?.debug('Storage cache entry expired:', key);
      } else {
        // Promote to memory cache
        this.setMemoryCache(key, entry.translation, entry.timestamp);
        this.logger?.debug('Storage cache hit:', key);
        return entry.translation;
      }
    }

    this.logger?.debug('Cache miss:', key);
    return null;
  }

  /**
   * Set cached translation
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string} translation - Translated text
   */
  async set(text, sourceLang, targetLang, translation) {
    const key = this.generateKey(text, sourceLang, targetLang);
    const timestamp = Date.now();

    // Set in memory cache
    this.setMemoryCache(key, translation, timestamp);

    // Set in storage cache
    this.setStorageCache(key, translation, timestamp);

    // Periodically save to chrome.storage
    await this.saveStorageCache();

    this.logger?.debug('Cached translation:', key);
  }

  /**
   * Set entry in memory cache with LRU eviction
   * @param {string} key - Cache key
   * @param {string} translation - Translation
   * @param {number} timestamp - Timestamp
   */
  setMemoryCache(key, translation, timestamp) {
    // Add to cache
    this.memoryCache.set(key, { translation, timestamp });

    // Update LRU
    this.updateLRU(key);

    // Evict oldest if over limit
    while (this.memoryCacheKeys.length > this.CONSTANTS.CACHE.MEMORY_SIZE) {
      const oldestKey = this.memoryCacheKeys.shift();
      this.memoryCache.delete(oldestKey);
      this.logger?.debug('Evicted from memory cache:', oldestKey);
    }
  }

  /**
   * Set entry in storage cache with LRU eviction
   * @param {string} key - Cache key
   * @param {string} translation - Translation
   * @param {number} timestamp - Timestamp
   */
  setStorageCache(key, translation, timestamp) {
    this.storageCache.set(key, { translation, timestamp });

    // Evict oldest if over limit
    if (this.storageCache.size > this.CONSTANTS.CACHE.STORAGE_SIZE) {
      // Find oldest entry
      let oldestKey = null;
      let oldestTime = Infinity;

      for (const [k, entry] of this.storageCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.storageCache.delete(oldestKey);
        this.logger?.debug('Evicted from storage cache:', oldestKey);
      }
    }
  }

  /**
   * Update LRU tracking
   * @param {string} key - Cache key
   */
  updateLRU(key) {
    // Remove from current position
    const index = this.memoryCacheKeys.indexOf(key);
    if (index > -1) {
      this.memoryCacheKeys.splice(index, 1);
    }

    // Add to end (most recently used)
    this.memoryCacheKeys.push(key);
  }

  /**
   * Check if cache entry is expired
   * @param {number} timestamp - Entry timestamp
   * @returns {boolean} - True if expired
   */
  isExpired(timestamp) {
    const ttlMs = this.CONSTANTS.CACHE.TTL_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > ttlMs;
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    this.memoryCache.clear();
    this.memoryCacheKeys = [];
    this.storageCache.clear();
    await chrome.storage.local.remove(['cacheData']);
    this.logger?.info('All caches cleared');
  }

  /**
   * Clear expired entries
   */
  async clearExpired() {
    let expiredCount = 0;

    // Clear expired from memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry.timestamp)) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }

    // Clear expired from storage cache
    for (const [key, entry] of this.storageCache.entries()) {
      if (this.isExpired(entry.timestamp)) {
        this.storageCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      await this.saveStorageCache();
      this.logger?.info(`Cleared ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.clearExpired();
    }, this.CONSTANTS.CACHE.CLEANUP_INTERVAL);

    this.logger?.debug('Cache cleanup timer started');
  }

  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      storageSize: this.storageCache.size,
      memoryLimit: this.CONSTANTS.CACHE.MEMORY_SIZE,
      storageLimit: this.CONSTANTS.CACHE.STORAGE_SIZE
    };
  }
}

// Create global cache manager instance
const cacheManager = new CacheManager();

// Make cache manager available globally
if (typeof window !== 'undefined') {
  window.DualSubsCacheManager = cacheManager;
}
