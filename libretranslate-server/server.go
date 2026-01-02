package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/fatih/color"
)

var pidFile = filepath.Join(os.TempDir(), "libretranslate.pid")

// startServer starts the LibreTranslate server
func startServer(host string, port int, verbose bool) error {
	// Check if already running
	if isServerRunning(port) {
		color.Yellow("⚠️  Server already running on port %d\n", port)
		return nil
	}

	color.Green("✅ Starting LibreTranslate server on %s:%d\n", host, port)

	// Build command
	args := []string{
		"--host", host,
		"--port", strconv.Itoa(port),
	}

	if verbose {
		args = append(args, "--debug")
	}

	cmd := exec.Command(getLibreTranslateCommand(), args...)

	// Set up output pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start the server
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start server: %w", err)
	}

	// Save PID
	if err := savePID(cmd.Process.Pid); err != nil {
		color.Yellow("⚠️  Warning: could not save PID: %v\n", err)
	}

	// Handle output
	go streamOutput(stdout, "INFO")
	go streamOutput(stderr, "ERROR")

	// Wait for server to be ready
	color.Cyan("⏳ Waiting for server to be ready (this may take 1-3 minutes on first startup)...\n")
	color.Yellow("   LibreTranslate needs to load AI models, please be patient...\n\n")
	if err := waitForServer(port, 3*time.Minute); err != nil {
		cmd.Process.Kill()
		return fmt.Errorf("server failed to start: %w", err)
	}

	color.Green("✅ Server is ready!\n")
	color.Cyan("📡 LibreTranslate API: http://%s:%d\n", host, port)
	color.Cyan("🌐 Web Interface: http://%s:%d/frontend/v1.2.1/index.html\n", host, port)
	color.Yellow("\n💡 Press Ctrl+C to stop the server\n\n")

	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Wait for signal or process to exit
	go func() {
		<-sigChan
		color.Yellow("\n🛑 Shutting down server...\n")
		cmd.Process.Signal(os.Interrupt)
		time.Sleep(2 * time.Second)
		cmd.Process.Kill()
		removePID()
		os.Exit(0)
	}()

	// Wait for process to complete
	if err := cmd.Wait(); err != nil {
		removePID()
		return fmt.Errorf("server exited with error: %w", err)
	}

	removePID()
	return nil
}

// stopServer stops a running LibreTranslate server
func stopServer(port int) error {
	pid, err := readPID()
	if err != nil {
		return fmt.Errorf("no server running (PID file not found)")
	}

	process, err := os.FindProcess(pid)
	if err != nil {
		removePID()
		return fmt.Errorf("server process not found")
	}

	// Send interrupt signal
	if err := process.Signal(os.Interrupt); err != nil {
		// Try SIGTERM
		if err := process.Signal(syscall.SIGTERM); err != nil {
			// Force kill
			process.Kill()
		}
	}

	// Wait a bit and verify
	time.Sleep(2 * time.Second)

	if isServerRunning(port) {
		return fmt.Errorf("server still running, try manual kill: kill %d", pid)
	}

	removePID()
	return nil
}

// checkStatus checks if the server is running
func checkStatus(port int) {
	if isServerRunning(port) {
		color.Green("✅ Server is running on port %d\n", port)

		// Try to get version info
		resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/languages", port))
		if err == nil {
			defer resp.Body.Close()
			color.Cyan("📡 API endpoint: http://127.0.0.1:%d\n", port)
			color.Cyan("🌐 Web interface: http://127.0.0.1:%d/frontend/v1.2.1/index.html\n", port)
		}
	} else {
		color.Red("❌ Server is not running on port %d\n", port)
	}
}

// isServerRunning checks if the server is responding
func isServerRunning(port int) bool {
	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/languages", port))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

// waitForServer waits for the server to be ready
func waitForServer(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	checkCount := 0
	for time.Now().Before(deadline) {
		if isServerRunning(port) {
			fmt.Println() // New line after dots
			return nil
		}

		select {
		case <-ticker.C:
			// Print a dot every 5 seconds to show progress
			checkCount++
			if checkCount%12 == 0 {
				// New line every minute
				fmt.Println()
			}
			fmt.Print(".")
		default:
			time.Sleep(500 * time.Millisecond)
		}
	}

	fmt.Println() // New line after dots
	return fmt.Errorf("server did not start within %v", timeout)
}

// streamOutput streams command output to console
func streamOutput(pipe io.ReadCloser, prefix string) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()
		if prefix == "ERROR" {
			color.Red("[%s] %s\n", prefix, line)
		} else {
			fmt.Printf("[%s] %s\n", prefix, line)
		}
	}
}

// savePID saves the process ID to a file
func savePID(pid int) error {
	return os.WriteFile(pidFile, []byte(strconv.Itoa(pid)), 0644)
}

// readPID reads the process ID from file
func readPID() (int, error) {
	data, err := os.ReadFile(pidFile)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(string(data))
}

// removePID removes the PID file
func removePID() {
	os.Remove(pidFile)
}
