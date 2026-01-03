package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	color.Cyan("\n🎉 You can now use the LibreTranslate server.\n\n")
	color.White("   Quick start (simple launcher):\n")
	color.Green("     ./start-server\n\n")
	color.White("   Advanced (full CLI with options):\n")
	color.Green("     ./libretranslate-server start\n")
	color.Green("     ./libretranslate-server --help\n")

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
	color.Cyan("🔍 Step 1/4: Checking Python installation...\n")

	// Check Python
	if err := checkPython(); err != nil {
		color.Yellow("\n⚠️  Python not found!\n")
		printPythonInstallInstructions()
		return fmt.Errorf("please install Python 3.8+ and run this installer again")
	}
	color.Green("  ✓ Python is installed\n")

	color.Cyan("\n🔍 Step 2/4: Checking pip installation...\n")

	// Check pip
	if err := checkPip(); err != nil {
		color.Yellow("\n⚠️  pip not found!\n")
		return fmt.Errorf("please install pip and run this installer again")
	}
	color.Green("  ✓ pip is installed\n")

	color.Cyan("\n📦 Step 3/4: Installing LibreTranslate...\n")

	// Check if already installed
	skipLibreTranslate := false
	if err := checkLibreTranslate(); err == nil {
		color.Yellow("  ℹ LibreTranslate is already installed\n")

		// Ask if user wants to reinstall
		color.White("\n  Do you want to reinstall/update LibreTranslate? (y/N): ")
		reader := bufio.NewReader(os.Stdin)
		response, _ := reader.ReadString('\n')
		response = strings.ToLower(strings.TrimSpace(response))

		if response != "y" && response != "yes" {
			color.Cyan("  Skipping installation\n")
			skipLibreTranslate = true
		}
	}

	if !skipLibreTranslate {
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
	}

	// Build server executables
	color.Cyan("\n🔨 Step 4/4: Building server executables...\n")

	// Build main server binary
	if err := buildServerExecutable(); err != nil {
		return fmt.Errorf("failed to build server executable: %w", err)
	}
	color.Green("  ✓ Server executable built successfully\n")

	// Build launcher binary
	if err := buildLauncherExecutable(); err != nil {
		return fmt.Errorf("failed to build launcher executable: %w", err)
	}
	color.Green("  ✓ Launcher executable built successfully\n")

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

// buildServerExecutable extracts embedded source files and builds the server executable
func buildServerExecutable() error {
	// Check if Go is installed
	if _, err := exec.LookPath("go"); err != nil {
		color.Yellow("  ⚠️  Go compiler not found, skipping server build\n")
		color.Yellow("  You'll need to build the server manually from source\n")
		return nil
	}

	// Create temporary directory for building
	tmpDir, err := os.MkdirTemp("", "libretranslate-server-build-*")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	color.Cyan("  Extracting source files...\n")

	// Write embedded source files to temp directory
	for filename, content := range embeddedSources {
		filePath := filepath.Join(tmpDir, filename)
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", filename, err)
		}
	}

	// Download dependencies
	color.Cyan("  Downloading Go dependencies...\n")
	cmd := exec.Command("go", "mod", "download")
	cmd.Dir = tmpDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download dependencies: %w\n%s", err, output)
	}

	// Build the server executable
	color.Cyan("  Compiling server...\n")

	// Determine output binary name
	binaryName := "libretranslate-server"
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}

	// Get current working directory to place the binary
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	outputPath := filepath.Join(cwd, binaryName)

	// Build command
	cmd = exec.Command("go", "build",
		"-ldflags=-X 'main.version=1.0.0'",
		"-o", outputPath,
		"main.go", "dependencies.go", "server.go", "web.go", "languages.go")
	cmd.Dir = tmpDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to build server: %w\n%s", err, output)
	}

	// Make executable on Unix systems
	if runtime.GOOS != "windows" {
		if err := os.Chmod(outputPath, 0755); err != nil {
			return fmt.Errorf("failed to make executable: %w", err)
		}
	}

	color.Green("  ✓ Server executable created: %s\n", binaryName)

	return nil
}

// buildLauncherExecutable extracts embedded source files and builds the launcher executable
func buildLauncherExecutable() error {
	// Check if Go is installed
	if _, err := exec.LookPath("go"); err != nil {
		color.Yellow("  ⚠️  Go compiler not found, skipping launcher build\n")
		return nil
	}

	// Create temporary directory for building
	tmpDir, err := os.MkdirTemp("", "libretranslate-launcher-build-*")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	color.Cyan("  Extracting launcher source files...\n")

	// Write embedded source files to temp directory
	for filename, content := range embeddedLauncherSources {
		filePath := filepath.Join(tmpDir, filename)
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to write %s: %w", filename, err)
		}
	}

	// Download dependencies (use cached if available)
	cmd := exec.Command("go", "mod", "download")
	cmd.Dir = tmpDir
	cmd.Run() // Ignore error, may be cached

	// Build the launcher executable
	color.Cyan("  Compiling launcher...\n")

	// Determine output binary name
	binaryName := "start-server"
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}

	// Get current working directory to place the binary
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	outputPath := filepath.Join(cwd, binaryName)

	// Build command
	cmd = exec.Command("go", "build",
		"-ldflags=-X 'main.version=1.0.0'",
		"-o", outputPath,
		"launcher_main.go", "dependencies.go", "server.go", "web.go", "languages.go")
	cmd.Dir = tmpDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to build launcher: %w\n%s", err, output)
	}

	// Make executable on Unix systems
	if runtime.GOOS != "windows" {
		if err := os.Chmod(outputPath, 0755); err != nil {
			return fmt.Errorf("failed to make executable: %w", err)
		}
	}

	color.Green("  ✓ Launcher executable created: %s\n", binaryName)

	return nil
}
