# Makefile for LibreTranslate Server Manager

.PHONY: build build-all clean install run test help all

# Binary name
BINARY=libretranslate-server
VERSION=1.0.0

# Build the binary
build:
	@echo "Building ${BINARY}..."
	go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY} main.go dependencies.go server.go web.go languages.go
	@echo "Build complete: ${BINARY}"

# Build for all platforms
build-all:
	@echo "Building for all platforms..."
	GOOS=darwin GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-darwin-amd64 main.go dependencies.go server.go web.go languages.go
	GOOS=darwin GOARCH=arm64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-darwin-arm64 main.go dependencies.go server.go web.go languages.go
	GOOS=linux GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-linux-amd64 main.go dependencies.go server.go web.go languages.go
	GOOS=windows GOARCH=amd64 go build -ldflags="-X 'main.version=${VERSION}'" -o ${BINARY}-windows-amd64.exe main.go dependencies.go server.go web.go languages.go
	@echo "Cross-compilation complete"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -f ${BINARY} ${BINARY}-*
	@echo "Clean complete"

# Download Go dependencies
install:
	@echo "Downloading Go dependencies..."
	go mod download
	go mod tidy
	@echo "Dependencies installed"

# Run the application
run:
	go run main.go dependencies.go server.go web.go languages.go

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
	@echo "  make build     - Build the binary for current platform"
	@echo "  make build-all - Build for all platforms (darwin, linux, windows)"
	@echo "  make clean     - Remove build artifacts"
	@echo "  make install   - Download Go dependencies"
	@echo "  make run       - Run the application"
	@echo "  make test      - Run tests"
	@echo "  make all       - Install dependencies and build"
	@echo "  make help      - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  ./libretranslate-server start"
	@echo "  ./libretranslate-server status"
	@echo ""
