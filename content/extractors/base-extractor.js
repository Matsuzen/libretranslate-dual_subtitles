// Base extractor class for subtitle extraction

class BaseExtractor {
  constructor(platform) {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;
    this.queue = window.DualSubsQueue;

    this.platform = platform;
    this.observer = null;
    this.debounceTimer = null;
    this.lastText = '';
    this.isActive = false;

    this.logger?.info(`${platform} extractor created`);
  }

  /**
   * Initialize the extractor
   * Should be implemented by subclasses
   */
  init() {
    throw new Error('init() must be implemented by subclass');
  }

  /**
   * Extract subtitle text from DOM
   * Should be implemented by subclasses
   * @returns {string} - Extracted subtitle text
   */
  extractText() {
    throw new Error('extractText() must be implemented by subclass');
  }

  /**
   * Get container element to observe
   * Should be implemented by subclasses
   * @returns {HTMLElement|null} - Container element
   */
  getContainer() {
    throw new Error('getContainer() must be implemented by subclass');
  }

  /**
   * Get selectors for subtitle elements
   * Should be implemented by subclasses
   * @returns {Array<string>} - Array of selectors
   */
  getSelectors() {
    throw new Error('getSelectors() must be implemented by subclass');
  }

  /**
   * Get debounce delay
   * Should be implemented by subclasses
   * @returns {number} - Debounce delay in ms
   */
  getDebounceDelay() {
    throw new Error('getDebounceDelay() must be implemented by subclass');
  }

  /**
   * Start observing for subtitle changes
   */
  start() {
    if (this.isActive) {
      this.logger?.warn(`${this.platform} extractor already active`);
      return;
    }

    this.logger?.info(`Starting ${this.platform} extractor`);

    // Initialize platform-specific logic
    this.init();

    this.isActive = true;
  }

  /**
   * Stop observing for subtitle changes
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    this.logger?.info(`Stopping ${this.platform} extractor`);

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clear last text
    this.lastText = '';

    this.isActive = false;
  }

  /**
   * Set up MutationObserver
   * @param {HTMLElement} element - Element to observe
   * @param {Object} config - Observer configuration
   */
  setupObserver(element, config = null) {
    if (!element) {
      this.logger?.error(`${this.platform}: Cannot set up observer - element not found`);
      return;
    }

    const observerConfig = config || this.CONSTANTS.EXTRACTION.OBSERVER_CONFIG;

    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.observer.observe(element, observerConfig);

    this.logger?.debug(`${this.platform}: Observer set up on`, element);
  }

  /**
   * Handle DOM mutations
   * @param {Array<MutationRecord>} mutations - Mutation records
   */
  handleMutation(mutations) {
    // Extract text on any mutation
    this.debouncedExtract();
  }

  /**
   * Debounced text extraction
   */
  debouncedExtract() {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.performExtraction();
    }, this.getDebounceDelay());
  }

  /**
   * Perform text extraction
   */
  performExtraction() {
    try {
      const text = this.extractText();

      // Only process if text changed
      if (text !== this.lastText) {
        this.lastText = text;

        if (text && text.trim()) {
          this.logger?.debug(`${this.platform}: Extracted text:`, text.substring(0, 50));
          this.onSubtitleChange(text);
        } else {
          this.logger?.debug(`${this.platform}: Subtitle cleared`);
          this.onSubtitleClear();
        }
      }
    } catch (error) {
      this.logger?.error(`${this.platform}: Extraction error:`, error);
    }
  }

  /**
   * Handle subtitle change
   * @param {string} text - Subtitle text
   */
  onSubtitleChange(text) {
    if (this.queue) {
      this.queue.addSubtitle(text);
    }
  }

  /**
   * Handle subtitle clear
   */
  onSubtitleClear() {
    if (this.queue) {
      this.queue.clearSubtitle();
    }
  }

  /**
   * Find element by trying multiple selectors
   * @param {Array<string>} selectors - Array of CSS selectors
   * @param {HTMLElement} root - Root element to search from
   * @returns {HTMLElement|null} - Found element
   */
  findElementBySelectors(selectors, root = document) {
    for (const selector of selectors) {
      try {
        const element = root.querySelector(selector);
        if (element) {
          this.logger?.debug(`${this.platform}: Found element with selector:`, selector);
          return element;
        }
      } catch (error) {
        this.logger?.warn(`${this.platform}: Invalid selector:`, selector, error);
      }
    }

    return null;
  }

  /**
   * Wait for element to appear
   * @param {Array<string>} selectors - Array of CSS selectors
   * @param {number} timeout - Timeout in ms
   * @param {HTMLElement} root - Root element to search from
   * @returns {Promise<HTMLElement>} - Found element
   */
  waitForElement(selectors, timeout = 10000, root = document) {
    return new Promise((resolve, reject) => {
      // Try to find immediately
      const element = this.findElementBySelectors(selectors, root);
      if (element) {
        resolve(element);
        return;
      }

      // Set up observer to wait for element
      const observer = new MutationObserver((mutations, obs) => {
        const element = this.findElementBySelectors(selectors, root);
        if (element) {
          obs.disconnect();
          clearTimeout(timeoutId);
          resolve(element);
        }
      });

      observer.observe(root, {
        childList: true,
        subtree: true
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`${this.platform}: Element not found within timeout`));
      }, timeout);
    });
  }

  /**
   * Get extractor status
   * @returns {Object} - Status object
   */
  getStatus() {
    return {
      platform: this.platform,
      isActive: this.isActive,
      lastText: this.lastText ? this.lastText.substring(0, 50) : null,
      hasObserver: !!this.observer
    };
  }

  /**
   * Restart extractor
   */
  restart() {
    this.logger?.info(`Restarting ${this.platform} extractor`);
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }
}

// Make base extractor available globally
if (typeof window !== 'undefined') {
  window.BaseExtractor = BaseExtractor;
}
