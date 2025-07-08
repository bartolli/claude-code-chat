# Source File Map for Claude Code Chat Extension

## ⚠️ AGENT INSTRUCTIONS
When fixing JSDoc or other issues, ONLY modify files in the categories marked as "✅ Safe to modify". 
NEVER touch files marked with "❌ Do not modify".

## 📁 Source Code Structure

### ✅ Core Modules (`src/core/`)
**Safe to modify** - Add JSDoc comments and fix issues
- `ErrorBoundary.ts` - Error handling and recovery
- `Logger.ts` - Logging infrastructure
- `Result.ts` - Result type for error handling
- `ServiceContainer.ts` - Dependency injection container
- `index.ts` - Core module exports

### ✅ Types (`src/types/`)
**Safe to modify** - Add JSDoc comments to interfaces and types
- `claude.ts` - Claude API types and interfaces
- `messages.ts` - Message types for communication
- `process-adapter.ts` - Process adaptation types
- `state.ts` - State management types

### ✅ Services (`src/services/`)
**Safe to modify** - Add JSDoc comments and fix issues
- `ChunkedJSONParser.ts` - JSON streaming parser
- `ClaudeProcessManager.ts` - Claude process management
- `ConfigService.ts` - Configuration management
- `ExtensionMessageHandler.ts` - Message handling (MIGRATION TARGET)
- `FileService.ts` - File operations
- `GitService.ts` - Git integration
- `McpClientService.ts` - MCP client operations
- `McpService.ts` - MCP service management
- `PlanApprovalService.ts` - Plan approval workflow
- `ProgressiveUIUpdater.ts` - UI update optimization
- `ServiceContainer.ts` - Service management
- `StreamIntegration.ts` - Stream integration
- `StreamProcessor.ts` - Stream processing

### ✅ State Management (`src/state/`)
**Safe to modify** - Add JSDoc comments, part of migration
- `SimpleStateManager.ts` - Current state manager (MIGRATION SOURCE)
- `StateManager.ts` - New Redux state manager (MIGRATION TARGET)
- `store.ts` - Redux store configuration
- `actions.ts` - Redux actions
- `selectors.ts` - Redux selectors
- **Slices** (`src/state/slices/`)
  - `claudeSlice.ts` - Claude state
  - `configSlice.ts` - Configuration state
  - `mcpSlice.ts` - MCP state
  - `processesSlice.ts` - Process management state
  - `sessionSlice.ts` - Session state
  - `uiSlice.ts` - UI state

### ✅ Migration (`src/migration/`)
**Safe to modify** - Core migration infrastructure
- `ActionMapper.ts` - Maps actions between systems
- `FeatureFlags.ts` - Feature flag management
- `MigrationTestHarness.ts` - Migration testing
- `StateComparator.ts` - State comparison utilities

### ✅ Protocol (`src/protocol/`)
**Safe to modify** - Add JSDoc comments
- `base.ts` - Base protocol definitions
- `IdeMessenger.ts` - IDE messaging
- `SimpleWebviewProtocol.ts` - Webview communication
- `WebviewProtocol.ts` - Enhanced webview protocol
- `ProtocolMigration.ts` - Protocol migration utilities
- `types.ts` - Protocol types

### ✅ Utils (`src/utils/`)
**Safe to modify** - Add JSDoc comments
- `debug-console.ts` - Debug console utilities

### ⚠️ Test Files (`src/test/`)
**Modify with caution** - Only add JSDoc to exported utilities
- Test files ending in `.test.ts` or `.test.js`
- Migration tests in `src/test/migration/`
- State tests in `src/test/state/`
- **DO NOT** modify test logic, only add documentation

### ❌ Build Configuration
**Do not modify** - These control the build process
- `webpack.*.js` files (in root directory)
- `tsconfig.json`
- `package.json` (except for scripts if explicitly needed)
- `.eslintrc.json` or `eslint.config.mjs`

### ❌ Extension Entry Points
**Do not modify** - Critical for extension operation
- `src/extension.ts` - Main extension entry point
- `src/webview/index.tsx` - Webview entry point
- `src/webview/index.html` - Webview HTML

### ❌ Webview Components (`src/webview/`)
**Do not modify** - UI components, out of scope
- All `.tsx` files in `src/webview/components/`
- Style files in `src/webview/styles/`
- Webview utilities

### ❌ Hook Scripts (`src/hooks/`)
**Do not modify** - Build process hooks
- `plan-approval-hook.js`
- `plan-approval-hook.ts`

## 📋 Priority Order for JSDoc Fixes

1. **High Priority** - Public APIs and interfaces
   - Exported functions and classes
   - Public methods
   - Interface definitions

2. **Medium Priority** - Internal APIs
   - Private methods with complex logic
   - Helper functions
   - Type definitions

3. **Low Priority** - Simple/obvious code
   - Getters/setters with obvious behavior
   - Simple utility functions
   - Test utilities

## 🚨 Remember
- Focus on meaningful documentation, not just filling empty comments
- Keep descriptions concise but informative
- Use proper JSDoc tags (@param, @returns, @throws)
- Let Prettier handle formatting - focus on content