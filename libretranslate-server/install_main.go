package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strings"

	"github.com/fatih/color"
)

func main() {
	// Clear screen for better UI
	clearScreen()

	// Print banner
	printBanner()

	// Run installation
	if err := runInstallProcess(); err != nil {
		color.Red("\n❌ Installation failed: %v\n", err)
		waitForUser()
		os.Exit(1)
	}

	color.Green("\n✅ Installation completed successfully!\n")
	color.Cyan("\n🎉 You can now use the LibreTranslate server.\n")
	color.White("   To start the server, run: ./libretranslate-server start\n")

	waitForUser()
}

func printBanner() {
	color.Cyan("╔════════════════════════════════════════════════════════╗\n")
	color.Cyan("║                                                        ║\n")
	color.Cyan("║         LibreTranslate Dependencies Installer          ║\n")
	color.Cyan("║                                                        ║\n")
	color.Cyan("╚════════════════════════════════════════════════════════╝\n\n")
}

func runInstallProcess() error {
	color.Cyan("🔍 Step 1/3: Checking Python installation...\n")

	// Check Python
	if err := checkPython(); err != nil {
		color.Yellow("\n⚠️  Python not found!\n")
		printPythonInstallInstructions()
		return fmt.Errorf("please install Python 3.8+ and run this installer again")
	}
	color.Green("  ✓ Python is installed\n")

	color.Cyan("\n🔍 Step 2/3: Checking pip installation...\n")

	// Check pip
	if err := checkPip(); err != nil {
		color.Yellow("\n⚠️  pip not found!\n")
		return fmt.Errorf("please install pip and run this installer again")
	}
	color.Green("  ✓ pip is installed\n")

	color.Cyan("\n📦 Step 3/3: Installing LibreTranslate...\n")

	// Check if already installed
	if err := checkLibreTranslate(); err == nil {
		color.Yellow("  ℹ LibreTranslate is already installed\n")

		// Ask if user wants to reinstall
		color.White("\n  Do you want to reinstall/update LibreTranslate? (y/N): ")
		reader := bufio.NewReader(os.Stdin)
		response, _ := reader.ReadString('\n')
		response = strings.ToLower(strings.TrimSpace(response))

		if response != "y" && response != "yes" {
			color.Cyan("  Skipping installation\n")
			return nil
		}
	}

	// Install LibreTranslate
	color.Cyan("\n  Installing LibreTranslate...\n")
	color.Yellow("  ⏳ This may take several minutes as it downloads language models...\n")
	color.Yellow("  Please be patient and don't close this window.\n\n")

	if err := installLibreTranslate(); err != nil {
		return err
	}

	// Verify installation
	color.Cyan("\n🔍 Verifying installation...\n")
	if err := checkLibreTranslate(); err != nil {
		return fmt.Errorf("installation completed but verification failed: %w", err)
	}

	return nil
}

func clearScreen() {
	switch runtime.GOOS {
	case "windows":
		// Windows clear screen is tricky in Go, skip it
	default:
		fmt.Print("\033[H\033[2J")
	}
}

func waitForUser() {
	color.White("\n\nPress Enter to exit...")
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}
