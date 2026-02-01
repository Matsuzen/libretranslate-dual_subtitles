// Background service worker for Dual Subtitles extension

// Initialize extension on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[DualSubs] Extension installed/updated:', details.reason);

  // Initialize default settings
  const defaults = {
    dualSubsEnabled: true,
    sourceLang: 'auto',
    targetLang: 'en',
    layoutMode: 'below',
    apiEndpoint: 'https://libretranslate.com',
    debugMode: false,
    recentLanguages: []
  };

  // Only set defaults if not already set
  const current = await chrome.storage.sync.get(Object.keys(defaults));
  const updates = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (current[key] === undefined) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
    console.log('[DualSubs] Initialized default settings:', updates);
  }

  // Show welcome page on first install
  if (details.reason === 'install') {
    console.log('[DualSubs] First installation - welcome!');
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DualSubs] Received message:', message.type);

  switch (message.type) {
    case 'TRANSLATE':
      handleTranslation(message.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'GET_SETTINGS':
      handleGetSettings()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'CLEAR_CACHE':
      handleClearCache()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    default:
      console.warn('[DualSubs] Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle translation request (proxy to avoid CORS issues)
 * @param {Object} data - Translation request data
 * @returns {Promise<Object>} - Translation result
 */
async function handleTranslation(data) {
  const { text, sourceLang, targetLang, apiEndpoint } = data;

  try {
    console.log('[DualSubs] Translating:', { text: text.substring(0, 50), sourceLang, targetLang });

    const endpoint = apiEndpoint || 'https://libretranslate.com';
    const response = await fetch(`${endpoint}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang === 'auto' ? 'auto' : sourceLang,
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.translatedText) {
      throw new Error('Invalid response from translation API');
    }

    console.log('[DualSubs] Translation successful');
    return {
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage
    };

  } catch (error) {
    console.error('[DualSubs] Translation error:', error);
    throw error;
  }
}

/**
 * Get all settings
 * @returns {Promise<Object>} - All settings
 */
async function handleGetSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'dualSubsEnabled',
      'sourceLang',
      'targetLang',
      'layoutMode',
      'apiEndpoint',
      'debugMode',
      'recentLanguages'
    ]);

    console.log('[DualSubs] Retrieved settings');
    return settings;

  } catch (error) {
    console.error('[DualSubs] Error getting settings:', error);
    throw error;
  }
}

/**
 * Update settings
 * @param {Object} data - Settings to update
 * @returns {Promise<Object>} - Success response
 */
async function handleUpdateSettings(data) {
  try {
    await chrome.storage.sync.set(data);
    console.log('[DualSubs] Updated settings:', data);

    // Notify all content scripts of settings change
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url?.match(/netflix\.com|youtube\.com|hulu\.com/)) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          data
        }).catch(() => {
          // Tab might not have content script loaded yet
        });
      }
    }

    return { success: true };

  } catch (error) {
    console.error('[DualSubs] Error updating settings:', error);
    throw error;
  }
}

/**
 * Clear all cache data
 * @returns {Promise<Object>} - Success response
 */
async function handleClearCache() {
  try {
    await chrome.storage.local.remove(['cacheData']);
    console.log('[DualSubs] Cache cleared');

    // Notify all content scripts to clear their memory cache
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url?.match(/netflix\.com|youtube\.com|hulu\.com/)) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CLEAR_CACHE'
        }).catch(() => {
          // Tab might not have content script loaded yet
        });
      }
    }

    return { success: true };

  } catch (error) {
    console.error('[DualSubs] Error clearing cache:', error);
    throw error;
  }
}

// Keep service worker alive by listening to long-lived connections
chrome.runtime.onConnect.addListener((port) => {
  console.log('[DualSubs] Port connected:', port.name);
});

// Track processed subtitle URLs to avoid duplicates
const processedSubtitleUrls = new Set();

// Intercept Netflix subtitle requests
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    // Check if this is a Netflix subtitle file (TTML)
    if (details.url.includes('oca.nflxvideo.net/?o=')) {
      // Skip if already processed
      if (processedSubtitleUrls.has(details.url)) {
        return;
      }
      processedSubtitleUrls.add(details.url);

      console.log('[DualSubs] Detected Netflix subtitle request:', details.url);

      try {
        // Fetch the subtitle file
        const response = await fetch(details.url);
        const ttmlContent = await response.text();

        // Check if it's actually a TTML file
        if (ttmlContent.includes('<tt') || ttmlContent.includes('xml:id="subtitle')) {
          console.log('[DualSubs] TTML subtitle file detected, forwarding to content script');

          // Find Netflix tabs and send the subtitle data
          const tabs = await chrome.tabs.query({ url: '*://*.netflix.com/*' });
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SUBTITLE_DATA',
              data: ttmlContent,
              url: details.url
            }).catch(() => {
              // Tab might not have content script loaded
            });
          }
        }
      } catch (error) {
        console.error('[DualSubs] Error fetching subtitle file:', error);
      }
    }
  },
  { urls: ['*://*.nflxvideo.net/*'] }
);

// Clear processed URLs periodically (every 30 minutes) to allow re-fetch if needed
setInterval(() => {
  processedSubtitleUrls.clear();
  console.log('[DualSubs] Cleared processed subtitle URLs cache');
}, 30 * 60 * 1000);

console.log('[DualSubs] Service worker initialized');
