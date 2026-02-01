package main

import (
	"fmt"
	"os/exec"
	"sort"
	"strings"

	"github.com/fatih/color"
)

// LanguagePackage represents a language translation package
type LanguagePackage struct {
	FromCode string
	ToCode   string
	FromName string
	ToName   string
}

// listAvailableLanguages lists all available language packages
func listAvailableLanguages() error {
	color.Cyan("🌍 Fetching available language packages...\n\n")

	pythonCmd := getPythonCommand()
	script := `
import argostranslate.package
argostranslate.package.update_package_index()
packages = argostranslate.package.get_available_packages()
for p in sorted(packages, key=lambda x: (x.from_code, x.to_code)):
    print(f"{p.from_code}|{p.to_code}|{p.from_name}|{p.to_name}")
`

	cmd := exec.Command(pythonCmd, "-c", script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to fetch language packages: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	packages := make(map[string][]LanguagePackage)

	for _, line := range lines {
		// Skip warning lines and empty lines
		if strings.Contains(line, "UserWarning") || strings.TrimSpace(line) == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) == 4 {
			fromCode := parts[0]
			pkg := LanguagePackage{
				FromCode: fromCode,
				ToCode:   parts[1],
				FromName: parts[2],
				ToName:   parts[3],
			}
			packages[fromCode] = append(packages[fromCode], pkg)
		}
	}

	// Sort and display
	var codes []string
	for code := range packages {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	color.White("Available language packages (%d total):\n\n", len(lines)-1)

	for _, code := range codes {
		pkgs := packages[code]
		if len(pkgs) > 0 {
			color.Green("  %s (%s):\n", code, pkgs[0].FromName)
			for _, pkg := range pkgs {
				color.White("    → %s (%s)\n", pkg.ToCode, pkg.ToName)
			}
		}
	}

	color.Cyan("\n💡 To install a language pair, use:\n")
	color.White("   ./libretranslate-server languages install <from-code> <to-code>\n")
	color.White("   Example: ./libretranslate-server languages install en de\n")

	return nil
}

// listInstalledLanguages lists installed language packages
func listInstalledLanguages() error {
	color.Cyan("📦 Installed language packages:\n\n")

	pythonCmd := getPythonCommand()
	script := `
import argostranslate.package
packages = argostranslate.package.get_installed_packages()
if not packages:
    print("NONE")
else:
    for p in sorted(packages, key=lambda x: (x.from_code, x.to_code)):
        print(f"{p.from_code}|{p.to_code}|{p.from_name}|{p.to_name}")
`

	cmd := exec.Command(pythonCmd, "-c", script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to list installed packages: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")

	// Filter out warnings
	var cleanLines []string
	for _, line := range lines {
		if !strings.Contains(line, "UserWarning") && strings.TrimSpace(line) != "" {
			cleanLines = append(cleanLines, line)
		}
	}

	if len(cleanLines) == 0 || (len(cleanLines) == 1 && cleanLines[0] == "NONE") {
		color.Yellow("  No language packages installed yet.\n\n")
		color.Cyan("💡 To install languages, use:\n")
		color.White("   ./libretranslate-server languages list    # See available languages\n")
		color.White("   ./libretranslate-server languages install <from> <to>\n")
		return nil
	}

	packages := make(map[string][]LanguagePackage)
	for _, line := range cleanLines {
		parts := strings.Split(line, "|")
		if len(parts) == 4 {
			fromCode := parts[0]
			pkg := LanguagePackage{
				FromCode: fromCode,
				ToCode:   parts[1],
				FromName: parts[2],
				ToName:   parts[3],
			}
			packages[fromCode] = append(packages[fromCode], pkg)
		}
	}

	// Sort and display
	var codes []string
	for code := range packages {
		codes = append(codes, code)
	}
	sort.Strings(codes)

	for _, code := range codes {
		pkgs := packages[code]
		if len(pkgs) > 0 {
			color.Green("  %s (%s):\n", code, pkgs[0].FromName)
			for _, pkg := range pkgs {
				color.White("    → %s (%s)\n", pkg.ToCode, pkg.ToName)
			}
		}
	}

	return nil
}

// installLanguage installs a language translation package
func installLanguage(fromCode, toCode string) error {
	color.Cyan("📦 Installing language package: %s → %s\n\n", fromCode, toCode)

	pythonCmd := getPythonCommand()
	script := fmt.Sprintf(`
import argostranslate.package

# Update package index
argostranslate.package.update_package_index()

# Find the package
available = argostranslate.package.get_available_packages()
package = None
for p in available:
    if p.from_code == '%s' and p.to_code == '%s':
        package = p
        break

if package is None:
    print("ERROR: Language package not found")
    exit(1)

# Check if already installed
installed = argostranslate.package.get_installed_packages()
for p in installed:
    if p.from_code == '%s' and p.to_code == '%s':
        print("ALREADY_INSTALLED")
        exit(0)

# Download and install
print(f"Downloading {package.from_name} → {package.to_name}...")
argostranslate.package.install_from_path(package.download())
print("SUCCESS")
`, fromCode, toCode, fromCode, toCode)

	cmd := exec.Command(pythonCmd, "-c", script)
	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	// Filter out warnings
	lines := strings.Split(outputStr, "\n")
	for _, line := range lines {
		if strings.Contains(line, "UserWarning") {
			continue
		}
		if strings.TrimSpace(line) == "" {
			continue
		}

		if strings.Contains(line, "ERROR:") {
			color.Red("❌ %s\n", strings.TrimPrefix(line, "ERROR: "))
			return fmt.Errorf("language package not found")
		}

		if line == "ALREADY_INSTALLED" {
			color.Yellow("  ℹ  Package already installed\n")
			return nil
		}

		if line == "SUCCESS" {
			color.Green("\n✅ Language package installed successfully!\n")
			color.Cyan("\n💡 Restart the server to use the new language:\n")
			color.White("   ./libretranslate-server stop\n")
			color.White("   ./libretranslate-server start\n")
			return nil
		}

		fmt.Println(line)
	}

	if err != nil {
		return fmt.Errorf("failed to install package: %w", err)
	}

	return nil
}

// installPopularLanguages installs commonly used language packages
func installPopularLanguages() error {
	color.Cyan("📦 Installing popular language packages...\n\n")

	popular := []struct {
		from, to string
		name     string
	}{
		{"en", "es", "English → Spanish"},
		{"es", "en", "Spanish → English"},
		{"en", "fr", "English → French"},
		{"fr", "en", "French → English"},
		{"en", "de", "English → German"},
		{"de", "en", "German → English"},
		{"en", "zh", "English → Chinese"},
		{"zh", "en", "Chinese → English"},
		{"en", "ja", "English → Japanese"},
		{"ja", "en", "Japanese → English"},
	}

	successCount := 0
	skipCount := 0
	errorCount := 0

	for i, lang := range popular {
		color.White("[%d/%d] Installing %s...\n", i+1, len(popular), lang.name)

		err := installLanguage(lang.from, lang.to)
		if err != nil {
			if strings.Contains(err.Error(), "already installed") {
				skipCount++
			} else {
				errorCount++
				color.Red("  Failed: %v\n", err)
			}
		} else {
			successCount++
		}
		fmt.Println()
	}

	color.Green("\n✅ Installation complete!\n")
	color.White("   Installed: %d\n", successCount)
	color.White("   Skipped (already installed): %d\n", skipCount)
	if errorCount > 0 {
		color.Red("   Errors: %d\n", errorCount)
	}

	return nil
}
