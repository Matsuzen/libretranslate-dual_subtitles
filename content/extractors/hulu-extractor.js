// Hulu subtitle extractor

class HuluExtractor extends BaseExtractor {
  constructor() {
    super('Hulu');
    this.containerElement = null;
    this.reinitTimer = null;
  }

  /**
   * Initialize Hulu extractor
   */
  init() {
    this.logger?.info('Initializing Hulu extractor');

    // Wait for video container to load
    this.waitForElements();
  }

  /**
   * Wait for Hulu elements to load
   */
  async waitForElements() {
    try {
      // Wait for container (try multiple selectors)
      this.containerElement = await this.waitForElement(
        this.CONSTANTS.SELECTORS.HULU.CONTAINER,
        15000
      );

      this.logger?.info('Hulu container found');

      // Set up observer on container
      this.setupObserver(this.containerElement);

      // Try to inject DOM immediately
      this.tryInjectDOM();

      // Watch for subtitle changes
      this.watchForSubtitles();

      // Set up periodic re-initialization (for ad breaks)
      this.setupReinitTimer();

    } catch (error) {
      this.logger?.error('Failed to initialize Hulu extractor:', error);

      // Retry initialization after a delay
      setTimeout(() => {
        if (this.isActive) {
          this.logger?.info('Retrying Hulu initialization');
          this.init();
        }
      }, 5000);
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
   * Set up periodic re-initialization timer
   * Needed because Hulu may change DOM structure during ads
   */
  setupReinitTimer() {
    // Re-check container every 30 seconds
    this.reinitTimer = setInterval(() => {
      if (!this.isActive) {
        clearInterval(this.reinitTimer);
        return;
      }

      // Check if container still exists
      if (this.containerElement && !document.body.contains(this.containerElement)) {
        this.logger?.warn('Hulu container lost, re-initializing');
        this.init();
      }
    }, 30000);
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
      this.logger?.info('DOM overlay injected for Hulu');
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
    return this.CONSTANTS.SELECTORS.HULU.PRIMARY;
  }

  /**
   * Get debounce delay
   * @returns {number}
   */
  getDebounceDelay() {
    return this.CONSTANTS.EXTRACTION.HULU_DEBOUNCE;
  }

  /**
   * Extract subtitle text from Hulu player
   * @returns {string}
   */
  extractText() {
    // Try multiple selectors for Hulu captions
    // Hulu's structure can vary
    const selectors = [
      '.caption-text-box',
      '.ClosedCaption__container',
      '[class*="caption"] [class*="text"]',
      '[class*="Caption"]',
      '.CaptionBox',
      '[data-automationid="caption-text"]'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);

        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 0) {
            return text;
          }
        }
      } catch (error) {
        this.logger?.debug(`Error with selector ${selector}:`, error);
      }
    }

    // Try finding by class pattern
    try {
      const captionElements = document.querySelectorAll('[class*="caption"], [class*="Caption"]');
      for (const element of captionElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length < 500) {
          // Reasonable subtitle length
          // Avoid getting entire player text
          const hasVideo = element.querySelector('video');
          const hasControls = element.querySelector('[class*="control"]');

          if (!hasVideo && !hasControls) {
            return text;
          }
        }
      }
    } catch (error) {
      this.logger?.debug('Error extracting from caption pattern:', error);
    }

    // No subtitle found
    return '';
  }

  /**
   * Stop Hulu extractor
   */
  stop() {
    super.stop();

    // Clear subtitle check interval
    if (this.subtitleCheckInterval) {
      clearInterval(this.subtitleCheckInterval);
      this.subtitleCheckInterval = null;
    }

    // Clear reinit timer
    if (this.reinitTimer) {
      clearInterval(this.reinitTimer);
      this.reinitTimer = null;
    }

    // Remove injected DOM
    const injector = window.DualSubsInjector;
    if (injector) {
      injector.remove();
    }
  }

  /**
   * Restart Hulu extractor
   */
  restart() {
    this.logger?.info('Restarting Hulu extractor');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 2000);
  }
}

// Create global Hulu extractor instance
const huluExtractor = new HuluExtractor();

// Make Hulu extractor available globally
if (typeof window !== 'undefined') {
  window.HuluExtractor = huluExtractor;
}
