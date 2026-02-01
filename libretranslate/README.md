# LibreTranslate Server Manager

A simple, cross-platform Go application to manage your own LibreTranslate translation server. Perfect for the Dual Subtitles Chrome extension!

## Features

- **Easy Setup**: One command to install and run
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Web Interface**: Manage the server from your browser
- **CLI Commands**: Full command-line control
- **Auto-Install**: Automatically installs Python dependencies
- **Process Management**: Start, stop, and monitor the server

## Quick Start

### 1. Build the Application

```bash
cd libretranslate-server
go build -o libretranslate-server
```

For Windows:
```bash
go build -o libretranslate-server.exe
```

### 2. Install Dependencies

```bash
./libretranslate-server install
```

This will:
- Check for Python 3.8+
- Install LibreTranslate via pip
- Download necessary language models

### 3. Start the Server

```bash
./libretranslate-server start
```

The server will start on `http://127.0.0.1:5000` by default.

## Usage

### Command Line Interface

#### Start Server

```bash
./libretranslate-server start [flags]
```

Flags:
- `-p, --port int` - Port to run server on (default: 5000)
- `-H, --host string` - Host to bind to (default: "127.0.0.1")
- `-v, --verbose` - Enable verbose logging

Examples:
```bash
# Start on default port 5000
./libretranslate-server start

# Start on custom port
./libretranslate-server start --port 8080

# Start with verbose logging
./libretranslate-server start --verbose

# Allow external connections
./libretranslate-server start --host 0.0.0.0
```

#### Check Status

```bash
./libretranslate-server status
```

Check if server is running:
```bash
./libretranslate-server status --port 5000
```

#### Stop Server

```bash
./libretranslate-server stop
```

Stop server on specific port:
```bash
./libretranslate-server stop --port 5000
```

#### Web Management Interface

```bash
./libretranslate-server web
```

This starts a web interface on `http://localhost:8080` where you can:
- Start/stop the server
- Check status
- View server information
- Access LibreTranslate web UI

Custom port:
```bash
./libretranslate-server web --port 9000
```

### Web Interface

Access the web management interface at: `http://localhost:8080`

Features:
- Real-time server status
- One-click start/stop
- Links to LibreTranslate API and web interface
- Auto-refresh status

## Prerequisites

The application requires:
- **Python 3.8 or higher**
- **pip** (Python package manager)

### Installing Python

#### macOS
```bash
brew install python3
```

Or download from: https://www.python.org/downloads/

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install python3 python3-pip
```

#### Fedora
```bash
sudo dnf install python3 python3-pip
```

#### Windows
Download from: https://www.python.org/downloads/

**Important**: Check "Add Python to PATH" during installation

## Configuration

### Default Ports

- **LibreTranslate Server**: 5000
- **Web Management Interface**: 8080

### For Dual Subtitles Extension

After starting the server:

1. Open the Dual Subtitles extension settings
2. Set API Endpoint to: `http://localhost:5000`
3. Save settings
4. Enjoy unlimited free translations!

## Convenience Scripts

You can create simple scripts to quickly start/stop the server without typing commands.

### Windows (.bat files)

Create these files in the same directory as `libretranslate-server.exe`:

**start-server.bat** - Start the server:
```batch
@echo off
echo Starting LibreTranslate server...
libretranslate-server.exe start
pause
```

**stop-server.bat** - Stop the server:
```batch
@echo off
echo Stopping LibreTranslate server...
libretranslate-server.exe stop
pause
```

**status.bat** - Check server status:
```batch
@echo off
libretranslate-server.exe status
pause
```

**install-deps.bat** - Install dependencies:
```batch
@echo off
echo Installing LibreTranslate dependencies...
libretranslate-server.exe install
pause
```

Double-click any `.bat` file to run it.

### macOS/Linux (shell scripts)

Create these files in the same directory as `libretranslate-server`:

**start-server.sh**:
```bash
#!/bin/bash
./libretranslate-server start
```

**stop-server.sh**:
```bash
#!/bin/bash
./libretranslate-server stop
```

Make them executable:
```bash
chmod +x start-server.sh stop-server.sh
```

