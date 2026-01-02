# Makefile for LibreTranslate Server Manager

.PHONY: build build-install build-all-binaries build-all clean install run test help all

# Binary names
BINARY=libretranslate-server
INSTALL_BINARY=install
VERSION=1.0.0

# Build the main binary
build:
	@echo "Building ${BINARY}..."
	go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY} main.go dependencies.go server.go web.go languages.go
	@echo "✅ Build complete: ${BINARY}"

# Build the install binary
build-install:
	@echo "Building ${INSTALL_BINARY}..."
	go build -ldflags="-X 'main.version=${VERSION}'" -o ${INSTALL_BINARY} install_main.go dependencies.go
	@echo "✅ Build complete: ${INSTALL_BINARY}"

# Build both binaries
build-all-binaries: build build-install
	@echo "✅ All binaries built"

# Build for all platforms
build-all:
	@echo "Building main binary for all platforms..."
	GOOS=darwin GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-darwin-amd64
	GOOS=darwin GOARCH=arm64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-darwin-arm64
	GOOS=linux GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-linux-amd64
	GOOS=windows GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-windows-amd64.exe
	@echo "Building install binary for all platforms..."
	GOOS=darwin GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${INSTALL_BINARY}-darwin-amd64 install_main.go dependencies.go
	GOOS=darwin GOARCH=arm64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${INSTALL_BINARY}-darwin-arm64 install_main.go dependencies.go
	GOOS=linux GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${INSTALL_BINARY}-linux-amd64 install_main.go dependencies.go
	GOOS=windows GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${INSTALL_BINARY}-windows-amd64.exe install_main.go dependencies.go
	@echo "✅ Cross-compilation complete"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -f ${BINARY} ${BINARY}-* ${INSTALL_BINARY} ${INSTALL_BINARY}-*
	@echo "✅ Clean complete"

# Download Go dependencies
install:
	@echo "Downloading Go dependencies..."
	go mod download
	go mod tidy
	@echo "✅ Dependencies installed"

# Run the application
run:
	go run .

# Run tests
test:
	go test -v ./...

# Install Go dependencies and build
all: install build

# Show help
help:
	@echo "LibreTranslate Server Manager - Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make build              - Build the main binary for current platform"
	@echo "  make build-install      - Build the install binary for current platform"
	@echo "  make build-all-binaries - Build both binaries for current platform"
	@echo "  make build-all          - Build all binaries for all platforms (darwin, linux, windows)"
	@echo "  make clean              - Remove build artifacts"
	@echo "  make install            - Download Go dependencies"
	@echo "  make run                - Run the application"
	@echo "  make test               - Run tests"
	@echo "  make all                - Install dependencies and build"
	@echo "  make help               - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build-all-binaries"
	@echo "  ./install               # Run the installer"
	@echo "  ./libretranslate-server start"
	@echo ""
