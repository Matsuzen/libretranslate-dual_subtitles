package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/fatih/color"
)

// checkDependencies checks if required dependencies are installed
func checkDependencies() error {
	color.Cyan("🔍 Checking dependencies...\n")

	// Check Python
	if err := checkPython(); err != nil {
		return err
	}

	// Check pip
	if err := checkPip(); err != nil {
		return err
	}

	// Check LibreTranslate
	if err := checkLibreTranslate(); err != nil {
		return err
	}

	color.Green("✅ All dependencies are installed\n")
	return nil
}

// installDependencies installs required dependencies
func installDependencies() error {
	// Check Python first
	if err := checkPython(); err != nil {
		color.Yellow("⚠️  Python not found\n")
		printPythonInstallInstructions()
		return fmt.Errorf("please install Python 3.8+ first")
	}

	// Check pip
	if err := checkPip(); err != nil {
		color.Yellow("⚠️  pip not found\n")
		return fmt.Errorf("please install pip first")
	}

	// Install LibreTranslate
	color.Cyan("📦 Installing LibreTranslate...\n")
	if err := installLibreTranslate(); err != nil {
		return err
	}

	color.Green("✅ LibreTranslate installed successfully\n")
	return nil
}

// checkPython checks if Python 3.8+ is installed
func checkPython() error {
	pythonCmd := getPythonCommand()

	cmd := exec.Command(pythonCmd, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("python not found")
	}

	version := string(output)
	color.Green("  ✓ Python: %s", version)

	// Basic version check
	if !strings.Contains(version, "Python 3.") {
		return fmt.Errorf("Python 3.8+ required, found: %s", version)
	}

	return nil
}

// checkPip checks if pip is installed
func checkPip() error {
	pipCmd := getPipCommand()

	cmd := exec.Command(pipCmd, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pip not found")
	}

	version := string(output)
	color.Green("  ✓ pip: %s", strings.TrimSpace(version))
	return nil
}

// checkLibreTranslate checks if LibreTranslate is installed
func checkLibreTranslate() error {
	// Try to import libretranslate module
	pythonCmd := getPythonCommand()
	cmd := exec.Command(pythonCmd, "-c", "import libretranslate")
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("LibreTranslate not installed")
	}

	// Get version using the libretranslate command
	ltCmd := getLibreTranslateCommand()
	cmd = exec.Command(ltCmd, "--version")
	output, err := cmd.CombinedOutput()

	version := strings.TrimSpace(string(output))
	if err != nil || version == "" {
		// If version command fails, just confirm it's installed
		version = "installed"
	}

	color.Green("  ✓ LibreTranslate: %s\n", version)
	return nil
}

// getLibreTranslateCommand returns the command to run LibreTranslate
func getLibreTranslateCommand() string {
	// Try to find libretranslate command in PATH
	if path, err := exec.LookPath("libretranslate"); err == nil {
		return path
	}

	// Fallback: construct path based on Python location
	pythonCmd := getPythonCommand()
	cmd := exec.Command(pythonCmd, "-c", "import sys; print(sys.executable)")
	output, err := cmd.Output()
	if err == nil {
		pythonPath := strings.TrimSpace(string(output))
		// Get the bin directory from python path
		binDir := filepath.Dir(pythonPath)
		ltPath := filepath.Join(binDir, "libretranslate")

		// Check if it exists
		if info, err := os.Stat(ltPath); err == nil {
			// Make sure it's executable
			if info.Mode()&0111 != 0 {
				return ltPath
			}
		}
	}

	// Try pip show to find the scripts location
	pipCmd := getPipCommand()
	cmd = exec.Command(pipCmd, "show", "-f", "libretranslate")
	output, err = cmd.Output()
	if err == nil {
		// Parse the location from pip show output
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "Location:") {
				location := strings.TrimSpace(strings.TrimPrefix(line, "Location:"))
				// The bin directory is typically ../../../bin from site-packages
				binDir := filepath.Join(location, "..", "..", "..", "bin")
				ltPath := filepath.Join(binDir, "libretranslate")

				// Resolve any .. in the path
				ltPath, _ = filepath.Abs(ltPath)

				if info, err := os.Stat(ltPath); err == nil && info.Mode()&0111 != 0 {
					return ltPath
				}
			}
		}
	}

	// Last resort: just return "libretranslate" and hope it's in PATH
	return "libretranslate"
}

// installLibreTranslate installs LibreTranslate using pip
func installLibreTranslate() error {
	pipCmd := getPipCommand()

	color.Cyan("  Installing libretranslate package...\n")
	color.Yellow("  This may take several minutes as it downloads language models...\n\n")

	cmd := exec.Command(pipCmd, "install", "libretranslate")
	cmd.Stdout = color.Output
	cmd.Stderr = color.Error

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install LibreTranslate: %w", err)
	}

	return nil
}

// getPythonCommand returns the appropriate Python command for the OS
func getPythonCommand() string {
	if runtime.GOOS == "windows" {
		return "python"
	}
	// Try python3 first, fall back to python
	if _, err := exec.LookPath("python3"); err == nil {
		return "python3"
	}
	return "python"
}

// getPipCommand returns the appropriate pip command for the OS
func getPipCommand() string {
	if runtime.GOOS == "windows" {
		return "pip"
	}
	// Try pip3 first, fall back to pip
	if _, err := exec.LookPath("pip3"); err == nil {
		return "pip3"
	}
	return "pip"
}

// printPythonInstallInstructions prints instructions for installing Python
func printPythonInstallInstructions() {
	color.Yellow("\n📋 Python Installation Instructions:\n\n")

	switch runtime.GOOS {
	case "darwin": // macOS
		color.White("  macOS:\n")
		color.Cyan("    brew install python3\n")
		color.White("  Or download from: https://www.python.org/downloads/\n\n")

	case "linux":
		color.White("  Ubuntu/Debian:\n")
		color.Cyan("    sudo apt update && sudo apt install python3 python3-pip\n\n")
		color.White("  Fedora:\n")
		color.Cyan("    sudo dnf install python3 python3-pip\n\n")
		color.White("  Arch:\n")
		color.Cyan("    sudo pacman -S python python-pip\n\n")

	case "windows":
		color.White("  Windows:\n")
		color.White("    Download from: https://www.python.org/downloads/\n")
		color.Yellow("    Make sure to check 'Add Python to PATH' during installation\n\n")

	default:
		color.White("  Download from: https://www.python.org/downloads/\n\n")
	}
}
