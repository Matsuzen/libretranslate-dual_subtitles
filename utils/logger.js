// Logging utility for Dual Subtitles extension

class Logger {
  constructor(prefix = 'DualSubs') {
    this.prefix = prefix;
    this.debugMode = false;
    this.levels = {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    };

    // Load debug mode from storage
    this.loadDebugMode();
  }

  async loadDebugMode() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get('debugMode');
        this.debugMode = result.debugMode || false;
      }
    } catch (error) {
      console.error('Failed to load debug mode:', error);
    }
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${this.prefix}][${timestamp}][${level.toUpperCase()}]`;

    if (data !== undefined) {
      return [prefix, message, data];
    }
    return [prefix, message];
  }

  error(message, data) {
    const args = this.formatMessage(this.levels.ERROR, message, data);
    console.error(...args);
  }

  warn(message, data) {
    const args = this.formatMessage(this.levels.WARN, message, data);
    console.warn(...args);
  }

  info(message, data) {
    const args = this.formatMessage(this.levels.INFO, message, data);
    console.info(...args);
  }

  debug(message, data) {
    if (!this.debugMode) return;
    const args = this.formatMessage(this.levels.DEBUG, message, data);
    console.log(...args);
  }

  group(label) {
    if (this.debugMode) {
      console.group(`[${this.prefix}] ${label}`);
    }
  }

  groupEnd() {
    if (this.debugMode) {
      console.groupEnd();
    }
  }

  time(label) {
    if (this.debugMode) {
      console.time(`[${this.prefix}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this.debugMode) {
      console.timeEnd(`[${this.prefix}] ${label}`);
    }
  }

  table(data) {
    if (this.debugMode) {
      console.table(data);
    }
  }
}

// Create global logger instance for content scripts
const logger = new Logger('DualSubs');

// Make logger available globally
if (typeof window !== 'undefined') {
  window.DualSubsLogger = logger;
}
