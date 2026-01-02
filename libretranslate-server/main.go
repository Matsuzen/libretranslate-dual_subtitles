package main

import (
	"fmt"
	"os"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	version = "1.0.0"
	port    int
	host    string
	verbose bool
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "libretranslate-server",
		Short: "A simple wrapper to run LibreTranslate server",
		Long: `LibreTranslate Server Manager

A Go-based wrapper that manages a local LibreTranslate translation server.
This tool automatically handles dependencies and provides an easy way to
run your own translation server for the Dual Subtitles extension.`,
		Version: version,
	}

	// Start command
	startCmd := &cobra.Command{
		Use:   "start",
		Short: "Start the LibreTranslate server",
		Long:  "Start the LibreTranslate server with the specified configuration",
		Run:   runStart,
	}
	startCmd.Flags().IntVarP(&port, "port", "p", 5000, "Port to run the server on")
	startCmd.Flags().StringVarP(&host, "host", "H", "127.0.0.1", "Host to bind the server to")
	startCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose logging")

	// Status command
	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Check server status",
		Long:  "Check if the LibreTranslate server is running",
		Run:   runStatus,
	}
	statusCmd.Flags().IntVarP(&port, "port", "p", 5000, "Port to check")

	// Install command
	installCmd := &cobra.Command{
		Use:   "install",
		Short: "Install LibreTranslate dependencies",
		Long:  "Install Python and LibreTranslate if not already installed",
		Run:   runInstall,
	}

	// Stop command
	stopCmd := &cobra.Command{
		Use:   "stop",
		Short: "Stop the LibreTranslate server",
		Long:  "Stop a running LibreTranslate server",
		Run:   runStop,
	}
	stopCmd.Flags().IntVarP(&port, "port", "p", 5000, "Port of the server to stop")

	// Web command
	webCmd := &cobra.Command{
		Use:   "web",
		Short: "Start web management interface",
		Long:  "Start a web interface to manage the LibreTranslate server",
		Run:   runWeb,
	}
	webCmd.Flags().IntVarP(&port, "port", "p", 8080, "Port for web interface")

	// Languages command
	languagesCmd := &cobra.Command{
		Use:   "languages",
		Short: "Manage translation language packages",
		Long:  "List, install, and manage translation language packages",
	}

	// Languages subcommands
	langListCmd := &cobra.Command{
		Use:   "list",
		Short: "List available language packages",
		Run:   runLanguagesList,
	}

	langInstalledCmd := &cobra.Command{
		Use:   "installed",
		Short: "List installed language packages",
		Run:   runLanguagesInstalled,
	}

	langInstallCmd := &cobra.Command{
		Use:   "install <from-code> <to-code>",
		Short: "Install a language package",
		Long:  "Install a language translation package (e.g., 'en' 'de' for English to German)",
		Args:  cobra.ExactArgs(2),
		Run:   runLanguagesInstall,
	}

	langPopularCmd := &cobra.Command{
		Use:   "popular",
		Short: "Install popular language packages",
		Long:  "Install commonly used language packages (EN, ES, FR, DE, ZH, JA)",
		Run:   runLanguagesPopular,
	}

	languagesCmd.AddCommand(langListCmd, langInstalledCmd, langInstallCmd, langPopularCmd)

	rootCmd.AddCommand(startCmd, statusCmd, installCmd, stopCmd, webCmd, languagesCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func runStart(cmd *cobra.Command, args []string) {
	color.Cyan("🚀 Starting LibreTranslate Server Manager v%s\n", version)

	// Check dependencies
	if err := checkDependencies(); err != nil {
		color.Red("❌ Dependencies not met: %v\n", err)
		color.Yellow("💡 Run 'libretranslate-server install' to install dependencies\n")
		os.Exit(1)
	}

	// Start server
	if err := startServer(host, port, verbose); err != nil {
		color.Red("❌ Failed to start server: %v\n", err)
		os.Exit(1)
	}
}

func runStatus(cmd *cobra.Command, args []string) {
	color.Cyan("🔍 Checking server status...\n")
	checkStatus(port)
}

func runInstall(cmd *cobra.Command, args []string) {
	color.Cyan("📦 Installing LibreTranslate dependencies...\n")
	if err := installDependencies(); err != nil {
		color.Red("❌ Installation failed: %v\n", err)
		os.Exit(1)
	}
	color.Green("✅ Installation complete!\n")
}

func runStop(cmd *cobra.Command, args []string) {
	color.Cyan("🛑 Stopping LibreTranslate server...\n")
	if err := stopServer(port); err != nil {
		color.Red("❌ Failed to stop server: %v\n", err)
		os.Exit(1)
	}
	color.Green("✅ Server stopped\n")
}

func runWeb(cmd *cobra.Command, args []string) {
	color.Cyan("🌐 Starting web management interface on port %d...\n", port)
	if err := startWebInterface(port); err != nil {
		color.Red("❌ Failed to start web interface: %v\n", err)
		os.Exit(1)
	}
}

func runLanguagesList(cmd *cobra.Command, args []string) {
	if err := listAvailableLanguages(); err != nil {
		color.Red("❌ Failed to list languages: %v\n", err)
		os.Exit(1)
	}
}

func runLanguagesInstalled(cmd *cobra.Command, args []string) {
	if err := listInstalledLanguages(); err != nil {
		color.Red("❌ Failed to list installed languages: %v\n", err)
		os.Exit(1)
	}
}

func runLanguagesInstall(cmd *cobra.Command, args []string) {
	fromCode := args[0]
	toCode := args[1]

	if err := installLanguage(fromCode, toCode); err != nil {
		color.Red("❌ Failed to install language: %v\n", err)
		os.Exit(1)
	}
}

func runLanguagesPopular(cmd *cobra.Command, args []string) {
	if err := installPopularLanguages(); err != nil {
		color.Red("❌ Failed to install popular languages: %v\n", err)
		os.Exit(1)
	}
}
