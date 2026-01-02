// Subtitle queue manager for timing and synchronization

class SubtitleQueue {
  constructor() {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;

    // Current subtitle data
    this.currentSubtitle = {
      original: '',
      translated: '',
      timestamp: null
    };

    // Queue for pending subtitles
    this.queue = [];

    // Timeout tracking
    this.translationTimeout = null;
    this.clearTimeout = null;

    this.logger?.debug('Subtitle queue initialized');
  }

  /**
   * Add subtitle to queue
   * @param {string} text - Subtitle text
   * @param {number} timestamp - Subtitle timestamp
   * @returns {Promise<void>}
   */
  async addSubtitle(text, timestamp = Date.now()) {
    // Skip if same as current
    if (text === this.currentSubtitle.original) {
      return;
    }

    // Clear any existing timeout
    this.clearTimeouts();

    // Empty text means clear subtitle
    if (!text || text.trim().length === 0) {
      this.clearSubtitle();
      return;
    }

    this.logger?.debug('Adding subtitle to queue:', {
      text: text.substring(0, 50),
      timestamp
    });

    // Update current subtitle
    this.currentSubtitle.original = text;
    this.currentSubtitle.timestamp = timestamp;
    this.currentSubtitle.translated = ''; // Will be updated when translation completes

    // Show original immediately
    this.displaySubtitle(text, '');

    // Request translation
    this.requestTranslation(text, timestamp);
  }

  /**
   * Request translation for subtitle
   * @param {string} text - Text to translate
   * @param {number} timestamp - Original timestamp
   */
  async requestTranslation(text, timestamp) {
    const translationManager = window.DualSubsTranslationManager;

    // Set timeout to clear subtitle if translation takes too long
    this.translationTimeout = setTimeout(() => {
      if (this.currentSubtitle.timestamp === timestamp) {
        this.logger?.warn('Translation timeout, showing original only');
        // Keep showing original subtitle only
      }
    }, this.CONSTANTS.EXTRACTION.SUBTITLE_TIMEOUT);

    try {
      const translation = await translationManager.translate(text);

      // Clear timeout if translation completed
      clearTimeout(this.translationTimeout);

      // Only update if this is still the current subtitle
      if (this.currentSubtitle.timestamp === timestamp) {
        this.currentSubtitle.translated = translation;
        this.displaySubtitle(text, translation);

        this.logger?.debug('Translation completed:', {
          original: text.substring(0, 50),
          translated: translation.substring(0, 50)
        });
      } else {
        this.logger?.debug('Translation received but subtitle already changed');
      }

    } catch (error) {
      this.logger?.error('Translation failed:', error);
      clearTimeout(this.translationTimeout);

      // Show error or just original
      if (this.currentSubtitle.timestamp === timestamp) {
        this.displaySubtitle(text, '[Translation failed]');
      }
    }
  }

  /**
   * Display subtitle (delegates to renderer)
   * @param {string} original - Original subtitle text
   * @param {string} translated - Translated subtitle text
   */
  displaySubtitle(original, translated) {
    const renderer = window.DualSubsRenderer;
    if (renderer) {
      renderer.render(original, translated);
    }
  }

  /**
   * Clear current subtitle
   */
  clearSubtitle() {
    this.logger?.debug('Clearing subtitle');

    this.clearTimeouts();

    this.currentSubtitle = {
      original: '',
      translated: '',
      timestamp: null
    };

    const renderer = window.DualSubsRenderer;
    if (renderer) {
      renderer.clear();
    }
  }

  /**
   * Clear all timeouts
   */
  clearTimeouts() {
    if (this.translationTimeout) {
      clearTimeout(this.translationTimeout);
      this.translationTimeout = null;
    }
    if (this.clearTimeout) {
      clearTimeout(this.clearTimeout);
      this.clearTimeout = null;
    }
  }

  /**
   * Get current subtitle
   * @returns {Object} - Current subtitle data
   */
  getCurrentSubtitle() {
    return { ...this.currentSubtitle };
  }

  /**
   * Force update translation for current subtitle
   */
  async forceUpdate() {
    if (this.currentSubtitle.original) {
      await this.requestTranslation(
        this.currentSubtitle.original,
        this.currentSubtitle.timestamp
      );
    }
  }

  /**
   * Reset queue
   */
  reset() {
    this.clearSubtitle();
    this.queue = [];
    this.logger?.info('Subtitle queue reset');
  }

  /**
   * Get queue stats
   * @returns {Object} - Queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      currentSubtitle: this.currentSubtitle.original ? this.currentSubtitle.original.substring(0, 50) : null,
      hasTranslation: !!this.currentSubtitle.translated
    };
  }
}

// Create global subtitle queue instance
const subtitleQueue = new SubtitleQueue();

// Make subtitle queue available globally
if (typeof window !== 'undefined') {
  window.DualSubsQueue = subtitleQueue;
}
