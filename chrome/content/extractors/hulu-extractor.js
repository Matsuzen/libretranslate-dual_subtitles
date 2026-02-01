// Hulu subtitle extractor

console.log('[DualSubs][Hulu] Hulu extractor script loaded');

class HuluExtractor extends BaseExtractor {
  constructor() {
    super('Hulu');
    console.log('[DualSubs][Hulu] Hulu extractor constructed');
    this.containerElement = null;
    this.reinitTimer = null;
  }

  /**
   * Initialize Hulu extractor
   */
  init() {
    // Always log to console for debugging
    console.log('[DualSubs][Hulu] Initializing Hulu extractor');
    this.logger?.info('Initializing Hulu extractor');

    // Wait for video container to load
    this.waitForElements();
  }

  /**
   * Wait for Hulu elements to load
   */
  async waitForElements() {
    console.log('[DualSubs][Hulu] Waiting for elements...');
    console.log('[DualSubs][Hulu] Looking for selectors:', this.CONSTANTS.SELECTORS.HULU.CONTAINER);

    try {
      // Wait for container (try multiple selectors)
      this.containerElement = await this.waitForElement(
        this.CONSTANTS.SELECTORS.HULU.CONTAINER,
        15000
      );

      console.log('[DualSubs][Hulu] Container found!', this.containerElement);
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
      console.error('[DualSubs][Hulu] Failed to initialize:', error);
      console.log('[DualSubs][Hulu] Current page structure:', document.body.className);
      console.log('[DualSubs][Hulu] Available player elements:', document.querySelectorAll('[class*="layer"], [class*="Player"]'));
      this.logger?.error('Failed to initialize Hulu extractor:', error);

      // Retry initialization after a delay
      setTimeout(() => {
        if (this.isActive) {
          console.log('[DualSubs][Hulu] Retrying initialization...');
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

      // Check if container is still in DOM (Hulu may have replaced it during ads)
      if (this.containerElement && !document.contains(this.containerElement)) {
        this.logger?.info('Hulu container was removed, re-initializing...');
        this.reinitialize();
        return;
      }

      // Check if overlay still exists, re-inject if needed
      const injector = window.DualSubsInjector;
      if (injector && !injector.exists()) {
        this.logger?.info('Overlay missing, re-injecting...');
        this.tryInjectDOM();
      }

      this.debouncedExtract();
    }, 500);
  }

  /**
   * Re-initialize after container change
   */
  reinitialize() {
    // Clear old state
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.containerElement = null;
    this.lastText = '';

    // Re-initialize
    this.waitForElements();
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
    // Words that indicate UI/settings text, not subtitles
    const uiKeywords = [
      'opaque', 'semi-transparent', 'transparent', 'none',
      'caption', 'subtitle', 'settings', 'options',
      'background', 'font', 'size', 'color', 'style',
      'window', 'character', 'edge'
    ];

    // Helper to check if text is UI/settings/metadata
    const isUIText = (text) => {
      const lower = text.toLowerCase();

      // Check for episode/show metadata patterns
      if (lower.match(/s\d+\s*e\d+/i)) {
        return true; // Matches "S3 E1", "S1E5", etc.
      }

      // Check for "up next" or title patterns
      if (lower.includes('up next') || lower.includes('next episode')) {
        return true;
      }

      // Skip very long text (likely not a subtitle)
      if (text.length > 200) {
        return true;
      }

      // Check if text has lots of punctuation (likely a title with multiple items)
      const punctuationCount = (text.match(/[,;:]/g) || []).length;
      if (punctuationCount >= 3) {
        return true; // Likely "Title 1, Title 2, Title 3" format
      }

      // Check if text contains multiple UI keywords
      const keywordCount = uiKeywords.filter(keyword => lower.includes(keyword)).length;
      return keywordCount >= 2 || lower.match(/^(opaque|semi-transparent|transparent|none)$/i);
    };

    // Try multiple selectors for Hulu captions
    // Hulu's structure can vary
    const selectors = [
      '.caption-text-box',
      '.ClosedCaption__container',
      '.CaptionBox',
      '[data-automationid="caption-text"]',
      // Additional modern Hulu selectors
      '[class*="Captions"]:not([class*="Settings"]):not([class*="Menu"])',
      '[class*="subtitle"]:not([class*="settings"]):not([class*="menu"])',
      '[class*="Subtitle"]:not([class*="Settings"]):not([class*="Menu"])',
      '.PlayerCaptionsContainer',
      '[data-testid*="caption"]:not([data-testid*="menu"]):not([data-testid*="settings"])',
      '[data-testid*="subtitle"]:not([data-testid*="menu"]):not([data-testid*="settings"])',
      // Try video track display
      '.webvtt-cue',
      '.vtt-cue'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);

        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 0 && !isUIText(text)) {
            console.log('[DualSubs][Hulu] Extracted text from', selector, ':', text.substring(0, 50));
            return text;
          } else if (text.length > 0) {
            console.log('[DualSubs][Hulu] Skipped UI text from', selector, ':', text.substring(0, 50));
          }
        }
      } catch (error) {
        // Silently continue - some selectors may be invalid
      }
    }

    // Try finding by class pattern
    try {
      const captionElements = document.querySelectorAll('[class*="caption"], [class*="Caption"], [class*="subtitle"], [class*="Subtitle"]');

      if (captionElements.length > 0) {
        // Debug: show what we found
        console.log('[DualSubs][Hulu] Found potential caption elements:', captionElements.length);
      }

      for (const element of captionElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length < 500) {
          // Skip UI/settings text
          if (isUIText(text)) {
            continue;
          }

          // Reasonable subtitle length
          // Avoid getting entire player text
          const hasVideo = element.querySelector('video');
          const hasControls = element.querySelector('[class*="control"]');
          const hasSettings = element.querySelector('[class*="settings"], [class*="Settings"], [class*="menu"], [class*="Menu"]');

          if (!hasVideo && !hasControls && !hasSettings) {
            console.log('[DualSubs][Hulu] Extracted from pattern match:', text.substring(0, 50));
            return text;
          }
        }
      }
    } catch (error) {
      console.error('[DualSubs][Hulu] Error extracting from caption pattern:', error);
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

  /**
   * Diagnostic: Find all potential subtitle elements
   * Call from console: window.HuluExtractor.diagnoseSubtitles()
   */
  diagnoseSubtitles() {
    console.group('[DualSubs][Hulu] Subtitle Diagnostics');

    // Find all elements that might contain subtitles
    const patterns = [
      '[class*="caption"]',
      '[class*="Caption"]',
      '[class*="subtitle"]',
      '[class*="Subtitle"]',
      '[class*="cue"]',
      '[data-automationid*="caption"]',
      '[data-testid*="caption"]'
    ];

    patterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      if (elements.length > 0) {
        console.group(`Pattern: ${pattern} (${elements.length} elements)`);
        elements.forEach((el, index) => {
          const text = el.textContent?.trim().substring(0, 100);
          const classes = el.className;
          const isVisible = el.offsetParent !== null;
          console.log(`[${index}]`, {
            text,
            classes,
            isVisible,
            element: el
          });
        });
        console.groupEnd();
      }
    });

    console.groupEnd();
  }
}

// Create global Hulu extractor instance
const huluExtractor = new HuluExtractor();

// Make Hulu extractor available globally
if (typeof window !== 'undefined') {
  window.HuluExtractor = huluExtractor;
}
