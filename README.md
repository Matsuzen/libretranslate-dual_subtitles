# Dual Subtitles for Streaming

A Chrome extension that displays dual subtitles (original + translated) simultaneously on Netflix, YouTube, and Hulu. Perfect for language learners!

## Features

- **Dual Subtitle Display**: Show original and translated subtitles at the same time
- **Multiple Platforms**: Works on Netflix, YouTube, and Hulu
- **Free Translation**: Uses LibreTranslate (free, open-source translation API)
- **Configurable Layouts**: Choose between "below original" or "side-by-side" modes
- **Smart Caching**: Aggressive caching to minimize translation requests
- **Auto-detect Language**: Automatically detect source language
- **30+ Languages**: Support for major world languages
- **Privacy-Focused**: All translation happens through LibreTranslate (no Google Translate tracking)

## Installation

### 1. Create Extension Icons

Before loading the extension, you need to create icon files:

```bash
cd icons
```

Create three PNG files:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

See `icons/README_ICONS.md` for detailed instructions.

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `/Users/julien.renald/personal/dual_translation` directory
5. The extension should now appear in your extensions list

### 3. Pin Extension (Optional)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Dual Subtitles for Streaming"
3. Click the pin icon to keep it visible

## Usage

### Quick Start

1. Navigate to Netflix, YouTube, or Hulu
2. Start playing a video with subtitles
3. Click the extension icon in Chrome toolbar
4. Enable the extension if not already enabled
5. Select your target translation language
6. Click "Save Settings"
7. Dual subtitles should appear automatically!

### Settings

Click the extension icon to access settings:

- **Enable/Disable**: Toggle the extension on/off
- **Original Language**: Select source language or use "Auto-detect"
- **Translation Language**: Choose target language for translation
- **Layout Mode**:
  - *Below Original*: Translated subtitle appears under the original
  - *Side by Side*: Subtitles appear next to each other
- **LibreTranslate API**: Use default or configure self-hosted instance
- **Debug Mode**: Enable console logging for troubleshooting

### Keyboard Shortcuts

Currently, there are no keyboard shortcuts. Control the extension via the popup interface.

## LibreTranslate Setup

### Using Default Public Instance

The extension uses `https://libretranslate.com` by default. This is:
- **Free** (with rate limits)
- **No API key required**
- **No tracking**

### Using Self-Hosted Instance (Recommended)

For unlimited translations and better privacy, host your own LibreTranslate instance:

#### Using Docker (Easiest)

```bash
docker run -d -p 5000:5000 libretranslate/libretranslate
```

Then set the API endpoint in extension settings to `http://localhost:5000`.

#### Using pip

```bash
pip install libretranslate
libretranslate
```

For detailed setup instructions, visit: https://github.com/LibreTranslate/LibreTranslate

## Supported Platforms

- **Netflix** ✅
  - Movies and TV shows
  - Text-based subtitles
  - Fullscreen mode supported

- **YouTube** ✅
  - Regular videos
  - Auto-generated captions
  - Manual captions
  - Fullscreen mode supported

- **Hulu** ✅
  - On-demand content
  - Live TV (experimental)
  - Fullscreen mode supported

## Supported Languages

The extension supports 30+ languages including:

Arabic, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Norwegian, Polish, Portuguese, Romanian, Russian, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese

*Note: Language availability depends on your LibreTranslate instance.*

## Troubleshooting

### Subtitles Not Appearing

1. **Check if subtitles are enabled**: Make sure the platform's native subtitles are turned on
2. **Refresh the page**: Sometimes the extension needs a page refresh to initialize
3. **Check extension status**: Click the extension icon and ensure it's enabled
4. **Check platform**: Verify you're on Netflix, YouTube, or Hulu
5. **Enable debug mode**: Turn on debug mode in settings and check browser console (F12) for errors

### Translation Not Working

1. **Check API endpoint**: Verify LibreTranslate API is accessible
2. **Test connection**: Try accessing the API endpoint in your browser
3. **Check rate limits**: Public LibreTranslate instance has rate limits
4. **Clear cache**: Click "Clear Cache" in extension settings
5. **Check console**: Enable debug mode and look for API errors

### Subtitles Overlapping

1. **Adjust layout**: Try switching between "Below" and "Side by Side" modes
2. **Check browser zoom**: Reset browser zoom to 100%
3. **Fullscreen issues**: Exit and re-enter fullscreen mode

### Platform-Specific Issues