## Advanced Usage

### Background Server

To run the server in the background:

#### Linux/macOS
```bash
nohup ./libretranslate-server start > server.log 2>&1 &
```

#### Windows (PowerShell)
```powershell
Start-Process -FilePath "./libretranslate-server.exe" -ArgumentList "start" -WindowStyle Hidden
```

### System Service

#### Linux (systemd)

Create `/etc/systemd/system/libretranslate.service`:

```ini
[Unit]
Description=LibreTranslate Server
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/path/to/libretranslate-server start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable libretranslate
sudo systemctl start libretranslate
```

#### macOS (launchd)

Create `~/Library/LaunchAgents/com.libretranslate.server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.libretranslate.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/libretranslate-server</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load:
```bash
launchctl load ~/Library/LaunchAgents/com.libretranslate.server.plist
```

## Building from Source

### Requirements
- Go 1.21 or higher

### Build

```bash
# Clone or navigate to the directory
cd libretranslate-server

# Download dependencies
go mod download

# Build for current platform
make build

# Or build for all platforms (macOS, Linux, Windows)
make build-all
```

### Cross-Compilation

Build for multiple platforms:

```bash
# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o libretranslate-server-darwin-amd64

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o libretranslate-server-darwin-arm64

# Linux
GOOS=linux GOARCH=amd64 go build -o libretranslate-server-linux-amd64

# Windows
GOOS=windows GOARCH=amd64 go build -o libretranslate-server-windows-amd64.exe
```

## Troubleshooting

### Server Won't Start

1. **Check Python installation**:
   ```bash
   python3 --version
   ```
   Should show Python 3.8 or higher

2. **Check LibreTranslate installation**:
   ```bash
   ./libretranslate-server install
   ```

3. **Check port availability**:
   ```bash
   lsof -i :5000  # macOS/Linux
   netstat -ano | findstr :5000  # Windows
   ```

4. **View logs**:
   Run with verbose flag:
   ```bash
   ./libretranslate-server start --verbose
   ```

### Port Already in Use

Stop any existing LibreTranslate servers:
```bash
./libretranslate-server stop
```

Or use a different port:
```bash
./libretranslate-server start --port 5001
```

### Permission Denied

Make sure the binary is executable:
```bash
chmod +x libretranslate-server
```

### LibreTranslate Install Fails

Try manual installation:
```bash
pip3 install libretranslate
```

Or with user flag:
```bash
pip3 install --user libretranslate
```

## API Endpoints

When the server is running, LibreTranslate provides these endpoints:

- `GET /languages` - List available languages
- `POST /translate` - Translate text
- `GET /frontend/v1.2.1/index.html` - Web interface
- `GET /docs` - API documentation

### Example Translation Request

```bash
curl -X POST http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "q": "Hello, world!",
    "source": "en",
    "target": "es",
    "format": "text"
  }'
```

Response:
```json
{
  "translatedText": "¡Hola, mundo!"
}
```

## Performance Tips

1. **Use local server**: Much faster than public LibreTranslate instances
2. **Keep server running**: Avoid startup time for each use
3. **Use SSD**: Faster model loading
4. **Allocate RAM**: Language models need memory (2-4 GB recommended)

## Privacy

This application:
- ✅ Runs entirely on your machine
- ✅ No data sent to external servers
- ✅ No tracking or analytics
- ✅ Open-source dependencies

LibreTranslate:
- Open-source translation engine
- Uses Argos Translate models
- Completely offline after model download
- No telemetry or data collection

## Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

This project is open source. LibreTranslate is licensed under AGPL-3.0.

## Acknowledgments

- **LibreTranslate**: https://github.com/LibreTranslate/LibreTranslate
- **Argos Translate**: https://github.com/argosopentech/argos-translate
- **Cobra CLI**: https://github.com/spf13/cobra
- **Color**: https://github.com/fatih/color

## Support

For issues or questions:
- Check troubleshooting section
- Review LibreTranslate documentation
- Open an issue on GitHub

## Related Projects

- **Dual Subtitles Extension**: Chrome extension using this server
- **LibreTranslate**: The underlying translation engine
- **Argos Translate**: Translation models
