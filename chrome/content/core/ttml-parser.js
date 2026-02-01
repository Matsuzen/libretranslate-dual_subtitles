// TTML (Timed Text Markup Language) Parser for Netflix subtitles

class TTMLParser {
  constructor() {
    this.logger = window.DualSubsLogger;
    // Netflix uses 10,000,000 ticks per second
    this.TICKS_PER_SECOND = 10000000;
  }

  /**
   * Parse TTML content and extract subtitles with timestamps
   * @param {string} ttmlContent - Raw TTML XML content
   * @returns {Array<{id: string, startTime: number, endTime: number, text: string}>}
   */
  parse(ttmlContent) {
    const subtitles = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ttmlContent, 'application/xml');

      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        this.logger?.error('TTML parsing error:', parseError.textContent);
        return subtitles;
      }

      // Find all <p> elements with subtitle content
      const paragraphs = doc.querySelectorAll('p[xml\\:id^="subtitle"], p[begin]');

      paragraphs.forEach((p) => {
        const id = p.getAttribute('xml:id') || p.getAttribute('id') || '';
        const beginAttr = p.getAttribute('begin');
        const endAttr = p.getAttribute('end');

        if (!beginAttr || !endAttr) {
          return;
        }

        // Parse timestamps
        const startTime = this.parseTimestamp(beginAttr);
        const endTime = this.parseTimestamp(endAttr);

        // Extract text content (handle nested spans)
        const text = this.extractText(p);

        if (text && startTime !== null && endTime !== null) {
          subtitles.push({
            id,
            startTime,
            endTime,
            text
          });
        }
      });

      this.logger?.info(`Parsed ${subtitles.length} raw subtitles from TTML`);

      // Combine overlapping subtitles (Netflix displays multiple lines together)
      const combined = this.combineOverlappingSubtitles(subtitles);
      this.logger?.info(`Combined into ${combined.length} subtitles`);

      return combined;

    } catch (error) {
      this.logger?.error('Error parsing TTML:', error);
    }

    return subtitles;
  }

  /**
   * Combine subtitles that have overlapping time ranges
   * Netflix often splits multi-line subtitles into separate <p> elements
   * @param {Array} subtitles - Raw parsed subtitles
   * @returns {Array} - Combined subtitles
   */
  combineOverlappingSubtitles(subtitles) {
    if (subtitles.length === 0) return subtitles;

    const combined = [];
    let current = null;

    for (const subtitle of subtitles) {
      if (!current) {
        current = { ...subtitle };
        continue;
      }

      // Check if this subtitle overlaps with the current one
      // Overlapping means: starts before the current one ends
      const overlaps = subtitle.startTime < current.endTime &&
                       subtitle.startTime >= current.startTime;

      if (overlaps) {
        // Combine the text
        current.text = current.text + ' ' + subtitle.text;
        // Extend the end time if needed
        current.endTime = Math.max(current.endTime, subtitle.endTime);
      } else {
        // No overlap, save current and start new
        combined.push(current);
        current = { ...subtitle };
      }
    }

    // Don't forget the last one
    if (current) {
      combined.push(current);
    }

    return combined;
  }

  /**
   * Parse Netflix timestamp format
   * Netflix uses tick format: "19592916t" where t = ticks (10M ticks/sec)
   * Also supports standard format: "00:01:23.456"
   * @param {string} timestamp
   * @returns {number|null} Time in milliseconds
   */
  parseTimestamp(timestamp) {
    if (!timestamp) return null;

    // Tick format (e.g., "19592916t")
    if (timestamp.endsWith('t')) {
      const ticks = parseInt(timestamp.slice(0, -1), 10);
      if (!isNaN(ticks)) {
        // Convert ticks to milliseconds
        return Math.round((ticks / this.TICKS_PER_SECOND) * 1000);
      }
    }

    // Standard time format (e.g., "00:01:23.456" or "00:01:23,456")
    const timeMatch = timestamp.match(/^(\d+):(\d+):(\d+)[.,]?(\d+)?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseInt(timeMatch[3], 10);
      const ms = timeMatch[4] ? parseInt(timeMatch[4].padEnd(3, '0').slice(0, 3), 10) : 0;

      return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
    }

    // Seconds format (e.g., "123.456s")
    if (timestamp.endsWith('s')) {
      const seconds = parseFloat(timestamp.slice(0, -1));
      if (!isNaN(seconds)) {
        return Math.round(seconds * 1000);
      }
    }

    this.logger?.warn('Unknown timestamp format:', timestamp);
    return null;
  }

  /**
   * Extract text content from a paragraph element
   * Handles nested spans and preserves line breaks
   * @param {Element} element
   * @returns {string}
   */
  extractText(element) {
    let text = '';

    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'br') {
          text += ' ';
        } else {
          text += this.extractText(node);
        }
      }
    });

    // Clean up the text (keep it as close to DOM output as possible)
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
  }

  /**
   * Find subtitle at a specific time
   * @param {Array} subtitles - Parsed subtitles array
   * @param {number} timeMs - Current time in milliseconds
   * @returns {Object|null} - Matching subtitle or null
   */
  findSubtitleAtTime(subtitles, timeMs) {
    return subtitles.find(
      (sub) => timeMs >= sub.startTime && timeMs <= sub.endTime
    ) || null;
  }

  /**
   * Find upcoming subtitles within a time window
   * @param {Array} subtitles - Parsed subtitles array
   * @param {number} currentTimeMs - Current time in milliseconds
   * @param {number} windowMs - Look-ahead window in milliseconds
   * @returns {Array} - Upcoming subtitles
   */
  findUpcomingSubtitles(subtitles, currentTimeMs, windowMs = 3000) {
    return subtitles.filter(
      (sub) => sub.startTime > currentTimeMs && sub.startTime <= currentTimeMs + windowMs
    );
  }
}

// Create global instance
const ttmlParser = new TTMLParser();

// Make available globally
if (typeof window !== 'undefined') {
  window.DualSubsTTMLParser = ttmlParser;
}
