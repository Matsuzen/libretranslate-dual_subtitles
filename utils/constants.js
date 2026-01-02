// Application constants for Dual Subtitles extension

const CONSTANTS = {
  // LibreTranslate API configuration
  API: {
    DEFAULT_ENDPOINT: 'https://libretranslate.com',
    TRANSLATE_PATH: '/translate',
    LANGUAGES_PATH: '/languages',
    TIMEOUT: 10000, // 10 seconds
    RATE_LIMIT_DELAY: 200, // ms between requests
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // ms
  },

  // Cache configuration
  CACHE: {
    MEMORY_SIZE: 500, // Number of entries in memory cache
    STORAGE_SIZE: 5000, // Number of entries in chrome.storage
    TTL_DAYS: 30, // Time to live for cached translations
    CLEANUP_INTERVAL: 1800000 // 30 minutes in ms
  },

  // Subtitle extraction settings
  EXTRACTION: {
    NETFLIX_DEBOUNCE: 100, // ms
    YOUTUBE_DEBOUNCE: 300, // ms - debounce for initial extraction
    YOUTUBE_STABILITY_DELAY: 400, // ms - wait for text to stabilize before rendering
    YOUTUBE_MAX_WAIT: 1500, // ms - maximum time to wait before forcing render
    HULU_DEBOUNCE: 200, // ms
    SUBTITLE_TIMEOUT: 2000, // ms - clear if translation takes too long
    OBSERVER_CONFIG: {
      childList: true,
      subtree: true,
      characterData: true
    }
  },

  // Platform selectors
  SELECTORS: {
    NETFLIX: {
      PRIMARY: [
        '.player-timedtext-text-container',
        '.player-timedtext',
        '[data-uia="player-timedtext"]'
      ],
      CONTAINER: [
        '.watch-video',
        '.NFPlayer',
        '#appMountPoint'
      ],
      VIDEO: 'video'
    },
    YOUTUBE: {
      PRIMARY: [
        '.ytp-caption-segment',
        '.captions-text',
        '.caption-window'
      ],
      CONTAINER: [
        '.html5-video-player',
        '#movie_player'
      ],
      VIDEO: 'video.html5-main-video'
    },
    HULU: {
      PRIMARY: [
        '.caption-text-box',
        '.ClosedCaption__container',
        '[class*="caption"]',
        '[class*="Caption"]'
      ],
      CONTAINER: [
        '.Player__container',
        '#content-player',
        '[class*="Player"]'
      ],
      VIDEO: 'video'
    }
  },

  // UI settings
  UI: {
    LAYOUT_MODES: {
      BELOW: 'below',
      SIDE_BY_SIDE: 'side-by-side'
    },
    DEFAULT_LAYOUT: 'below',
    CONTAINER_ID: 'dual-subtitle-overlay',
    Z_INDEX: 9999,
    POSITION_BOTTOM: '60px',
    COLORS: {
      ORIGINAL: '#ffffff',
      TRANSLATED: '#ffff00',
      SHADOW: 'rgba(0, 0, 0, 0.9)'
    },
    FONT_SIZES: {
      ORIGINAL: '1.5em',
      TRANSLATED: '1.3em'
    }
  },

  // Storage keys
  STORAGE_KEYS: {
    ENABLED: 'dualSubsEnabled',
    SOURCE_LANG: 'sourceLang',
    TARGET_LANG: 'targetLang',
    LAYOUT_MODE: 'layoutMode',
    API_ENDPOINT: 'apiEndpoint',
    DEBUG_MODE: 'debugMode',
    CACHE_DATA: 'cacheData',
    RECENT_LANGUAGES: 'recentLanguages'
  },

  // Default settings
  DEFAULTS: {
    ENABLED: true,
    SOURCE_LANG: 'auto', // Auto-detect
    TARGET_LANG: 'en',
    LAYOUT_MODE: 'below',
    DEBUG_MODE: false,
    API_ENDPOINT: 'https://libretranslate.com'
  },

  // Supported languages (common subset)
  LANGUAGES: [
    { code: 'auto', name: 'Auto-detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' }
  ],

  // Platform detection
  PLATFORMS: {
    NETFLIX: 'netflix',
    YOUTUBE: 'youtube',
    HULU: 'hulu',
    UNKNOWN: 'unknown'
  },

  // Events
  EVENTS: {
    SUBTITLE_CHANGE: 'subtitle-change',
    SUBTITLE_CLEAR: 'subtitle-clear',
    TRANSLATION_READY: 'translation-ready',
    TRANSLATION_ERROR: 'translation-error',
    SETTINGS_UPDATED: 'settings-updated'
  },

  // Error messages
  ERRORS: {
    API_UNAVAILABLE: 'Translation API is unavailable. Please check your connection or API endpoint.',
    RATE_LIMIT: 'Rate limit exceeded. Please wait a moment.',
    INVALID_RESPONSE: 'Invalid response from translation API.',
    NO_SUBTITLES: 'No subtitles detected on this page.',
    UNSUPPORTED_PLATFORM: 'This platform is not supported yet.'
  }
};

// Make constants available globally for content scripts
if (typeof window !== 'undefined') {
  window.DUAL_SUBS_CONSTANTS = CONSTANTS;
}
