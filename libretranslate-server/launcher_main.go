package main

import (
	"bufio"
	"os"
	"runtime"

	"github.com/fatih/color"
)

var version = "1.0.0"

func main() {
	// Clear screen for better UI
	clearScreen()

	// Print banner
	printLauncherBanner()

	// Check dependencies first
	color.Cyan("🔍 Checking dependencies...\n")
	if err := checkDependencies(); err != nil {
		color.Red("\n❌ Dependencies not met: %v\n", err)
		color.Yellow("\n💡 Please run the 'install' executable first to set up dependencies.\n")
		waitForUser()
		os.Exit(1)
	}
	color.Green("✅ All dependencies are installed\n\n")

	// Start server with default settings
	color.Cyan("🚀 Starting LibreTranslate Server v%s\n\n", version)

	host := "127.0.0.1"
	port := 5000
	verbose := false

	if err := startServer(host, port, verbose); err != nil {
		color.Red("\n❌ Failed to start server: %v\n", err)
		waitForUser()
		os.Exit(1)
	}
}

func printLauncherBanner() {
	color.Cyan("╔════════════════════════════════════════════════════════╗\n")
	color.Cyan("║                                                        ║\n")
	color.Cyan("║         LibreTranslate Server Launcher v%s         ║\n", version)
	color.Cyan("║                                                        ║\n")
	color.Cyan("╚════════════════════════════════════════════════════════╝\n\n")
}

func clearScreen() {
	switch runtime.GOOS {
	case "windows":
		// Windows clear screen is tricky in Go, skip it
	default:
		// Unix-like systems
		color.Set(color.Reset)
	}
}

func waitForUser() {
	color.White("\n\nPress Enter to exit...")
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}
