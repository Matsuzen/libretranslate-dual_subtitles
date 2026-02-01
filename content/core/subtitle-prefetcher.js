// Subtitle Pre-fetcher for Netflix
// Pre-translates subtitles 5 seconds ahead of playback to warm the cache

class SubtitlePrefetcher {
  constructor() {
    this.logger = window.DualSubsLogger;
    this.parser = null;
    this.translationManager = null;
    this.cacheManager = null;

    // Parsed subtitles from TTML
    this.subtitles = [];

    // Track what we've already translated
    this.translatedTexts = new Set();

    // Video element and state
    this.video = null;
    this.isPlaying = false;
    this.syncInterval = null;

    // Initialization flags
    this.initialized = false;
    this.messageListenerAdded = false;
    this.videoListenersAdded = false;

    // Bound event handlers (for removal)
    this.boundOnPlay = this.onPlay.bind(this);
    this.boundOnPause = this.onPause.bind(this);
    this.boundOnSeeking = this.onSeeking.bind(this);

    // Settings
    this.LOOKAHEAD_MS = 5000; // Translate 5 seconds ahead
    this.SYNC_INTERVAL_MS = 500; // Check every 500ms
  }

  /**
   * Initialize the pre-fetcher
   */
  init() {
    // Prevent multiple initializations
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    this.parser = window.DualSubsTTMLParser;
    this.translationManager = window.DualSubsTranslationManager;
    this.cacheManager = window.DualSubsCacheManager;

    if (!this.parser) {
      this.logger?.error('TTMLParser not available');
      return;
    }

    this.logger?.info('SubtitlePrefetcher initialized (5s lookahead mode)');

    // Listen for subtitle data from background script
    this.setupMessageListener();
  }

