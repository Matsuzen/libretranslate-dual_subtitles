// YouTube subtitle extractor

class YouTubeExtractor extends BaseExtractor {
  constructor() {
    super('YouTube');
    this.containerElement = null;
    this.partialText = '';
    this.wordTimeout = null;
    this.stabilityTimer = null;
    this.maxWaitTimer = null;
    this.pendingText = '';
    this.lastStableText = '';
    this.firstChangeTime = null;
  }

  /**
   * Initialize YouTube extractor
   */
  init() {
    this.logger?.info('Initializing YouTube extractor');

    // Wait for video container to load
    this.waitForElements();
  }

  /**
   * Wait for YouTube elements to load
   */
  async waitForElements() {
    try {
      // Wait for container
      this.containerElement = await this.waitForElement(
        this.CONSTANTS.SELECTORS.YOUTUBE.CONTAINER,
        15000
      );

      this.logger?.info('YouTube container found');

      // Set up observer on container
      this.setupObserver(this.containerElement);

      // Try to inject DOM immediately
      this.tryInjectDOM();

      // Watch for subtitle changes
      this.watchForSubtitles();

    } catch (error) {
      this.logger?.error('Failed to initialize YouTube extractor:', error);
    }
  }

  /**
   * Watch for subtitle container changes
   */
  watchForSubtitles() {
    // Use an interval to periodically check for subtitle changes
    this.subtitleCheckInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(this.subtitleCheckInterval);
        return;
      }

      this.debouncedExtract();
    }, 500);
  }

  /**
   * Try to inject DOM overlay
   */
  async tryInjectDOM() {
    const injector = window.DualSubsInjector;
    const renderer = window.DualSubsRenderer;

    if (!injector || !renderer) {
      this.logger?.warn('Injector or renderer not available');
      return;
    }

    // Don't inject if already exists
    if (injector.exists()) {
      return;
    }

    // Inject DOM
    const container = injector.inject(this.containerElement);
    if (container) {
      renderer.init(container);
      this.logger?.info('DOM overlay injected for YouTube');
    }
  }

  /**
   * Get container element
   * @returns {HTMLElement|null}
   */
  getContainer() {
    return this.containerElement;
  }

  /**
   * Get subtitle selectors
   * @returns {Array<string>}
   */
  getSelectors() {
    return this.CONSTANTS.SELECTORS.YOUTUBE.PRIMARY;
  }

  /**
   * Get debounce delay
   * @returns {number}
   */
  getDebounceDelay() {
    return this.CONSTANTS.EXTRACTION.YOUTUBE_DEBOUNCE;
  }

  /**
   * Extract subtitle text from YouTube player
   * @returns {string}
   */
  extractText() {
    // Try multiple selectors for YouTube captions
    const selectors = [
      '.ytp-caption-segment',
      '.captions-text',
      '.caption-window .ytp-caption-segment',
      '.ytp-caption-window-container .ytp-caption-segment'
    ];

    for (const selector of selectors) {
      try {
        const segments = document.querySelectorAll(selector);

        if (segments.length > 0) {
          // YouTube often displays captions word-by-word
          // Collect all segments
          const texts = Array.from(segments)
            .map(seg => seg.textContent?.trim())
            .filter(text => text && text.length > 0);

          if (texts.length > 0) {
            // Join all segments with spaces
            const fullText = texts.join(' ').trim();
            return fullText;
          }
        }
      } catch (error) {
        this.logger?.debug(`Error with selector ${selector}:`, error);
      }
    }

    // Try alternative: caption window container
    try {
      const captionWindow = document.querySelector('.ytp-caption-window-container');
      if (captionWindow && captionWindow.textContent) {
        const text = captionWindow.textContent.trim();
        if (text.length > 0) {
          return text;
        }
      }
    } catch (error) {
      this.logger?.debug('Error extracting from caption window:', error);
    }

    // No subtitle found
    return '';
  }

  /**
   * Perform text extraction with stability check
   * Overrides base class to handle YouTube's word-by-word updates
   */
  performExtraction() {
    try {
      const text = this.extractText();

      // If text is empty, clear immediately
      if (!text || !text.trim()) {
        this.clearPendingTimers();
        this.pendingText = '';
        this.lastStableText = '';
        this.firstChangeTime = null;
        this.onSubtitleClear();
        return;
      }

      // Store pending text
      this.pendingText = text;

      // Track when we first saw a change
      if (!this.firstChangeTime) {
        this.firstChangeTime = Date.now();

        // Set max wait timer - force render after YOUTUBE_MAX_WAIT even if still changing
        this.maxWaitTimer = setTimeout(() => {
          this.renderPendingText();
        }, this.CONSTANTS.EXTRACTION.YOUTUBE_MAX_WAIT);
      }

      // Clear existing stability timer
      if (this.stabilityTimer) {
        clearTimeout(this.stabilityTimer);
      }

      // Wait for text to stabilize (no changes for YOUTUBE_STABILITY_DELAY)
      this.stabilityTimer = setTimeout(() => {
        this.renderPendingText();
      }, this.CONSTANTS.EXTRACTION.YOUTUBE_STABILITY_DELAY);

    } catch (error) {
      this.logger?.error('YouTube: Extraction error:', error);
    }
  }

  /**
   * Render the pending text if it has changed
   */
  renderPendingText() {
    // Check if text has actually changed from last stable version
    if (this.pendingText && this.pendingText !== this.lastStableText) {
      this.lastStableText = this.pendingText;
      this.lastText = this.pendingText;

      this.logger?.debug(`YouTube: Rendering text:`, this.pendingText.substring(0, 50));
      this.onSubtitleChange(this.pendingText);
    }

    // Clear timers and reset state
    this.clearPendingTimers();
    this.firstChangeTime = null;
  }

  /**
   * Clear all pending timers
   */
  clearPendingTimers() {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
  }

  /**
   * Handle mutation with special YouTube logic
   * @param {Array<MutationRecord>} mutations
   */
  handleMutation(mutations) {
    // YouTube updates captions frequently (word-by-word in auto-captions)
    // Use debounce to batch rapid updates
    this.debouncedExtract();
  }

  /**
   * Stop YouTube extractor
   */
  stop() {
    super.stop();

    // Clear subtitle check interval
    if (this.subtitleCheckInterval) {
      clearInterval(this.subtitleCheckInterval);
      this.subtitleCheckInterval = null;
    }

    // Clear word timeout
    if (this.wordTimeout) {
      clearTimeout(this.wordTimeout);
      this.wordTimeout = null;
    }

    // Clear all pending timers
    this.clearPendingTimers();

    // Reset state
    this.pendingText = '';
    this.lastStableText = '';
    this.firstChangeTime = null;

    // Remove injected DOM
    const injector = window.DualSubsInjector;
    if (injector) {
      injector.remove();
    }
  }

  /**
   * Restart YouTube extractor
   */
  restart() {
    this.logger?.info('Restarting YouTube extractor');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 2000);
  }
}

// Create global YouTube extractor instance
const youtubeExtractor = new YouTubeExtractor();

// Make YouTube extractor available globally
if (typeof window !== 'undefined') {
  window.YouTubeExtractor = youtubeExtractor;
}
