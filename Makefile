# Claude Code GUI Extension - Build Automation
# Usage: make [target]

# Variables
EXTENSION_NAME = claude-code-chat-modern
PUBLISHER = claude-extension-dev
EXTENSION_ID = $(PUBLISHER).$(EXTENSION_NAME)
VERSION = $(shell node -p "require('./package.json').version")
VSIX_FILE = $(EXTENSION_NAME)-$(VERSION).vsix

# Colors for output
BLUE = \033[0;34m
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Phony targets
.PHONY: help install compile build-extension build-webview build package clean dev watch test lint all quick-package release \
        check-tools install-local version bump-patch bump-minor bump-major reinstall quick-reinstall \
        dev-build dev-package dev-reinstall

## Help command
help:
	@echo "$(BLUE)Claude Code GUI Extension - Build Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Main Commands:$(NC)"
	@echo "  make install        - Install dependencies"
	@echo "  make build          - Full build (compile + webview)"
	@echo "  make package        - Create VSIX package"
	@echo "  make all            - Clean, install, build, and package"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev            - Run development mode (watch + webview dev)"
	@echo "  make watch          - Watch TypeScript files"
	@echo "  make test           - Run tests"
	@echo "  make lint           - Run linter"
	@echo "  make dev-reinstall  - Build and install with debug features"
	@echo ""
	@echo "$(GREEN)Quick Commands:$(NC)"
	@echo "  make quick-package  - Build and package without reinstalling"
	@echo "  make reinstall      - Build, package, and reinstall extension"
	@echo "  make quick-reinstall- Quick build and reinstall (no npm install)"
	@echo "  make release        - Full release build (clean + all)"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make check-tools    - Check required tools"

## Check for required tools
check-tools:
	@echo "$(BLUE)Checking required tools...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Error: node is not installed$(NC)" >&2; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)Error: npm is not installed$(NC)" >&2; exit 1; }
	@command -v npx >/dev/null 2>&1 || { echo "$(RED)Error: npx is not installed$(NC)" >&2; exit 1; }
	@echo "$(GREEN)✓ All required tools are installed$(NC)"

## Install dependencies
install: check-tools
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

## Compile TypeScript
compile:
	@echo "$(BLUE)Compiling TypeScript...$(NC)"
	@npm run compile
	@echo "$(GREEN)✓ TypeScript compiled$(NC)"

## Build extension with webpack
build-extension:
	@echo "$(BLUE)Building extension with webpack...$(NC)"
	@npm run build:extension
	@echo "$(GREEN)✓ Extension bundled$(NC)"

## Build webview
build-webview:
	@echo "$(BLUE)Building webview...$(NC)"
	@npm run build:webview
	@echo "$(GREEN)✓ Webview built$(NC)"

## Full build
build: build-extension build-webview
	@echo "$(GREEN)✓ Build complete$(NC)"

## Create VSIX package
package:
	@echo "$(BLUE)Creating VSIX package...$(NC)"
	@rm -f *.vsix
	@npx vsce package --no-dependencies
	@echo "$(GREEN)✓ Package created: $(VSIX_FILE)$(NC)"
	@ls -lh $(VSIX_FILE)

## Create VSIX package with explicit build
package-with-build: build package
	@echo "$(GREEN)✓ Package created with explicit build$(NC)"

## Quick package (no install)
quick-package:
	@echo "$(YELLOW)Quick packaging (no dependency install)...$(NC)"
	@make package

## Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf out/
	@rm -rf node_modules/
	@rm -f *.vsix
	@echo "$(GREEN)✓ Clean complete$(NC)"

## Development mode
dev:
	@echo "$(BLUE)Starting development mode...$(NC)"
	@npm run dev

## Watch mode
watch:
	@echo "$(BLUE)Starting TypeScript watch mode...$(NC)"
	@npm run watch

## Run tests
test: compile
	@echo "$(BLUE)Running tests...$(NC)"
	@npm test

## Run linter
lint:
	@echo "$(BLUE)Running linter...$(NC)"
	@npm run lint

## Full build pipeline
all: clean install build package
	@echo "$(GREEN)✓ Full build pipeline complete$(NC)"

## Release build
release:
	@echo "$(BLUE)Creating release build...$(NC)"
	@make clean
	@make all
	@echo "$(GREEN)✓ Release build complete: $(VSIX_FILE)$(NC)"