  /**
   * Set up message listener for subtitle data from background
   */
  setupMessageListener() {
    // Prevent adding multiple listeners
    if (this.messageListenerAdded) {
      return;
    }
    this.messageListenerAdded = true;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SUBTITLE_DATA') {
        this.logger?.info('Received subtitle data from background');
        this.loadSubtitles(message.data);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  /**
   * Load and parse subtitle data
   * @param {string} ttmlContent - Raw TTML content
   */
  loadSubtitles(ttmlContent) {
    if (!this.parser) {
      this.logger?.error('Parser not initialized');
      return;
    }

    // Parse TTML content
    this.subtitles = this.parser.parse(ttmlContent);
    this.translatedTexts.clear();

    this.logger?.info(`Loaded ${this.subtitles.length} subtitles for pre-translation`);

    // Find video element and start watching
    this.findVideo();
  }

  /**
   * Find video element and set up event listeners
   */
  findVideo() {
    // Remove old listeners if video changed
    this.removeVideoListeners();

    this.video = document.querySelector('video');

    if (!this.video) {
      this.logger?.warn('Video element not found, retrying...');
      setTimeout(() => this.findVideo(), 1000);
      return;
    }

    this.logger?.info('Video element found');
    this.addVideoListeners();

    // Check if already playing
    if (!this.video.paused) {
      this.onPlay();
    }
  }

  /**
   * Add event listeners to video element
   */
  addVideoListeners() {
    if (this.videoListenersAdded || !this.video) {
      return;
    }
    this.videoListenersAdded = true;

    this.video.addEventListener('play', this.boundOnPlay);
    this.video.addEventListener('pause', this.boundOnPause);
    this.video.addEventListener('seeking', this.boundOnSeeking);
  }

  /**
   * Remove event listeners from video element
   */
  removeVideoListeners() {
    if (!this.videoListenersAdded || !this.video) {
      return;
    }

    this.video.removeEventListener('play', this.boundOnPlay);
    this.video.removeEventListener('pause', this.boundOnPause);
    this.video.removeEventListener('seeking', this.boundOnSeeking);
    this.videoListenersAdded = false;
  }

  /**
   * Handle video play event
   */
  onPlay() {
    if (this.isPlaying) {
      return; // Already playing
    }
    this.isPlaying = true;
    this.logger?.info(`Video playing - starting pre-translation (${this.subtitles.length} subtitles loaded)`);

    // Log first few subtitles for debugging
    if (this.subtitles.length > 0) {
      const sample = this.subtitles.slice(0, 3);
      sample.forEach(s => {
        this.logger?.debug(`Pre-fetcher sample: "${s.text.substring(0, 40)}..." at ${s.startTime}ms`);
      });
    }

    this.startSync();
  }

  /**
   * Handle video pause event
   */
  onPause() {
    if (!this.isPlaying) {
      return; // Already paused
    }
    this.isPlaying = false;
    this.logger?.info('Video paused - stopping pre-translation');
    this.stopSync();
  }

  /**
   * Handle video seeking event
   */
  onSeeking() {
    // When seeking, immediately check for subtitles at new position
    if (this.isPlaying) {
      this.translateUpcoming();
    }
  }

  /**
   * Start sync interval
   */
  startSync() {
    // Clear any existing interval first
    this.stopSync();

    this.syncInterval = setInterval(() => {
      if (this.isPlaying && this.video && !this.video.paused) {
        this.translateUpcoming();
      }
    }, this.SYNC_INTERVAL_MS);

    // Also run immediately
    this.translateUpcoming();
  }

  /**
   * Stop sync interval
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Translate upcoming subtitles (within 5 seconds)
   */
  async translateUpcoming() {
    // Double-check we should be translating
    if (!this.video || !this.subtitles.length || !this.isPlaying || this.video.paused) {
      return;
    }

    const currentTimeMs = this.video.currentTime * 1000;

    // Find subtitles in the next 5 seconds that haven't been translated
    const upcoming = this.subtitles.filter(sub => {
      const isUpcoming = sub.startTime > currentTimeMs &&
                         sub.startTime <= currentTimeMs + this.LOOKAHEAD_MS;
      const notTranslated = !this.translatedTexts.has(sub.text);
      return isUpcoming && notTranslated;
    });

    if (upcoming.length === 0) {
      return;
    }

    this.logger?.debug(`Pre-fetcher: Found ${upcoming.length} upcoming subtitles at time ${currentTimeMs}ms`);

    // Translate each upcoming subtitle
    for (const subtitle of upcoming) {
      // Skip if already translated (double-check)
      if (this.translatedTexts.has(subtitle.text)) {
        continue;
      }

      // Mark as being translated
      this.translatedTexts.add(subtitle.text);

      this.logger?.debug(`Pre-fetcher: Translating "${subtitle.text.substring(0, 50)}..." (starts at ${subtitle.startTime}ms)`);

      try {
        // Check cache first
        if (this.cacheManager) {
          const settings = await this.getSettings();
          const cached = await this.cacheManager.get(
            subtitle.text,
            settings.sourceLang,
            settings.targetLang
          );
          if (cached) {
            this.logger?.debug(`Pre-fetcher: Already cached`);
            continue; // Already in cache
          }
        }

        // Translate (this will also cache the result)
        await this.translationManager.translate(subtitle.text);
        this.logger?.debug(`Pre-fetcher: Translation complete for "${subtitle.text.substring(0, 30)}..."`);
      } catch (error) {
        this.logger?.debug(`Pre-fetcher: Translation failed - ${error.message}`);
      }
    }
  }

  /**
   * Get current translation settings
   * @returns {Promise<Object>}
   */
  async getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        resolve(response || { sourceLang: 'auto', targetLang: 'en' });
      });
    });
  }

  /**
   * Clear all data
   */
  clear() {
    this.stopSync();
    this.removeVideoListeners();
    this.subtitles = [];
    this.translatedTexts.clear();
    this.video = null;
    this.isPlaying = false;
    this.videoListenersAdded = false;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalSubtitles: this.subtitles.length,
      translatedCount: this.translatedTexts.size,
      isPlaying: this.isPlaying,
      currentTime: this.video ? this.video.currentTime : 0
    };
  }
}

// Create global instance
const subtitlePrefetcher = new SubtitlePrefetcher();

// Make available globally
if (typeof window !== 'undefined') {
  window.DualSubsPrefetcher = subtitlePrefetcher;
}
