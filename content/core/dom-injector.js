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
      console.log('[DualSubs] Fullscreen state changed:', isFullscreen);
      console.log('[DualSubs] Container element:', this.container);
      this.logger?.debug('Fullscreen state changed:', isFullscreen);

      // Update container position/styling if needed
      if (this.container) {
        if (isFullscreen) {
          // Get the fullscreen element
          const fullscreenElement = document.fullscreenElement ||
                                   document.webkitFullscreenElement ||
                                   document.mozFullScreenElement ||
                                   document.msFullscreenElement;

          console.log('[DualSubs] Fullscreen element:', fullscreenElement);

          // Move overlay to be a direct child of fullscreen element
          // This fixes position:fixed not working when parent has transform/perspective
          if (fullscreenElement && this.container.parentElement !== fullscreenElement) {
            console.log('[DualSubs] Moving overlay to fullscreen element');
            fullscreenElement.appendChild(this.container);
          }

          this.container.classList.add('fullscreen');
          console.log('[DualSubs] Added fullscreen class to container');
          console.log('[DualSubs] Container display:', window.getComputedStyle(this.container).display);
          console.log('[DualSubs] Container position:', window.getComputedStyle(this.container).position);
        } else {
          this.container.classList.remove('fullscreen');
          console.log('[DualSubs] Removed fullscreen class from container');

          // Move overlay back to video container
          if (this.videoElement && this.videoElement.parentElement) {
            this.videoElement.parentElement.appendChild(this.container);
            console.log('[DualSubs] Moved overlay back to video container');
          }
        }
      } else {
        console.error('[DualSubs] Container is null when trying to handle fullscreen');
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

  /**
   * Diagnostic: Check overlay state
   * Call from console: window.DualSubsInjector.diagnose()
   */
  diagnose() {
    console.group('[DualSubs] Overlay Diagnostics');
    console.log('Container exists:', !!this.container);
    console.log('Container element:', this.container);
    console.log('Container in DOM:', this.container && document.body.contains(this.container));
    console.log('Is fullscreen:', this.isFullscreen);
    console.log('Fullscreen element:', document.fullscreenElement || document.webkitFullscreenElement);

    if (this.container) {
      const computed = window.getComputedStyle(this.container);
      console.log('Container ID:', this.container.id);
      console.log('Container classes:', this.container.className);
      console.log('Inline display:', this.container.style.display);
      console.log('Computed display:', computed.display);
      console.log('Computed position:', computed.position);
      console.log('Computed z-index:', computed.zIndex);
      console.log('Computed bottom:', computed.bottom);
      console.log('Computed visibility:', computed.visibility);
      console.log('Computed opacity:', computed.opacity);
      console.log('Container bounding rect:', this.container.getBoundingClientRect());
    }

    console.groupEnd();
  }
}

// Create global DOM injector instance
const domInjector = new DOMInjector();

// Make DOM injector available globally
if (typeof window !== 'undefined') {
  window.DualSubsInjector = domInjector;
}
