// DOM injector for creating subtitle overlay

class DOMInjector {
  constructor() {
    this.CONSTANTS = window.DUAL_SUBS_CONSTANTS;
    this.logger = window.DualSubsLogger;

    this.container = null;
    this.videoElement = null;
    this.isFullscreen = false;

    this.logger?.debug('DOM injector initialized');
  }

  /**
   * Inject subtitle overlay into the page
   * @param {HTMLElement} videoContainer - Video player container
   * @returns {HTMLElement} - Injected container
   */
  inject(videoContainer) {
    // Remove existing container if present
    this.remove();

    // Create container
    this.container = document.createElement('div');
    this.container.id = this.CONSTANTS.UI.CONTAINER_ID;
    this.container.className = 'dual-subtitle-container';

    // Find video element
    this.videoElement = videoContainer.querySelector('video');

    // Inject into video container
    if (videoContainer) {
      videoContainer.appendChild(this.container);
      this.logger?.info('Subtitle overlay injected');
    } else {
      this.logger?.error('Video container not found');
      return null;
    }

    // Set up fullscreen listeners
    this.setupFullscreenListeners();

    // Set up video event listeners
    this.setupVideoListeners();

    return this.container;
  }

  /**
   * Remove subtitle overlay
   */
  remove() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.logger?.info('Subtitle overlay removed');
    }

    this.container = null;
    this.removeFullscreenListeners();
    this.removeVideoListeners();
  }

  /**
   * Get container element
   * @returns {HTMLElement|null} - Container element
   */
  getContainer() {
    return this.container;
  }

  /**
   * Check if container exists
   * @returns {boolean} - True if container exists
   */
  exists() {
    return this.container !== null && document.body.contains(this.container);
  }

  /**
   * Set up fullscreen event listeners
   */
  setupFullscreenListeners() {
    this.fullscreenHandler = this.handleFullscreenChange.bind(this);

    document.addEventListener('fullscreenchange', this.fullscreenHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenHandler);

    this.logger?.debug('Fullscreen listeners set up');
  }

  /**
   * Remove fullscreen event listeners
   */
  removeFullscreenListeners() {
    if (this.fullscreenHandler) {
      document.removeEventListener('fullscreenchange', this.fullscreenHandler);
      document.removeEventListener('webkitfullscreenchange', this.fullscreenHandler);
      document.removeEventListener('mozfullscreenchange', this.fullscreenHandler);
      document.removeEventListener('MSFullscreenChange', this.fullscreenHandler);

      this.fullscreenHandler = null;
    }
  }

  /**
   * Handle fullscreen state changes
   */
  handleFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (isFullscreen !== this.isFullscreen) {
      this.isFullscreen = isFullscreen;
      this.logger?.debug('Fullscreen state changed:', isFullscreen);

      // Update container position/styling if needed
      if (this.container) {
        if (isFullscreen) {
          this.container.classList.add('fullscreen');
        } else {
          this.container.classList.remove('fullscreen');
        }
      }
    }
  }

  /**
   * Set up video event listeners
   */
  setupVideoListeners() {
    if (!this.videoElement) return;

    this.playHandler = () => {
      this.logger?.debug('Video playing');
    };

    this.pauseHandler = () => {
      this.logger?.debug('Video paused');
    };

    this.seekHandler = () => {
      this.logger?.debug('Video seeked');
      // Clear subtitle on seek
      const queue = window.DualSubsQueue;
      if (queue) {
        queue.clearSubtitle();
      }
    };

    this.videoElement.addEventListener('play', this.playHandler);
    this.videoElement.addEventListener('pause', this.pauseHandler);
    this.videoElement.addEventListener('seeked', this.seekHandler);

    this.logger?.debug('Video listeners set up');
  }

  /**
   * Remove video event listeners
   */
  removeVideoListeners() {
    if (!this.videoElement) return;

    if (this.playHandler) {
      this.videoElement.removeEventListener('play', this.playHandler);
      this.playHandler = null;
    }

    if (this.pauseHandler) {
      this.videoElement.removeEventListener('pause', this.pauseHandler);
      this.pauseHandler = null;
    }

    if (this.seekHandler) {
      this.videoElement.removeEventListener('seeked', this.seekHandler);
      this.seekHandler = null;
    }
  }

  /**
   * Update container position dynamically
   * @param {Object} position - Position object {bottom, left, right, etc.}
   */
  updatePosition(position) {
    if (!this.container) return;

    Object.assign(this.container.style, position);
    this.logger?.debug('Container position updated:', position);
  }

  /**
   * Show container
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide container
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Check if in fullscreen mode
   * @returns {boolean} - True if in fullscreen
   */
  isInFullscreen() {
    return this.isFullscreen;
  }

  /**
   * Get video element
   * @returns {HTMLVideoElement|null} - Video element
   */
  getVideoElement() {
    return this.videoElement;
  }
}

// Create global DOM injector instance
const domInjector = new DOMInjector();

// Make DOM injector available globally
if (typeof window !== 'undefined') {
  window.DualSubsInjector = domInjector;
}
