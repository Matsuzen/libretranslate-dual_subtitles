// Subtitle renderer for displaying dual subtitles

class SubtitleRenderer {
  constructor() {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;

    this.container = null;
    this.originalElement = null;
    this.translatedElement = null;

    this.layoutMode = this.CONSTANTS.DEFAULTS.LAYOUT_MODE;
    this.isEnabled = this.CONSTANTS.DEFAULTS.ENABLED;

    // Load settings
    this.loadSettings();

    this.logger?.debug('Subtitle renderer initialized');
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'layoutMode',
        'dualSubsEnabled'
      ]);

      this.layoutMode = settings.layoutMode || this.CONSTANTS.DEFAULTS.LAYOUT_MODE;
      this.isEnabled = settings.dualSubsEnabled ?? this.CONSTANTS.DEFAULTS.ENABLED;

      this.logger?.debug('Renderer settings loaded:', {
        layoutMode: this.layoutMode,
        isEnabled: this.isEnabled
      });

      // Update layout if already initialized
      if (this.container) {
        this.updateLayout();
      }
    } catch (error) {
      this.logger?.error('Failed to load renderer settings:', error);
    }
  }

  /**
   * Update settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    if (settings.layoutMode !== undefined) {
      this.layoutMode = settings.layoutMode;
      this.updateLayout();
    }

    if (settings.dualSubsEnabled !== undefined) {
      this.isEnabled = settings.dualSubsEnabled;

      if (!this.isEnabled) {
        this.clear();
      }
    }

    this.logger?.info('Renderer settings updated:', {
      layoutMode: this.layoutMode,
      isEnabled: this.isEnabled
    });
  }

  /**
   * Initialize renderer with container
   * @param {HTMLElement} container - Container element from DOM injector
   */
  init(container) {
    if (!container) {
      this.logger?.error('Cannot initialize renderer: no container provided');
      return;
    }

    this.container = container;

    // Create subtitle elements
    this.createElements();

    this.logger?.info('Subtitle renderer initialized with container');
  }

  /**
   * Create subtitle DOM elements
   */
  createElements() {
    if (!this.container) return;

    // Clear existing elements
    this.container.innerHTML = '';

    // Create wrapper for flexibility
    const wrapper = document.createElement('div');
    wrapper.className = 'dual-subtitle-wrapper';

    // Create original subtitle element
    this.originalElement = document.createElement('div');
    this.originalElement.className = 'dual-subtitle-original';

    // Create translated subtitle element
    this.translatedElement = document.createElement('div');
    this.translatedElement.className = 'dual-subtitle-translated';

    // Add to wrapper
    wrapper.appendChild(this.originalElement);
    wrapper.appendChild(this.translatedElement);

    // Add wrapper to container
    this.container.appendChild(wrapper);

    // Apply layout
    this.updateLayout();

    this.logger?.debug('Subtitle elements created');
  }

  /**
   * Update layout mode
   */
  updateLayout() {
    if (!this.container) return;

    const wrapper = this.container.querySelector('.dual-subtitle-wrapper');
    if (!wrapper) return;

    // Remove all layout classes
    wrapper.classList.remove('layout-below', 'layout-side-by-side');

    // Add current layout class
    if (this.layoutMode === this.CONSTANTS.UI.LAYOUT_MODES.SIDE_BY_SIDE) {
      wrapper.classList.add('layout-side-by-side');
      this.logger?.debug('Layout updated: side-by-side');
    } else {
      wrapper.classList.add('layout-below');
      this.logger?.debug('Layout updated: below');
    }
  }

  /**
   * Render dual subtitles
   * @param {string} original - Original subtitle text
   * @param {string} translated - Translated subtitle text
   */
  render(original, translated) {
    if (!this.isEnabled) {
      return;
    }

    if (!this.originalElement || !this.translatedElement) {
      this.logger?.warn('Subtitle elements not initialized');
      return;
    }

    // Update original
    if (original && original.trim()) {
      this.originalElement.textContent = original;
      this.originalElement.style.display = 'block';
    } else {
      this.originalElement.textContent = '';
      this.originalElement.style.display = 'none';
    }

    // Update translated
    if (translated && translated.trim()) {
      this.translatedElement.textContent = translated;
      this.translatedElement.style.display = 'block';
    } else {
      this.translatedElement.textContent = '';
      this.translatedElement.style.display = 'none';
    }

    // Show container
    if (this.container) {
      this.container.style.display = 'block';
      console.log('[DualSubs][Renderer] Container display set to block');
      console.log('[DualSubs][Renderer] Container classes:', this.container.className);
      console.log('[DualSubs][Renderer] Computed display:', window.getComputedStyle(this.container).display);
      console.log('[DualSubs][Renderer] Computed position:', window.getComputedStyle(this.container).position);
    }

    this.logger?.debug('Rendered subtitles:', {
      original: original?.substring(0, 50),
      translated: translated?.substring(0, 50)
    });
  }

  /**
   * Clear subtitles
   */
  clear() {
    if (this.originalElement) {
      this.originalElement.textContent = '';
      this.originalElement.style.display = 'none';
    }

    if (this.translatedElement) {
      this.translatedElement.textContent = '';
      this.translatedElement.style.display = 'none';
    }

    if (this.container) {
      this.container.style.display = 'none';
    }

    this.logger?.debug('Subtitles cleared');
  }

  /**
   * Show renderer
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide renderer
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Check if renderer is visible
   * @returns {boolean} - True if visible
   */
  isVisible() {
    return this.container && this.container.style.display !== 'none';
  }

  /**
   * Destroy renderer
   */
  destroy() {
    this.clear();
    this.container = null;
    this.originalElement = null;
    this.translatedElement = null;

    this.logger?.info('Subtitle renderer destroyed');
  }

  /**
   * Get current state
   * @returns {Object} - Current state
   */
  getState() {
    return {
      isEnabled: this.isEnabled,
      layoutMode: this.layoutMode,
      isVisible: this.isVisible(),
      hasContainer: !!this.container
    };
  }
}

// Create global subtitle renderer instance
const subtitleRenderer = new SubtitleRenderer();

// Make subtitle renderer available globally
if (typeof window !== 'undefined') {
  window.DualSubsRenderer = subtitleRenderer;
}
