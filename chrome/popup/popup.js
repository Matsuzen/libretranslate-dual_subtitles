// Popup script for Dual Subtitles extension

document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  const enableToggle = document.getElementById('enableToggle');
  const sourceLangSelect = document.getElementById('sourceLang');
  const targetLangSelect = document.getElementById('targetLang');
  const layoutModeSelect = document.getElementById('layoutMode');
  const textSizeSelect = document.getElementById('textSize');
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const debugModeCheckbox = document.getElementById('debugMode');
  const saveButton = document.getElementById('saveButton');
  const clearCacheButton = document.getElementById('clearCacheButton');
  const statusDiv = document.getElementById('status');

  // Language list
  const languages = [
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
    { code: 'tr', name: 'Turkish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'cs', name: 'Czech' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'el', name: 'Greek' },
    { code: 'he', name: 'Hebrew' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' }
  ];

  /**
   * Populate language dropdowns
   */
  function populateLanguages() {
    // Clear existing options
    sourceLangSelect.innerHTML = '';
    targetLangSelect.innerHTML = '';

    // Add source languages (including auto-detect)
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      sourceLangSelect.appendChild(option);
    });

    // Add target languages (excluding auto-detect)
    languages.filter(lang => lang.code !== 'auto').forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      targetLangSelect.appendChild(option);
    });
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'dualSubsEnabled',
        'sourceLang',
        'targetLang',
        'layoutMode',
        'textSize',
        'apiEndpoint',
        'debugMode'
      ]);

      // Set values
      enableToggle.checked = settings.dualSubsEnabled ?? true;
      sourceLangSelect.value = settings.sourceLang || 'auto';
      targetLangSelect.value = settings.targetLang || 'en';
      layoutModeSelect.value = settings.layoutMode || 'below';
      textSizeSelect.value = settings.textSize ?? 1;
      apiEndpointInput.value = settings.apiEndpoint || 'https://libretranslate.com';
      debugModeCheckbox.checked = settings.debugMode || false;

      console.log('[DualSubs Popup] Settings loaded:', settings);

    } catch (error) {
      console.error('[DualSubs Popup] Error loading settings:', error);
      showStatus('Failed to load settings', 'error');
    }
  }

  /**
   * Save settings to storage
   */
  async function saveSettings() {
    try {
      const settings = {
        dualSubsEnabled: enableToggle.checked,
        sourceLang: sourceLangSelect.value,
        targetLang: targetLangSelect.value,
        layoutMode: layoutModeSelect.value,
        textSize: parseFloat(textSizeSelect.value),
        apiEndpoint: apiEndpointInput.value.trim() || 'https://libretranslate.com',
        debugMode: debugModeCheckbox.checked
      };

      // Save to storage
      await chrome.storage.sync.set(settings);

      console.log('[DualSubs Popup] Settings saved:', settings);

      // Notify content scripts
      await notifyContentScripts(settings);

      // Show success message
      showStatus('Settings saved successfully!', 'success');

    } catch (error) {
      console.error('[DualSubs Popup] Error saving settings:', error);
      showStatus('Failed to save settings', 'error');
    }
  }

  /**
   * Notify content scripts of settings update
   */
  async function notifyContentScripts(settings) {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && tab.url.match(/netflix\.com|youtube\.com|hulu\.com/)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            data: settings
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      }
    } catch (error) {
      console.error('[DualSubs Popup] Error notifying content scripts:', error);
    }
  }

  /**
   * Clear cache
   */
  async function clearCache() {
    try {
      // Clear cache via background script
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_CACHE'
      });

      if (response.success) {
        showStatus('Cache cleared successfully!', 'success');
      } else {
        showStatus('Failed to clear cache', 'error');
      }

    } catch (error) {
      console.error('[DualSubs Popup] Error clearing cache:', error);
      showStatus('Failed to clear cache', 'error');
    }
  }

  /**
   * Show status message
   * @param {string} message - Message to show
   * @param {string} type - 'success' or 'error'
   */
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    // Hide after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status hidden';
    }, 3000);
  }

  /**
   * Handle toggle change
   */
  enableToggle.addEventListener('change', async () => {
    try {
      await chrome.storage.sync.set({ dualSubsEnabled: enableToggle.checked });

      // Notify content scripts
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && tab.url.match(/netflix\.com|youtube\.com|hulu\.com/)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_EXTENSION',
            data: { enabled: enableToggle.checked }
          }).catch(() => {});
        }
      }

      showStatus(
        enableToggle.checked ? 'Extension enabled' : 'Extension disabled',
        'success'
      );

    } catch (error) {
      console.error('[DualSubs Popup] Error toggling extension:', error);
    }
  });

  // Event listeners
  saveButton.addEventListener('click', saveSettings);
  clearCacheButton.addEventListener('click', clearCache);

  // Auto-save on changes (optional)
  sourceLangSelect.addEventListener('change', () => showStatus('Don\'t forget to save!', 'success'));
  targetLangSelect.addEventListener('change', () => showStatus('Don\'t forget to save!', 'success'));
  layoutModeSelect.addEventListener('change', () => showStatus('Don\'t forget to save!', 'success'));
  textSizeSelect.addEventListener('change', () => showStatus('Don\'t forget to save!', 'success'));

  // Initialize
  populateLanguages();
  await loadSettings();
});