## Install the extension locally
install-local: package
	@echo "$(BLUE)Installing extension locally...$(NC)"
	@code --install-extension $(VSIX_FILE)
	@echo "$(GREEN)✓ Extension installed$(NC)"

## Reinstall the extension (uninstall + install)
reinstall:
	@make package
	@echo "$(BLUE)Uninstalling current extension...$(NC)"
	@code --uninstall-extension $(EXTENSION_ID) || echo "$(YELLOW)Extension not currently installed$(NC)"
	@echo "$(BLUE)Installing new extension...$(NC)"
	@code --install-extension $(VSIX_FILE) --force
	@echo "$(GREEN)✓ Extension reinstalled$(NC)"
	@echo "$(YELLOW)Please reload VS Code window (Cmd+R or Ctrl+R) to activate the new version$(NC)"

## Quick reinstall (no npm install)
quick-reinstall:
	@echo "$(YELLOW)Quick reinstall (no dependency install)...$(NC)"
	@echo "$(BLUE)Creating VSIX package (vsce will build automatically)...$(NC)"
	@rm -f *.vsix
	@npx vsce package --no-dependencies
	@echo "$(GREEN)✓ Package created: $(VSIX_FILE)$(NC)"
	@echo "$(BLUE)Uninstalling current extension...$(NC)"
	@code --uninstall-extension $(EXTENSION_ID) || echo "$(YELLOW)Extension not currently installed$(NC)"
	@echo "$(BLUE)Installing new extension...$(NC)"
	@code --install-extension $(VSIX_FILE) --force
	@echo "$(GREEN)✓ Extension reinstalled$(NC)"
	@echo "$(YELLOW)Please reload VS Code window (Cmd+R or Ctrl+R) to activate the new version$(NC)"

## Check current version
version:
	@echo "$(BLUE)Current version: $(VERSION)$(NC)"

## Bump patch version
bump-patch:
	@echo "$(BLUE)Bumping patch version...$(NC)"
	@npm version patch
	@echo "$(GREEN)✓ Version bumped to $$(node -p \"require('./package.json').version\")$(NC)"

## Bump minor version
bump-minor:
	@echo "$(BLUE)Bumping minor version...$(NC)"
	@npm version minor
	@echo "$(GREEN)✓ Version bumped to $$(node -p \"require('./package.json').version\")$(NC)"

## Bump major version
bump-major:
	@echo "$(BLUE)Bumping major version...$(NC)"
	@npm version major
	@echo "$(GREEN)✓ Version bumped to $$(node -p \"require('./package.json').version\")$(NC)"

## Development build with debug options
dev-build:
	@echo "$(BLUE)Building extension in development mode with source maps...$(NC)"
	@echo "$(YELLOW)→ Using development webpack config$(NC)"
	@npx webpack --config webpack.dev.config.js
	@echo "$(YELLOW)→ Building webview in development mode$(NC)"
	@npx webpack --mode development --devtool source-map
	@echo "$(GREEN)✓ Development build complete with source maps$(NC)"
	@echo "$(YELLOW)→ Source maps generated in out/ directory$(NC)"

## Create debug package
dev-package: dev-build
	@echo "$(BLUE)Creating debug VSIX package...$(NC)"
	@rm -f *.vsix
	@npx vsce package --no-dependencies --allow-missing-repository
	@echo "$(GREEN)✓ Debug package created: $(VSIX_FILE)$(NC)"
	@ls -lh $(VSIX_FILE)

## Development reinstall with full debugging
dev-reinstall: dev-package
	@echo "$(BLUE)Installing development build...$(NC)"
	@code --uninstall-extension $(EXTENSION_ID) || echo "$(YELLOW)Extension not currently installed$(NC)"
	@code --install-extension $(VSIX_FILE) --force
	@echo "$(GREEN)✓ Development extension installed$(NC)"
	@echo "$(YELLOW)⚡ Debug features enabled:$(NC)"
	@echo "  - Inline source maps for better stack traces"
	@echo "  - Non-minified code for easier debugging"
	@echo "  - Full webpack bundle analysis available"
	@echo ""
	@echo "$(YELLOW)📝 To debug the extension:$(NC)"
	@echo "  1. Open VS Code Developer Tools: Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows/Linux)"
	@echo "  2. Go to Sources tab to see source-mapped TypeScript files"
	@echo "  3. Set breakpoints directly in TypeScript code"
	@echo "  4. Check Console for detailed error messages"
	@echo ""
	@echo "$(YELLOW)Please reload VS Code window (Cmd+R or Ctrl+R) to activate$(NC)"