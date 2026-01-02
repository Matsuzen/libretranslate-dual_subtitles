// Chrome Storage API wrapper for Dual Subtitles extension

class StorageManager {
  constructor() {
    this.storage = chrome.storage;
    this.sync = chrome.storage.sync;
    this.local = chrome.storage.local;
  }

  /**
   * Get a value from sync storage
   * @param {string|string[]} keys - Key(s) to retrieve
   * @returns {Promise<any>} - Retrieved value(s)
   */
  async get(keys) {
    try {
      const result = await this.sync.get(keys);
      if (typeof keys === 'string') {
        return result[keys];
      }
      return result;
    } catch (error) {
      window.DualSubsLogger?.error('Storage get error:', error);
      return typeof keys === 'string' ? undefined : {};
    }
  }

  /**
   * Set value(s) in sync storage
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async set(items) {
    try {
      await this.sync.set(items);
      window.DualSubsLogger?.debug('Storage set:', items);
    } catch (error) {
      window.DualSubsLogger?.error('Storage set error:', error);
      throw error;
    }
  }

  /**
   * Remove key(s) from sync storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      await this.sync.remove(keys);
      window.DualSubsLogger?.debug('Storage remove:', keys);
    } catch (error) {
      window.DualSubsLogger?.error('Storage remove error:', error);
      throw error;
    }
  }

  /**
   * Clear all sync storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.sync.clear();
      window.DualSubsLogger?.info('Storage cleared');
    } catch (error) {
      window.DualSubsLogger?.error('Storage clear error:', error);
      throw error;
    }
  }

  /**
   * Get value from local storage (for larger data like cache)
   * @param {string|string[]} keys - Key(s) to retrieve
   * @returns {Promise<any>} - Retrieved value(s)
   */
  async getLocal(keys) {
    try {
      const result = await this.local.get(keys);
      if (typeof keys === 'string') {
        return result[keys];
      }
      return result;
    } catch (error) {
      window.DualSubsLogger?.error('Local storage get error:', error);
      return typeof keys === 'string' ? undefined : {};
    }
  }

  /**
   * Set value(s) in local storage
   * @param {Object} items - Key-value pairs to store
   * @returns {Promise<void>}
   */
  async setLocal(items) {
    try {
      await this.local.set(items);
      window.DualSubsLogger?.debug('Local storage set');
    } catch (error) {
      window.DualSubsLogger?.error('Local storage set error:', error);
      throw error;
    }
  }

  /**
   * Remove key(s) from local storage
   * @param {string|string[]} keys - Key(s) to remove
   * @returns {Promise<void>}
   */
  async removeLocal(keys) {
    try {
      await this.local.remove(keys);
      window.DualSubsLogger?.debug('Local storage remove:', keys);
    } catch (error) {
      window.DualSubsLogger?.error('Local storage remove error:', error);
      throw error;
    }
  }

  /**
   * Clear all local storage
   * @returns {Promise<void>}
   */
  async clearLocal() {
    try {
      await this.local.clear();
      window.DualSubsLogger?.info('Local storage cleared');
    } catch (error) {
      window.DualSubsLogger?.error('Local storage clear error:', error);
      throw error;
    }
  }

  /**
   * Get all settings with defaults
   * @returns {Promise<Object>} - All settings
   */
  async getAllSettings() {
    const CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    const keys = Object.values(CONSTANTS.STORAGE_KEYS);
    const result = await this.get(keys);

    // Apply defaults for missing values
    const settings = {
      [CONSTANTS.STORAGE_KEYS.ENABLED]: result[CONSTANTS.STORAGE_KEYS.ENABLED] ?? CONSTANTS.DEFAULTS.ENABLED,
      [CONSTANTS.STORAGE_KEYS.SOURCE_LANG]: result[CONSTANTS.STORAGE_KEYS.SOURCE_LANG] ?? CONSTANTS.DEFAULTS.SOURCE_LANG,
      [CONSTANTS.STORAGE_KEYS.TARGET_LANG]: result[CONSTANTS.STORAGE_KEYS.TARGET_LANG] ?? CONSTANTS.DEFAULTS.TARGET_LANG,
      [CONSTANTS.STORAGE_KEYS.LAYOUT_MODE]: result[CONSTANTS.STORAGE_KEYS.LAYOUT_MODE] ?? CONSTANTS.DEFAULTS.LAYOUT_MODE,
      [CONSTANTS.STORAGE_KEYS.API_ENDPOINT]: result[CONSTANTS.STORAGE_KEYS.API_ENDPOINT] ?? CONSTANTS.DEFAULTS.API_ENDPOINT,
      [CONSTANTS.STORAGE_KEYS.DEBUG_MODE]: result[CONSTANTS.STORAGE_KEYS.DEBUG_MODE] ?? CONSTANTS.DEFAULTS.DEBUG_MODE,
      [CONSTANTS.STORAGE_KEYS.RECENT_LANGUAGES]: result[CONSTANTS.STORAGE_KEYS.RECENT_LANGUAGES] ?? []
    };

    return settings;
  }

  /**
   * Initialize storage with default settings if not set
   * @returns {Promise<void>}
   */
  async initializeDefaults() {
    const CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    const current = await this.getAllSettings();

    // Only set if values are missing
    const updates = {};
    if (current[CONSTANTS.STORAGE_KEYS.ENABLED] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.ENABLED] = CONSTANTS.DEFAULTS.ENABLED;
    }
    if (current[CONSTANTS.STORAGE_KEYS.SOURCE_LANG] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.SOURCE_LANG] = CONSTANTS.DEFAULTS.SOURCE_LANG;
    }
    if (current[CONSTANTS.STORAGE_KEYS.TARGET_LANG] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.TARGET_LANG] = CONSTANTS.DEFAULTS.TARGET_LANG;
    }
    if (current[CONSTANTS.STORAGE_KEYS.LAYOUT_MODE] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.LAYOUT_MODE] = CONSTANTS.DEFAULTS.LAYOUT_MODE;
    }
    if (current[CONSTANTS.STORAGE_KEYS.API_ENDPOINT] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.API_ENDPOINT] = CONSTANTS.DEFAULTS.API_ENDPOINT;
    }
    if (current[CONSTANTS.STORAGE_KEYS.DEBUG_MODE] === undefined) {
      updates[CONSTANTS.STORAGE_KEYS.DEBUG_MODE] = CONSTANTS.DEFAULTS.DEBUG_MODE;
    }

    if (Object.keys(updates).length > 0) {
      await this.set(updates);
      window.DualSubsLogger?.info('Initialized default settings');
    }
  }

  /**
   * Listen for storage changes
   * @param {Function} callback - Callback function(changes, areaName)
   */
  onChanged(callback) {
    chrome.storage.onChanged.addListener(callback);
  }
}

// Create global storage manager instance
const storageManager = new StorageManager();

// Make storage manager available globally
if (typeof window !== 'undefined') {
  window.DualSubsStorage = storageManager;
}
