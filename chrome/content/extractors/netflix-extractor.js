// Netflix subtitle extractor

class NetflixExtractor extends BaseExtractor {
  constructor() {
    super('Netflix');
    this.containerElement = null;
    this.subtitleContainer = null;
  }

  /**
   * Initialize Netflix extractor
   */
  init() {
    this.logger?.info('Initializing Netflix extractor');

    // Wait for video container and subtitle elements to load
    this.waitForElements();
  }

  /**
   * Wait for Netflix elements to load
   */
  async waitForElements() {
    try {
      // Wait for container
      this.containerElement = await this.waitForElement(
        this.CONSTANTS.SELECTORS.NETFLIX.CONTAINER,
        15000
      );

      this.logger?.info('Netflix container found');

      // Set up observer on container
      this.setupObserver(this.containerElement);

      // Try to inject DOM immediately if subtitle exists
      this.tryInjectDOM();

      // Also watch for subtitle container specifically
      this.watchForSubtitles();

    } catch (error) {
      this.logger?.error('Failed to initialize Netflix extractor:', error);
    }
  }

  /**
   * Watch for subtitle container changes
   */
  watchForSubtitles() {
    // Use an interval to periodically check for subtitle changes
    // This is needed because Netflix's subtitle rendering can be tricky
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
      this.logger?.info('DOM overlay injected for Netflix');
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
    return this.CONSTANTS.SELECTORS.NETFLIX.PRIMARY;
  }

  /**
   * Get debounce delay
   * @returns {number}
   */
  getDebounceDelay() {
    return this.CONSTANTS.EXTRACTION.NETFLIX_DEBOUNCE;
  }

  /**
   * Extract subtitle text from Netflix player
   * @returns {string}
   */
  extractText() {
    const selectors = [
      '.player-timedtext-text-container',
      '.player-timedtext span',
      '[data-uia="player-timedtext"] span',
      '.timedtext span'
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);

        if (elements.length > 0) {
          // Get text from all matching elements
          const texts = Array.from(elements)
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0);

          if (texts.length > 0) {
            // Join multiple subtitle lines
            const fullText = texts.join(' ');
            return fullText;
          }
        }
      } catch (error) {
        this.logger?.debug(`Error with selector ${selector}:`, error);
      }
    }

    // No subtitle found
    return '';
  }

  /**
   * Stop Netflix extractor
   */
  stop() {
    super.stop();

    // Clear subtitle check interval
    if (this.subtitleCheckInterval) {
      clearInterval(this.subtitleCheckInterval);
      this.subtitleCheckInterval = null;
    }

    // Remove injected DOM
    const injector = window.DualSubsInjector;
    if (injector) {
      injector.remove();
    }
  }

  /**
   * Restart Netflix extractor
   */
  restart() {
    this.logger?.info('Restarting Netflix extractor');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 2000);
  }
}

// Create global Netflix extractor instance
const netflixExtractor = new NetflixExtractor();

// Make Netflix extractor available globally
if (typeof window !== 'undefined') {
  window.NetflixExtractor = netflixExtractor;
}
