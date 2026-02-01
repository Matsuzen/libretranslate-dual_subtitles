// Translation manager for LibreTranslate API integration

class TranslationManager {
  constructor() {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;
    this.cacheManager = window.DualSubsCacheManager;

    this.apiEndpoint = this.CONSTANTS.API.DEFAULT_ENDPOINT;
    this.sourceLang = this.CONSTANTS.DEFAULTS.SOURCE_LANG;
    this.targetLang = this.CONSTANTS.DEFAULTS.TARGET_LANG;

    // Request queue for rate limiting
    this.requestQueue = [];
    this.isProcessing = false;

    // Load settings
    this.loadSettings();
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'apiEndpoint',
        'sourceLang',
        'targetLang'
      ]);

      this.apiEndpoint = settings.apiEndpoint || this.CONSTANTS.API.DEFAULT_ENDPOINT;
      this.sourceLang = settings.sourceLang || this.CONSTANTS.DEFAULTS.SOURCE_LANG;
      this.targetLang = settings.targetLang || this.CONSTANTS.DEFAULTS.TARGET_LANG;

      this.logger?.debug('Translation settings loaded:', {
        apiEndpoint: this.apiEndpoint,
        sourceLang: this.sourceLang,
        targetLang: this.targetLang
      });
    } catch (error) {
      this.logger?.error('Failed to load translation settings:', error);
    }
  }

  /**
   * Update translation settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    if (settings.apiEndpoint !== undefined) {
      this.apiEndpoint = settings.apiEndpoint;
    }
    if (settings.sourceLang !== undefined) {
      this.sourceLang = settings.sourceLang;
    }
    if (settings.targetLang !== undefined) {
      this.targetLang = settings.targetLang;
    }

    this.logger?.info('Translation settings updated:', {
      apiEndpoint: this.apiEndpoint,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang
    });
  }

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language (optional, uses settings if not provided)
   * @param {string} targetLang - Target language (optional, uses settings if not provided)
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLang = null, targetLang = null) {
    if (!text || text.trim().length === 0) {
      return '';
    }

    const source = sourceLang || this.sourceLang;
    const target = targetLang || this.targetLang;

    // If source and target are the same, return original
    if (source === target && source !== 'auto') {
      return text;
    }

    this.logger?.time('Translation');

    // Check cache first
    const cached = await this.cacheManager.get(text, source, target);
    if (cached) {
      this.logger?.debug('Using cached translation');
      this.logger?.timeEnd('Translation');
      return cached;
    }

    // Queue the translation request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        text,
        sourceLang: source,
        targetLang: target,
        resolve,
        reject,
        retries: 0
      });

      this.processQueue();
    });
  }

  /**
   * Process translation request queue
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const request = this.requestQueue.shift();

    try {
      this.logger?.debug('Processing translation request:', {
        text: request.text.substring(0, 50),
        sourceLang: request.sourceLang,
        targetLang: request.targetLang
      });

      const translation = await this.performTranslation(
        request.text,
        request.sourceLang,
        request.targetLang
      );

      // Cache the result
      await this.cacheManager.set(
        request.text,
        request.sourceLang,
        request.targetLang,
        translation
      );

      this.logger?.timeEnd('Translation');
      request.resolve(translation);

    } catch (error) {
      this.logger?.error('Translation error:', error);

      // Retry logic
      if (request.retries < this.CONSTANTS.API.RETRY_ATTEMPTS) {
        request.retries++;
        this.logger?.warn(`Retrying translation (attempt ${request.retries})`);

        // Re-queue the request
        setTimeout(() => {
          this.requestQueue.unshift(request);
          this.isProcessing = false;
          this.processQueue();
        }, this.CONSTANTS.API.RETRY_DELAY);

        return;
      } else {
        this.logger?.error('Translation failed after max retries');
        request.reject(error);
      }

    } finally {
      // Process next request after rate limit delay
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, this.CONSTANTS.API.RATE_LIMIT_DELAY);
    }
  }

  /**
   * Perform actual translation via background script (to avoid CORS)
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {Promise<string>} - Translated text
   */
  async performTranslation(text, sourceLang, targetLang) {
    try {
      // Use background script to make the request (avoids CORS issues)
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        data: {
          text,
          sourceLang,
          targetLang,
          apiEndpoint: this.apiEndpoint
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.translatedText) {
        throw new Error('Invalid response from translation API');
      }

      return response.translatedText;

    } catch (error) {
      // If background script fails, try direct request
      this.logger?.warn('Background translation failed, trying direct request:', error);
      return await this.performDirectTranslation(text, sourceLang, targetLang);
    }
  }

  /**
   * Perform direct translation (may have CORS issues)
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {Promise<string>} - Translated text
   */
  async performDirectTranslation(text, sourceLang, targetLang) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.CONSTANTS.API.TIMEOUT);

    try {
      const response = await fetch(`${this.apiEndpoint}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.translatedText) {
        throw new Error('Invalid response format');
      }

      return data.translatedText;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Translation request timed out');
      }

      throw error;
    }
  }

  /**
   * Get available languages from API
   * @returns {Promise<Array>} - Array of language objects
   */
  async getAvailableLanguages() {
    try {
      const response = await fetch(`${this.apiEndpoint}/languages`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const languages = await response.json();
      this.logger?.debug('Available languages:', languages);

      return languages;

    } catch (error) {
      this.logger?.error('Failed to fetch available languages:', error);
      // Return fallback language list
      return this.CONSTANTS.LANGUAGES;
    }
  }

  /**
   * Test API endpoint connectivity
   * @returns {Promise<boolean>} - True if API is accessible
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.apiEndpoint}/languages`, {
        method: 'GET'
      });

      return response.ok;

    } catch (error) {
      this.logger?.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Clear request queue
   */
  clearQueue() {
    const queueLength = this.requestQueue.length;
    this.requestQueue = [];
    this.logger?.info(`Cleared ${queueLength} pending translation requests`);
  }

  /**
   * Get queue stats
   * @returns {Object} - Queue statistics
   */
  getQueueStats() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// Create global translation manager instance
const translationManager = new TranslationManager();

// Make translation manager available globally
if (typeof window !== 'undefined') {
  window.DualSubsTranslationManager = translationManager;
}
