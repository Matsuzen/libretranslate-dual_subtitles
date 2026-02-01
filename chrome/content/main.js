// Main content script - Platform detection and initialization

(function() {
  'use strict';

  console.log('[DualSubs] Main content script loaded on:', window.location.hostname);

  const CONSTANTS = window.DUAL_SUBS_CONSTANTS;
  const logger = window.DualSubsLogger;

  let currentExtractor = null;
  let currentPlatform = CONSTANTS.PLATFORMS.UNKNOWN;
  let isEnabled = true;

  /**
   * Detect current platform based on URL
   * @returns {string} - Platform identifier
   */
  function detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('netflix.com')) {
      return CONSTANTS.PLATFORMS.NETFLIX;
    } else if (hostname.includes('youtube.com')) {
      return CONSTANTS.PLATFORMS.YOUTUBE;
    } else if (hostname.includes('hulu.com')) {
      return CONSTANTS.PLATFORMS.HULU;
    }

    return CONSTANTS.PLATFORMS.UNKNOWN;
  }

  /**
   * Initialize the appropriate extractor for the platform
   */
  async function initializeExtractor() {
    console.log('[DualSubs] Initializing Dual Subtitles extension');
    logger?.info('Initializing Dual Subtitles extension');

    // Detect platform
    currentPlatform = detectPlatform();
    console.log('[DualSubs] Platform detected:', currentPlatform);
    logger?.info('Platform detected:', currentPlatform);

    if (currentPlatform === CONSTANTS.PLATFORMS.UNKNOWN) {
      console.warn('[DualSubs] Unsupported platform');
      logger?.warn('Unsupported platform');
      return;
    }

    // Check if extension is enabled
    const settings = await chrome.storage.sync.get(['dualSubsEnabled']);
    isEnabled = settings.dualSubsEnabled ?? true;

    console.log('[DualSubs] Extension enabled:', isEnabled);
    if (!isEnabled) {
      logger?.info('Extension is disabled');
      return;
    }

    // Get the appropriate extractor
    switch (currentPlatform) {
      case CONSTANTS.PLATFORMS.NETFLIX:
        currentExtractor = window.NetflixExtractor;
        break;
      case CONSTANTS.PLATFORMS.YOUTUBE:
        currentExtractor = window.YouTubeExtractor;
        break;
      case CONSTANTS.PLATFORMS.HULU:
        console.log('[DualSubs] Getting Hulu extractor:', window.HuluExtractor);
        currentExtractor = window.HuluExtractor;
        break;
      default:
        console.error('[DualSubs] No extractor available for platform:', currentPlatform);
        logger?.error('No extractor available for platform:', currentPlatform);
        return;
    }

    // Start the extractor
    if (currentExtractor) {
      console.log('[DualSubs] Starting extractor for', currentPlatform, currentExtractor);
      logger?.info('Starting extractor for', currentPlatform);
      currentExtractor.start();
    } else {
      console.error('[DualSubs] Extractor is null/undefined for platform:', currentPlatform);
    }
  }

  /**
   * Handle settings updates from popup or background
   */
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      logger?.debug('Received message:', message.type);

      switch (message.type) {
        case 'SETTINGS_UPDATED':
          handleSettingsUpdate(message.data);
          sendResponse({ success: true });
          break;

        case 'CLEAR_CACHE':
          handleClearCache();
          sendResponse({ success: true });
          break;

        case 'GET_STATUS':
          sendResponse({
            platform: currentPlatform,
            isEnabled: isEnabled,
            extractorStatus: currentExtractor ? currentExtractor.getStatus() : null
          });
          break;

        case 'TOGGLE_EXTENSION':
          handleToggle(message.data.enabled);
          sendResponse({ success: true });
          break;

        case 'SUBTITLE_DATA':
          // Handled by prefetcher, ignore here
          break;

        default:
          logger?.warn('Unknown message type:', message.type);
      }
    });

    logger?.debug('Message listeners set up');
  }

  /**
   * Handle settings update
   * @param {Object} settings - Updated settings
   */
  function handleSettingsUpdate(settings) {
    logger?.info('Settings updated:', settings);

    // Update enabled state
    if (settings.dualSubsEnabled !== undefined) {
      const wasEnabled = isEnabled;
      isEnabled = settings.dualSubsEnabled;

      if (isEnabled && !wasEnabled) {
        // Re-enable
        logger?.info('Re-enabling extension');
        if (currentExtractor) {
          currentExtractor.restart();
        } else {
          initializeExtractor();
        }
      } else if (!isEnabled && wasEnabled) {
        // Disable
        logger?.info('Disabling extension');
        if (currentExtractor) {
          currentExtractor.stop();
        }
      }
    }

    // Update translation settings
    const translationManager = window.DualSubsTranslationManager;
    if (translationManager) {
      translationManager.updateSettings(settings);
    }

    // Update renderer settings
    const renderer = window.DualSubsRenderer;
    if (renderer) {
      renderer.updateSettings(settings);
    }

    // Update logger debug mode
    if (settings.debugMode !== undefined) {
      logger?.setDebugMode(settings.debugMode);
    }
  }

  /**
   * Handle cache clear
   */
  function handleClearCache() {
    logger?.info('Clearing cache');

    const cacheManager = window.DualSubsCacheManager;
    if (cacheManager) {
      cacheManager.clearAll();
    }
  }

  /**
   * Handle extension toggle
   * @param {boolean} enabled - New enabled state
   */
  function handleToggle(enabled) {
    isEnabled = enabled;

    if (enabled) {
      logger?.info('Extension enabled');
      if (currentExtractor) {
        currentExtractor.start();
      } else {
        initializeExtractor();
      }
    } else {
      logger?.info('Extension disabled');
      if (currentExtractor) {
        currentExtractor.stop();
      }
    }
  }

  /**
   * Handle page navigation (for YouTube)
   */
  function setupNavigationListeners() {
    // YouTube uses history API for navigation
    if (currentPlatform === CONSTANTS.PLATFORMS.YOUTUBE) {
      let lastUrl = location.href;

      new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          logger?.info('YouTube navigation detected');

          // Restart extractor on navigation
          if (currentExtractor && isEnabled) {
            setTimeout(() => {
              currentExtractor.restart();
            }, 2000);
          }
        }
      }).observe(document, { subtree: true, childList: true });
    }
  }

  /**
   * Initialize storage with defaults
   */
  async function initializeStorage() {
    const storage = window.DualSubsStorage;
    if (storage) {
      await storage.initializeDefaults();
    }
  }

  /**
   * Main initialization
   */
  async function main() {
    try {
      logger?.info('Dual Subtitles extension content script loaded');

      // Initialize storage
      await initializeStorage();

      // Set up message listeners
      setupMessageListeners();

      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(initializeExtractor, 2000);
        });
      } else {
        // DOM already loaded
        setTimeout(initializeExtractor, 2000);
      }

      // Set up navigation listeners
      setupNavigationListeners();

      logger?.info('Dual Subtitles extension initialized successfully');

    } catch (error) {
      logger?.error('Failed to initialize extension:', error);
    }
  }

  // Run main initialization
  main();

})();