**Netflix:**
- If subtitles disappear, try pausing and resuming the video
- Netflix may update their player - check for extension updates

**YouTube:**
- Auto-captions may update word-by-word - this is normal
- Try using manual captions instead of auto-generated

**Hulu:**
- Ad breaks may reset subtitle tracking
- Try refreshing after ads complete

## Performance Tips

1. **Use self-hosted LibreTranslate**: Faster and no rate limits
2. **Enable caching**: Keep cache enabled (default)
3. **Use common language pairs**: Popular languages translate faster
4. **Avoid auto-detect**: Specify source language if known

## Privacy

This extension:
- ✅ Does NOT collect any user data
- ✅ Does NOT track your viewing history
- ✅ Only sends subtitle text to LibreTranslate for translation
- ✅ Works entirely in your browser
- ✅ No analytics or tracking scripts

LibreTranslate (default translation service):
- Open-source translation API
- No tracking or data collection
- Can be self-hosted for complete privacy

## Development

### Project Structure

```
dual_translation/
├── manifest.json              # Extension manifest (v3)
├── icons/                     # Extension icons
├── utils/                     # Utility modules
│   ├── constants.js          # Constants and configuration
│   ├── logger.js             # Logging utility
│   └── storage.js            # Chrome storage wrapper
├── background/               # Background service worker
│   └── service-worker.js
├── content/                  # Content scripts
│   ├── main.js              # Entry point & platform detection
│   ├── core/                # Core functionality
│   │   ├── cache-manager.js
│   │   ├── translation-manager.js
│   │   ├── subtitle-queue.js
│   │   ├── dom-injector.js
│   │   └── subtitle-renderer.js
│   ├── extractors/          # Platform-specific extractors
│   │   ├── base-extractor.js
│   │   ├── netflix-extractor.js
│   │   ├── youtube-extractor.js
│   │   └── hulu-extractor.js
│   └── styles/              # Injected CSS
│       ├── base.css
│       ├── netflix.css
│       ├── youtube.css
│       └── hulu.css
└── popup/                   # Extension popup UI
    ├── popup.html
    ├── popup.css
    └── popup.js
```

### Architecture

The extension uses a modular architecture:

1. **Platform Detection**: Identifies current streaming platform
2. **Subtitle Extraction**: Platform-specific extractors monitor DOM for subtitle changes
3. **Translation**: LibreTranslate API integration with request queuing and caching
4. **Rendering**: Dual subtitle overlay with configurable layouts
5. **Settings Management**: Chrome storage sync for cross-device settings

### Key Components

- **Cache Manager**: Two-tier LRU cache (memory + storage)
- **Translation Manager**: Request queuing, rate limiting, retry logic
- **Subtitle Queue**: Manages subtitle timing and synchronization
- **Extractors**: MutationObserver-based subtitle detection
- **Renderer**: Configurable dual subtitle display

### Adding New Platforms

To add support for a new streaming platform:

1. Create new extractor in `content/extractors/[platform]-extractor.js`
2. Extend `BaseExtractor` class
3. Implement required methods: `init()`, `extractText()`, `getSelectors()`, `getDebounceDelay()`
4. Add platform constants to `utils/constants.js`
5. Add platform detection to `content/main.js`
6. Create platform-specific CSS in `content/styles/[platform].css`
7. Update `manifest.json` content_scripts section

## Known Issues

- Netflix may update their player structure, breaking subtitle detection
- YouTube auto-captions may cause rapid re-translation (mitigated with debouncing)
- Hulu has multiple player variations that may behave differently
- Some platform updates may require extension updates

## Roadmap

Future enhancements:
- [ ] Add support for Amazon Prime Video, Disney+
- [ ] Customizable subtitle styling (font, size, colors)
- [ ] Keyboard shortcuts
- [ ] Alternative translation APIs (DeepL, Google Translate)
- [ ] Offline subtitle file support
- [ ] Subtitle download/export
- [ ] Machine learning for context-aware translation
- [ ] Synchronized reading mode

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on all supported platforms
5. Submit a pull request

## License

This project is open source. Feel free to use, modify, and distribute.

## Acknowledgments

- **LibreTranslate**: Free and open-source translation API
- **Chrome Extension API**: For making browser extensions possible
- Language learners worldwide who inspired this project

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check troubleshooting section above
- Enable debug mode and check console for errors

## Disclaimer

This extension is not affiliated with Netflix, YouTube, Hulu, or LibreTranslate. It is an independent project created to help language learners. Use at your own discretion.
