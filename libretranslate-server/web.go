package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"strconv"

	"github.com/fatih/color"
)

// libreTranslatePort is the port where LibreTranslate server runs
var libreTranslatePort = 5000

// startWebInterface starts the web management interface
func startWebInterface(port int) error {
	http.HandleFunc("/", handleHome)
	http.HandleFunc("/api/status", handleStatus)
	http.HandleFunc("/api/start", handleStartAPI)
	http.HandleFunc("/api/stop", handleStopAPI)
	http.HandleFunc("/translate", handleTranslateProxy)
	http.HandleFunc("/languages", handleLanguagesProxy)

	addr := fmt.Sprintf(":%d", port)
	color.Green("✅ Web interface running at http://localhost:%d\n", port)
	color.Yellow("💡 Press Ctrl+C to stop\n\n")

	return http.ListenAndServe(addr, nil)
}

// handleHome serves the main web interface
func handleHome(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.New("home").Parse(homeTemplate))
	tmpl.Execute(w, nil)
}

// handleStatus returns the server status as JSON
func handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	portStr := r.URL.Query().Get("port")
	port := 5000
	if portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	status := map[string]interface{}{
		"running": isServerRunning(port),
		"port":    port,
	}

	json.NewEncoder(w).Encode(status)
}

// handleStartAPI handles starting the server via API
func handleStartAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	portStr := r.FormValue("port")
	port := 5000
	if portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	// Start in background
	go func() {
		startServer("127.0.0.1", port, false)
	}()

	response := map[string]interface{}{
		"success": true,
		"message": "Server starting...",
		"port":    port,
	}

	json.NewEncoder(w).Encode(response)
}

// handleStopAPI handles stopping the server via API
func handleStopAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	portStr := r.FormValue("port")
	port := 5000
	if portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	err := stopServer(port)

	response := map[string]interface{}{
		"success": err == nil,
		"message": "Server stopped",
	}

	if err != nil {
		response["message"] = err.Error()
	}

	json.NewEncoder(w).Encode(response)
}

// setCORSHeaders sets CORS headers required for browser extensions to access localhost
func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "*"
	}

	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	// Required for Private Network Access (Chrome 94+)
	w.Header().Set("Access-Control-Allow-Private-Network", "true")
}

// handleTranslateProxy proxies translation requests to LibreTranslate with CORS headers
func handleTranslateProxy(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Proxy the request to LibreTranslate
	targetURL := fmt.Sprintf("http://127.0.0.1:%d/translate", libreTranslatePort)

	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}

	// Copy headers
	proxyReq.Header.Set("Content-Type", r.Header.Get("Content-Type"))

	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		http.Error(w, fmt.Sprintf("LibreTranslate server not responding: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	io.Copy(w, resp.Body)
}

// handleLanguagesProxy proxies language list requests to LibreTranslate with CORS headers
func handleLanguagesProxy(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Proxy the request to LibreTranslate
	targetURL := fmt.Sprintf("http://127.0.0.1:%d/languages", libreTranslatePort)

	resp, err := http.Get(targetURL)
	if err != nil {
		http.Error(w, fmt.Sprintf("LibreTranslate server not responding: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	io.Copy(w, resp.Body)
}

// HTML template for web interface
const homeTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LibreTranslate Server Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        .status-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #dc3545;
        }

        .status-dot.running {
            background: #28a745;
        }

        .status-text {
            font-size: 16px;
            font-weight: 500;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-top: 1px solid #dee2e6;
        }

        .info-label {
            color: #666;
            font-size: 14px;
        }

        .info-value {
            color: #333;
            font-weight: 500;
            font-size: 14px;
        }

        .controls {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        button {
            flex: 1;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-start {
            background: #28a745;
            color: white;
        }

        .btn-start:hover {
            background: #218838;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .btn-stop {
            background: #dc3545;
            color: white;
        }

        .btn-stop:hover {
            background: #c82333;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .btn-refresh {
            background: #667eea;
            color: white;
        }

        .btn-refresh:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .links {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }

        .link {
            display: block;
            color: #667eea;
            text-decoration: none;
            padding: 8px 0;
            font-size: 14px;
        }

        .link:hover {
            text-decoration: underline;
        }

        .message {
            padding: 12px;
            border-radius: 8px;
            margin-top: 15px;
            font-size: 14px;
            display: none;
        }

        .message.success {
            background: #d4edda;
            color: #155724;
            display: block;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 LibreTranslate Server</h1>
        <p class="subtitle">Management Interface</p>

        <div class="status-card">
            <div class="status-indicator">
                <div class="status-dot" id="statusDot"></div>
                <span class="status-text" id="statusText">Checking...</span>
            </div>

            <div class="info-row">
                <span class="info-label">Port</span>
                <span class="info-value" id="portValue">5000</span>
            </div>

            <div class="info-row" id="apiLinkRow" style="display: none;">
                <span class="info-label">API Endpoint</span>
                <a href="" target="_blank" class="info-value" id="apiLink">Open</a>
            </div>
        </div>

        <div class="controls">
            <button class="btn-start" id="startBtn" onclick="startServer()">Start Server</button>
            <button class="btn-stop" id="stopBtn" onclick="stopServer()">Stop Server</button>
            <button class="btn-refresh" onclick="checkStatus()">Refresh</button>
        </div>

        <div class="message" id="message"></div>

        <div class="links">
            <a href="http://localhost:5000/frontend/v1.2.1/index.html" target="_blank" class="link">
                📱 Open LibreTranslate Web Interface
            </a>
            <a href="http://localhost:5000/docs" target="_blank" class="link">
                📚 API Documentation
            </a>
        </div>
    </div>

    <script>
        let port = 5000;

        function checkStatus() {
            fetch('/api/status?port=' + port)
                .then(res => res.json())
                .then(data => {
                    updateUI(data.running);
                });
        }

        function startServer() {
            showMessage('Starting server...', 'success');
            fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'port=' + port
            })
            .then(res => res.json())
            .then(data => {
                showMessage(data.message, data.success ? 'success' : 'error');
                setTimeout(checkStatus, 3000);
            });
        }

        function stopServer() {
            showMessage('Stopping server...', 'success');
            fetch('/api/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'port=' + port
            })
            .then(res => res.json())
            .then(data => {
                showMessage(data.message, data.success ? 'success' : 'error');
                setTimeout(checkStatus, 1000);
            });
        }

        function updateUI(running) {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            const apiLinkRow = document.getElementById('apiLinkRow');
            const apiLink = document.getElementById('apiLink');

            if (running) {
                statusDot.classList.add('running');
                statusText.textContent = 'Server Running';
                startBtn.disabled = true;
                stopBtn.disabled = false;
                apiLinkRow.style.display = 'flex';
                apiLink.href = 'http://localhost:' + port;
            } else {
                statusDot.classList.remove('running');
                statusText.textContent = 'Server Stopped';
                startBtn.disabled = false;
                stopBtn.disabled = true;
                apiLinkRow.style.display = 'none';
            }
        }

        function showMessage(msg, type) {
            const message = document.getElementById('message');
            message.textContent = msg;
            message.className = 'message ' + type;

            setTimeout(() => {
                message.className = 'message';
            }, 3000);
        }

        // Check status on load
        checkStatus();
        setInterval(checkStatus, 5000);
    </script>
</body>
</html>
`
