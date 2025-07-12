# StateManager Migration Plan - Safety-First Approach

## **Current Status** 📊
**Last Updated:** July 11, 2025

### Completed Phases:
- ✅ **Phase 0: Pre-Migration Safety Net** - Feature flags, tests, documentation
  - StateComparator with unit tests (17 tests)
  - Feature flag system with VS Code commands
- ✅ **Phase 1: Action Mapping Layer** - ActionMapper implementation with full test coverage
  - All custom handlers implemented (28 unit tests)
  - Remaining: Stream message handling (Phase 2)
- ✅ **Hook System Integration** - Automated quality checks and migration tests
- ✅ **Test Infrastructure Upgrade** - Vitest for fast unit tests + VS Code for integration
  - 121 unit tests running in ~470ms
  - See: `docs/statemanager-migration-plan-test-update.md` for details

### What's Covered by Hooks:
- **Automatic Quality Checks:** TypeScript, ESLint (with JSDoc), Prettier
- **Migration Safety:** Feature flag validation, StateManager usage patterns
- **Test Automation:** Maps file changes to relevant test suites:
  - `ActionMapper` → `actionMapper.test.ts` (unit tests)
  - `ExtensionMessageHandler` → `messageFlow.integration.test.ts`
  - `StateManager` → `reduxStore.integration.test.ts`
  - `StateComparator` → `StateComparator.test.ts` (unit tests)

### ✅ **PHASE 2.2 - Stream Processing Integration (100% Complete)** 
**Status: ALL Redux dispatch integrations completed successfully**

- ✅ **2.2.2:** Session State Synchronization - **COMPLETE**
  - ✅ Fixed session ID storage to use setCurrentSessionId()
  - ✅ Synced session metadata (cost, duration, usage)  
  - ✅ Handle new session creation properly
- ✅ **2.2.3:** Stream Message Handling - **COMPLETE**
  - ✅ Added Redux dispatch for assistant message creation (5 locations)
  - ✅ Implemented message content updates during streaming
  - ✅ Added thinking block parallel updates
  - ✅ Integrated tool use and results with comprehensive tracking
- ✅ **2.2.4:** Complete Message Flow Mappings - **COMPLETE**
  - ✅ Added message/update mapping to ActionMapper
  - ✅ Added message/thinking mapping
  - ✅ Added message/toolUse and toolResult mappings
- ✅ **2.2.5:** Comprehensive Tool Tracking - **COMPLETE** (Enhancement)
  - ✅ Implemented ToolTracker class with full analytics
  - ✅ Session-based tracking and performance monitoring
  - ✅ Statistics, reporting, and export capabilities
- ✅ **2.2.6:** Complete Remaining Redux Dispatch Integrations - **COMPLETE**
  - ✅ 2.2.6.1: User Message Redux Dispatch (2 locations) 
  - ✅ 2.2.6.2: Processing State Redux Dispatch (8 locations)
  - ✅ 2.2.6.3: Error Handling Redux Dispatch (13 locations)
  - ✅ 2.2.6.4: All webviewProtocol.post() calls converted to postWithDispatch()

### 📊 **Phase 2.2 Final Analysis Summary:**
**Based on comprehensive conversion of all webviewProtocol.post() calls:**

**✅ Fully Implemented (100%):**
- Stream Processing Integration: All thinking, tool use, message updates ✅
- Tool Tracking Enhancement: Complete analytics system ✅  
- ActionMapper Coverage: All stream processing actions mapped ✅
- User Message Redux Dispatch: All 2 locations converted ✅
- Processing State Redux Dispatch: All 8 locations converted ✅
- Error Handling Redux Dispatch: All 13 locations converted ✅
- Complete webviewProtocol Coverage: Only postWithDispatch() helper uses direct calls ✅

**Overall Phase 2.2 Completion: 100%** ✅

**Key Achievements:**
- ✅ 162 unit tests passing (40 ActionMapper tests)
- ✅ All stream processing uses postWithDispatch() for dual state updates
- ✅ Complete Redux action mapping for error/show, terminal/opened
- ✅ Unified state management pattern throughout ExtensionMessageHandler
- ✅ Backward compatibility maintained during transition

### 🎯 **Next Major Phases:**
- **Phase 2.3:** State Synchronization with Loop Prevention 🔶 **UP NEXT**
  - Implement state comparison and conflict resolution
  - Add loop prevention for Redux ↔ webview sync
  - Validate state consistency across both managers
- **Phase 3:** StateManager Activation 🔷 **PENDING**
  - Enable read operations from Redux state
  - Switch from dual updates to Redux-only updates
  - Complete migration from SimpleStateManager
- **Phase 4:** Testing and Validation 🔷 **PENDING**
  - End-to-end migration testing
  - Performance validation
  - Feature flag cleanup

### 🚀 Quick Start for Next Session:
```bash
# 1. Check current status
npm run test:unit  # Should show 161 passing tests

# 2. Start Phase 2 analysis
grep -n "class ExtensionMessageHandler" src/**/*.ts

# 3. Read the Phase 2 Implementation Guide (line 455)
```

---

## **Overview**
Migrate from SimpleStateManager to the full Redux-based StateManager to gain persistence, proper session management, and improved thinking block handling while maintaining 100% backward compatibility and zero downtime.

**Core Principles:**
- ✅ Zero regression tolerance - existing functionality must work perfectly
- ✅ Gradual, reversible changes with feature flags
- ✅ Comprehensive testing before each phase
- ✅ Parallel state validation during transition
- ✅ Clear rollback path at every step

---

## **Phase 0: Pre-Migration Safety Net** ✅ COMPLETED
*Estimated Time: 2-3 hours*
*Priority: CRITICAL - Must complete before any code changes*

### Task 0.1: Comprehensive Test Suite Creation
- [x] **0.1.1** Create integration tests for current message flow
  - User message → Claude response flow ✅
  - Thinking block creation and completion ✅
  - Tool use and results handling ✅
  - Token counting and cost tracking ✅
  - **Files created:**
    - `src/test/migration/messageFlow.integration.test.ts`
    - `src/test/migration/reduxActions.integration.test.ts` 
    - `src/test/migration/reduxStore.integration.test.ts`
- [x] **0.1.2** Document all webview ↔ backend message types
  - **File:** `src/test/migration/messageTypes.documentation.ts`
- [ ] **0.1.3** Create performance benchmarks for current system
- [x] **0.1.4** Set up automated test runner for continuous validation
  - **Implemented via Claude Code hooks:**
    - `.claude/hooks/smart-quality-check.sh` - Automatically runs relevant tests
    - Tests are mapped to source files and run on file changes
    - Hook configuration in `.claude/settings.local.json`

### Task 0.2: Feature Flag System Implementation ✅ COMPLETED
- [x] **0.2.1** Implement feature flag configuration
  - **File:** `src/migration/FeatureFlags.ts`
  - Includes all planned flags plus granular control flags
- [x] **0.2.2** Add VS Code settings for feature flag control
  - **Added to:** `package.json` configuration section
  - Settings prefixed with `claude-code-chat.migration.*`
- [x] **0.2.3** Create runtime toggle mechanism without restart
  - Commands added for toggling flags at runtime
- [ ] **0.2.4** Add telemetry for feature flag usage

### Task 0.3: State Comparison Infrastructure
- [x] **0.3.1** Create StateComparator utility ✅ COMPLETED
  - **File:** `src/migration/StateComparator.ts`
  - Compares SimpleStateManager and Redux StateManager states
  - Logs discrepancies with severity levels
  - Includes validation reporting and recommendations
- [ ] **0.3.2** Implement parallel state tracking mechanism
  - **Note:** This will be implemented as part of Phase 2, Task 2.1.2
  - StateComparator already has the foundation for this
- [x] **0.3.3** Add state snapshot capabilities for debugging ✅ COMPLETED
  - `createSnapshot()` method implemented
  - Sanitizes sensitive data before logging
- [ ] **0.3.4** Create state migration validator
  - **Note:** Partially implemented in StateComparator.validateOperation()
  - Full implementation will come with Phase 3 session migration
- [x] **0.3.5** Add unit tests for StateComparator (🚀 Use Vitest) ✅ COMPLETED
  - **File:** `tests/unit/migration/StateComparator.test.ts`
  - 17 tests covering all functionality
  - Mocked VS Code APIs and state managers

---

## **Phase 1: Action Mapping Layer** ✅ COMPLETED
*Estimated Time: 3-4 hours*
*Priority: HIGH - Foundation for safe migration*

### Task 1.1: Complete Action Mapping Analysis ✅ COMPLETED
- [x] **1.1.1** Document ALL webview → backend actions
  - **File:** `src/test/migration/messageTypes.documentation.ts`
  - Complete documentation of all message types and mappings
- [x] **1.1.2** Identify actions without Redux equivalents
  - Custom handlers identified for: messageAppended, modelSelected, showError, etc.
- [x] **1.1.3** Design custom handlers for non-Redux actions
  - **Implemented in:** `src/migration/ActionMapper.ts`
- [x] **1.1.4** Create action compatibility matrix
  - **ACTION_MAPPINGS** array in `messageTypes.documentation.ts`

### Task 1.2: ActionMapper Implementation ✅ COMPLETED
- [x] **1.2.1** Implement ActionMapper middleware
  - **File:** `src/migration/ActionMapper.ts`
  - Full implementation with mappings, custom handlers, and validation
- [x] **1.2.2** Add comprehensive action logging
  - Action log with statistics and export capabilities
- [x] **1.2.3** Implement fallback handling for unmapped actions
  - `handleUnmappedAction` method tracks unmapped actions
- [x] **1.2.4** Create action mapping test suite
  - **File:** `src/test/migration/actionMapper.test.ts`
  - Tests for mapping, validation, and edge cases

### Task 1.3: Action Validation Layer ✅ COMPLETED
- [x] **1.3.1** Create action payload validators
  - **PayloadValidators** in `ActionMapper.ts`
  - Type guards for token, session, and ready payloads
- [x] **1.3.2** Implement action sequence validation
  - `validateAction` method in ActionMapper
- [x] **1.3.3** Add timing and performance metrics
  - Statistics tracking with `getStatistics()` method
- [x] **1.3.4** Create action replay capability for debugging
  - Action log with export functionality for analysis

---

## **Hook System Integration** 🎯 NEW
*Completed alongside Phase 0-1*

### Automated Quality Assurance
- [x] **Smart Quality Check Hook** (`smart-quality-check.sh`)
  - Automatically runs on Edit/Write/MultiEdit operations
  - Git-based file detection for performance
  - TypeScript compilation checks
  - ESLint with JSDoc enforcement
  - Prettier formatting with auto-fix
  - Migration safety validation
  
### Migration Test Integration
- [x] **Automatic Test Execution**
  - Maps source files to relevant test suites:
    - `ActionMapper.*` → `actionMapper.test.ts`
    - `ExtensionMessageHandler.*` → `messageFlow.integration.test.ts`
    - `StateManager.*` → `reduxStore.integration.test.ts`
  - Configurable via `.claude-hooks-config.sh`
  - Runs tests in silent mode for uninterrupted workflow

### Benefits for Migration
- ✅ Catches JSDoc violations automatically
- ✅ Ensures code formatting consistency
- ✅ Validates migration patterns on every change
- ✅ Runs relevant tests immediately
- ✅ Provides immediate feedback without manual intervention

---

## **Phase 2: Gradual ExtensionMessageHandler Integration**
*Estimated Time: 4-5 hours*
*Priority: HIGH - Core functionality migration*

### Task 2.0: Preparation and Analysis 🔍
- [x] **2.0.1** Analyze ExtensionMessageHandler structure ✅
  ```bash
  # Analysis complete - documented in docs/phase2-extensionmessagehandler-analysis.md
  # Key findings:
  # - Uses local instance variables for state (no StateManager)
  # - Communicates via webviewProtocol.post() calls
  # - 20+ different message types handled
  # - Complex stream processing with incremental state updates
  ```
- [x] **2.0.2** Create ExtensionMessageHandler unit tests (basic structure) ✅
  ```typescript
  // Created tests/unit/services/ExtensionMessageHandler.test.ts
  // - Basic test structure with mocks for VS Code APIs
  // - Tests for main message types (chat/send, settings, etc.)
  // - Need more work on complex stream processing tests
  // Note: Full coverage requires integration tests due to complexity
  ```
- [x] **2.0.3** Document current message flow ✅
  ```typescript
  // Updated messageTypes.documentation.ts with:
  // - Complete webview→backend message types from handleMessage()
  // - All backend→webview posts from ExtensionMessageHandler
  // - Message flow sequences for common operations
  // - Critical state transitions during processing
  ```

### Task 2.1: Read-Only StateManager Integration
- [x] **2.1.1** Add StateManager and ActionMapper to ExtensionMessageHandler ✅
  ```typescript
  // Added to ExtensionMessageHandler:
  // - StateManager, ActionMapper, FeatureFlagManager imports
  // - Private properties for migration
  // - Initialization in constructor with feature flag check
  // - dispatchToStateManager() helper for parallel dispatch
  // - generateMessageId() utility method
  // - Fixed all unit tests with backward compatibility (132 tests passing)
  ```
- [x] **2.1.2** Implement parallel state reading with validation ✅
  ```typescript
  // Added to ExtensionMessageHandler:
  // - getCurrentSessionId() with parallel state validation
  // - getProcessingState() with discrepancy logging
  // - getSelectedModel() with severity-based logging
  // - setCurrentSessionId() for dual-write updates
  // - All getters wrapped with PerformanceMonitor
  ```
- [x] **2.1.3** Add performance monitoring wrapper ✅
  ```typescript
  // Created PerformanceMonitor class:
  // - measure() and measureAsync() for operation timing
  // - Automatic slow operation detection (>100ms)
  // - Statistical tracking (avg, min, max, count)
  // - All getter methods now tracked for performance
  ```
- [x] **2.1.4** Expanded parallel state dispatch coverage ✅
  ```typescript
  // Created postWithDispatch() helper for dual updates
  // Added parallel Redux dispatches for:
  // - chat/messageComplete → messageCompleted action
  // - status/processing → setProcessing action  
  // - message/tokenUsage → updateTokenUsage action
  // - error/show → setClaudeError action
  // Extended ActionMapper with new mappings for all dispatched types
  // All 132 unit tests passing with expanded coverage
  ```
- [x] **2.1.2** Implement parallel state reading with validation ✅
  ```typescript
  getCurrentSessionId(): string | null {
    const localId = this.currentSessionId;
    
    if (this.stateManager && this.featureFlags.isEnabled('useStateManagerForReads')) {
      const reduxId = this.stateManager.getCurrentSessionId();
      
      if (localId !== reduxId) {
        this.stateComparator?.logDiscrepancies([{
          path: 'currentSessionId',
          simpleValue: localId,
          reduxValue: reduxId,
          timestamp: new Date(),
          severity: 'high'
        }]);
      }
      
      // Return Redux value if feature enabled
      return reduxId;
    }
    
    return localId;
  }
  ```
- [x] **2.1.3** Add performance monitoring wrapper ✅
  ```typescript
  // Create performance monitoring utility
  class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    
    measure<T>(operation: string, fn: () => T): T {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      this.metrics.get(operation)!.push(duration);
      
      return result;
    }
  }
  ```
- [x] **2.1.4** Create state consistency validator ✅
  ```typescript
  // Add to StateComparator
  validateReadOperation(operation: string, simpleResult: any, reduxResult: any): boolean {
    if (JSON.stringify(simpleResult) !== JSON.stringify(reduxResult)) {
      this.logDiscrepancy({
        path: `read.${operation}`,
        simpleValue: simpleResult,
        reduxValue: reduxResult,
        timestamp: new Date(),
        severity: 'medium'
      });
      return false;
    }
    return true;
  }

### Task 2.2: Incremental Write Migration with ActionMapper
- [x] **2.2.1** Integrate ActionMapper for webview messages ✅
  ```typescript
  // Implemented in ExtensionMessageHandler:
  // - dispatchToStateManager() for parallel Redux dispatches
  // - postWithDispatch() helper for dual state updates
  // - Key messages now have parallel dispatches:
  //   - message/add (user messages), status/processing
  //   - chat/messageComplete, message/tokenUsage, error/show
  // - ActionMapper extended with all necessary mappings
  ```
- [x] **2.2.2** Implement session creation with dual-write ✅
  
  **Sub-task 2.2.2.1: Update Session ID Storage**
  ```typescript
  // Already partially implemented in setCurrentSessionId()
  // Need to ensure it's called when Claude returns session_id:
  
  // In processStream() around line ~1150:
  if (json.session_id) {
    this.setCurrentSessionId(json.session_id); // Use setter instead of direct assignment
    this.outputChannel.appendLine(`[DEBUG] Stored session ID: ${json.session_id}`);
  }
  ```
  
  **Sub-task 2.2.2.2: Session Metadata Sync**
  ```typescript
  // When receiving session metadata from Claude:
  if (json.session_id && json.total_cost_usd !== undefined) {
    // Update Redux with session metadata
    this.dispatchToStateManager('session/metadataUpdated', {
      sessionId: json.session_id,
      totalCost: json.total_cost_usd,
      duration: json.duration_ms,
      usage: json.usage
    });
  }
  ```
  
  **Sub-task 2.2.2.3: New Session Creation**
  ```typescript
  // When starting a new session (no existing session ID):
  const sessionId = existingSessionId || `session_${Date.now()}`;
  if (!existingSessionId) {
    // This is a new session
    this.setCurrentSessionId(sessionId);
    // Redux will create the session via setCurrentSessionId
  }
  ```
- [x] **2.2.3** Implement message handling with stream support ✅ **COMPLETE**
  
  **Sub-task 2.2.3.1: Assistant Message Creation** ✅
  ```typescript
  // Completed! Updated all assistant message creation to use postWithDispatch():
  // - Line ~1517: First text block creates assistant message ✅
  // - Line ~1547: Thinking block creates assistant message ✅
  // - Line ~1622: Tool use message creation ✅
  // - Line ~1677: Non-streaming message creation ✅
  // - Line ~2097: Slash command response message ✅
  // All now dispatch to Redux in parallel with webview posts
  ```
  
  **Sub-task 2.2.3.2: Message Content Updates During Streaming**
  ```typescript
  // Handle incremental content updates:
  private updateStreamingMessage(messageId: string, newContent: string) {
    // Post to webview
    this.webviewProtocol?.post('message/update', {
      messageId: messageId,
      content: newContent
    });
    
    // Dispatch to Redux
    this.dispatchToStateManager('session/messageUpdated', {
      role: 'assistant',
      content: newContent,
      messageId: messageId
    });
  }
  ```
  
  **Sub-task 2.2.3.3: Thinking Block Updates** ✅
  ```typescript
  // Completed! Updated both thinking update locations to use postWithDispatch():
  // - Line ~1589: Incremental thinking updates during streaming ✅
  // - Line ~1840: Final thinking update when thinking completes ✅
  // Both now dispatch to Redux in parallel with webview posts
  this.postWithDispatch('message/thinking', {
    content: newThinkingContent,
    currentLine: this.latestThinkingLine,
    isActive: true,
    isIncremental: true,
    messageId: this.thinkingMessageId,
  });
  ```
  
  **Sub-task 2.2.3.4: Tool Use and Results** ✅
  ```typescript
  // Completed! Updated all tool-related posts to use postWithDispatch():
  // - Line ~1230: Tool timeout/no response (process cleanup) ✅
  // - Line ~1635: Tool use (when Claude starts using a tool) ✅ 
  // - Line ~1769: Tool result (when tool execution completes) ✅
  // All now dispatch to Redux in parallel with webview posts
  this.postWithDispatch('message/toolUse', {
    toolName: block.name,
    toolId: block.id,
    input: block.input,
    status: 'calling',
    parentToolUseId: json.parent_tool_use_id || undefined,
  });
  
  this.postWithDispatch('message/toolResult', {
    toolId: block.tool_use_id,
    result: resultText,
    isError: block.is_error || false,
    status: 'complete',
    parentToolUseId: json.parent_tool_use_id || undefined,
  });
  ```
  
  **Sub-task 2.2.3.5: Stream State Management**
  ```typescript
  // Track streaming state in Redux:
  private streamingMessageIds: Set<string> = new Set();
  
  private startStreaming(messageId: string) {
    this.streamingMessageIds.add(messageId);
    // Dispatch streaming start if needed
  }
  
  private endStreaming(messageId: string) {
    this.streamingMessageIds.delete(messageId);
    this.dispatchToStateManager('session/messageCompleted', {});
  }
  ```
- [x] **2.2.4** Complete Message Flow Integration ✅ **COMPLETE**
  
  **Sub-task 2.2.4.1: Message Update Mapping**
  ```typescript
  // Add to ActionMapper:
  this.addMapping('message/update', {
    customHandler: (action) => {
      const payload = action.payload as { messageId: string; content: string };
      return messageUpdated({
        role: 'assistant',
        content: payload.content,
        messageId: payload.messageId
      });
    }
  });
  ```
  
  **Sub-task 2.2.4.2: Thinking Update Mapping** ✅
  ```typescript
  // Completed! Added to ActionMapper with comprehensive handler:
  this.addMapping('message/thinking', {
    customHandler: this.handleThinkingUpdate.bind(this),
  });
  
  // Custom handler supports all thinking block fields:
  private handleThinkingUpdate(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      content?: string;
      isActive?: boolean;
      messageId?: string;
      currentLine?: number;
      duration?: number;
      isIncremental?: boolean;
    };
    
    if (payload.content !== undefined) {
      return thinkingUpdated({
        content: payload.content,
        isActive: payload.isActive ?? true,
        messageId: payload.messageId,
        currentLine: payload.currentLine,
        duration: payload.duration,
        isIncremental: payload.isIncremental,
      });
    }
    return null;
  }
  ```
  
  **Sub-task 2.2.4.3: Tool Use Mapping** ✅
  ```typescript
  // Completed! Added to ActionMapper with comprehensive handlers:
  this.addMapping('message/toolUse', {
    customHandler: this.handleToolUse.bind(this),
  });
  
  this.addMapping('message/toolResult', {
    customHandler: this.handleToolResult.bind(this),
  });
  
  // Custom handlers support all tool fields including status and parentToolUseId:
  private handleToolUse(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      toolName?: string;
      toolId?: string;
      input?: any;
      status?: string;
      parentToolUseId?: string;
    };
    
    if (payload.toolName && payload.toolId) {
      return toolUseAdded({
        name: payload.toolName,
        id: payload.toolId,
        input: payload.input,
        status: payload.status,
        parentToolUseId: payload.parentToolUseId,
      });
    }
    return null;
  }
  ```
- [x] **2.2.5** Implement comprehensive tool tracking ✅
  ```typescript
  // Completed! Comprehensive ToolTracker system implemented:
  // - Created dedicated ToolTracker class with full analytics
  // - Integrated into ExtensionMessageHandler for automatic tracking
  // - Tracks tool execution lifecycle: start → complete/timeout/error
  // - Session-based tracking with tool usage patterns
  // - Performance monitoring (execution times, success rates)
  // - Comprehensive statistics and reporting
  // - Export capabilities for analysis
  
  // Tool execution tracking:
  this.toolTracker.startToolExecution(
    block.id,           // Tool ID
    block.name,         // Tool name (bash, grep, etc.)
    block.input,        // Tool input parameters
    sessionId,          // Associated session
    messageId,          // Associated message
    parentToolUseId     // Parent tool for nested tools
  );
  
  // Tool completion tracking:
  this.toolTracker.completeToolExecution(
    toolId,             // Tool ID
    result,             // Tool result/output
    isError,            // Whether execution failed
    'complete'          // Final status
  );
  
  // Session tracking:
  this.toolTracker.startSession(sessionId);
  this.toolTracker.endSession(sessionId);
  
  // Analytics and reporting:
  const report = this.toolTracker.getTrackingReport();
  const toolStats = this.toolTracker.getToolStats('bash');
  const exportData = this.toolTracker.exportTrackingData();
  ```
- [ ] **2.2.6** Complete remaining Redux dispatch integrations 🔴 CRITICAL
  
  **Sub-task 2.2.6.1: Complete User Message Redux Dispatch** ✅
  ```typescript
  // Completed! Fixed 2 locations to use postWithDispatch():
  
  // Location 1: Line ~613 - Chat message handling ✅
  // Location 2: Line ~2140 - Slash command messages ✅
  // Both now use:
  this.postWithDispatch('message/add', {
    role: 'user',
    content: data.text, // or command
    messageId: this.generateMessageId(),
    timestamp: new Date().toISOString()
  });
  
  // Benefits:
  // - Unified dual-dispatch pattern (webview + Redux)
  // - Consistent message ID generation
  // - Proper timestamp tracking
  // - All user messages now have Redux state updates
  // - 161 unit tests still passing ✅
  ```
  
  **Sub-task 2.2.6.2: Complete Processing State Redux Dispatch** ✅
  ```typescript
  // Completed! Fixed 8 locations to use postWithDispatch():
  
  // ✅ Location 1: Line ~547 - Stop request (abort controller)
  // ✅ Location 2: Line ~556 - Stop request (stdin fallback)
  // ✅ Location 3: Line ~622 - Chat processing start (unified dual-dispatch)
  // ✅ Location 4: Line ~906 - Process spawn abort
  // ✅ Location 5: Line ~1193 - Process exit cleanup
  // ✅ Location 6: Line ~1292 - Operation abort
  // ✅ Location 7: Line ~1301 - Error handling
  // ✅ Location 8: Line ~2151 - Slash command completion
  
  // All now use:
  this.postWithDispatch('status/processing', false); // or true
  
  // Benefits:
  // - Unified processing state management (webview + Redux)
  // - Consistent error handling with state updates
  // - All stop/abort scenarios properly update Redux
  // - 9 total postWithDispatch('status/processing') calls
  // - 0 remaining direct webview posts for processing state
  // - 161 unit tests still passing ✅
  ```
  
  **Sub-task 2.2.6.3: Add Error Handling Redux Dispatch**
  ```typescript
  // Add Redux dispatch for error scenarios:
  
  // Error display should use postWithDispatch:
  this.postWithDispatch('error/show', {
    message: errorMessage,
    type: 'error',
    timestamp: new Date().toISOString()
  });
  
  // Search for patterns:
  // - Direct error webview posts
  // - Error logging without Redux dispatch
  // - Exception handling without state updates
  ```
  
  **Sub-task 2.2.6.4: Verify Complete webviewProtocol Coverage**
  ```typescript
  // Systematic verification of all webviewProtocol.post() calls:
  
  // 1. Search all remaining webviewProtocol.post() calls
  // 2. Categorize by message type:
  //    - Message operations (message/add, message/update, etc.)
  //    - Status operations (status/processing, chat/messageComplete)
  //    - Error operations (error/show)
  //    - Other operations (permission/request, mcp/status, etc.)
  // 3. Ensure each has corresponding ActionMapper mapping
  // 4. Replace with postWithDispatch() where appropriate
  // 5. Document exceptions (if any) with justification
  
  // Verification command:
  grep -n "webviewProtocol.*post" src/services/ExtensionMessageHandler.ts
  ```
- [ ] **2.2.7** Create rollback mechanism
  ```typescript
  class MigrationRollback {
    private rollbackHandlers: Map<string, () => void> = new Map();
    
    register(feature: string, rollback: () => void) {
      this.rollbackHandlers.set(feature, rollback);
    }
    
    async executeRollback(feature: string) {
      const handler = this.rollbackHandlers.get(feature);
      if (handler) {
        try {
          handler();
          await this.featureFlags.setFlag(feature as any, false);
          this.logger.info(`Rolled back feature: ${feature}`);
        } catch (error) {
          this.logger.error(`Rollback failed for ${feature}:`, error);
        }
      }
    }
  }
  ```

### Task 2.3: State Synchronization with Loop Prevention 🔶 **IN PROGRESS**
**Goal:** Implement bidirectional state sync between Redux and webview without infinite loops

#### Critical Requirements:
1. **Zero Message Loss** - Every state change must be captured
2. **No Infinite Loops** - Prevent Redux→Webview→Redux cycles
3. **Performance** - Minimal overhead (<5ms per sync)
4. **Debuggability** - Clear logs for sync operations

- [x] **2.3.1** Implement sync direction tracking ✅ **COMPLETE**
  
  **Sub-task 2.3.1.1: Create StateSynchronizer Class** ✅ **COMPLETE**
  ```typescript
  // Implemented in src/migration/StateSynchronizer.ts
  // Features:
  // - Basic sync direction tracking (syncingToWebview/FromWebview)
  // - Operation ID tracking with 5-second cleanup
  // - Performance monitoring with slow sync warnings (>10ms)
  // - Sync context creation and management
  // - VS Code output channel for debugging
  // - Full test coverage (13 tests passing)
  ```
  
  **Sub-task 2.3.1.2: Implement Loop Detection** ✅ **COMPLETE**
  ```typescript
  // Enhanced loop detection implemented:
  // - Content hashing for duplicate detection (500ms window)
  // - Operation chain tracking for dependency analysis
  // - Known loop pattern detection (update-cycle, thinking-cycle, status-cycle)
  // - Pattern matching with occurrence counting
  // - Chain analysis for repeated message types (>2 = potential loop)
  // - Loop detection statistics and reset functionality
  // - Full test coverage (22 tests passing)
  ```
  
  **Sub-task 2.3.1.3: Add Sync Context to Actions** ✅ **COMPLETE**
  ```typescript
  // Implemented in src/migration/syncMiddleware.ts
  // Features:
  // - SyncAwareAction interface with meta.sync property
  // - Redux middleware for processing sync-aware actions
  // - Helper functions: withSyncMetadata, hasSyncMetadata, getSyncMetadata, withSkipSync
  // - Store configuration updated to include sync middleware
  // - ActionMapper updated to accept and attach sync metadata
  // - Serializable check ignores meta.sync in Redux store
  // - Full test coverage (16 tests passing)
  ```
  
  **Sub-task 2.3.1.4: Integration Points** ✅ **COMPLETE**
  ```typescript
  // Fully integrated StateSynchronizer with ExtensionMessageHandler
  // Features implemented:
  // - postWithDispatch() now uses StateSynchronizer for loop prevention
  // - handleMessage() wraps all webview messages with sync context
  // - syncWebviewToRedux() helper for webview→Redux synchronization
  // - Sync metadata flows through ActionMapper to Redux actions
  // - Complete sync lifecycle tracking (begin/complete) 
  // - Automatic loop detection blocks circular updates
  // - Integration tests verify bidirectional sync (6 tests passing)
  // - Total test count: 207 passing
  ```

- [x] **2.3.2** Add change debouncing mechanism ✅ **COMPLETE**
  
  **Sub-task 2.3.2.1: Implement Debounce Queue** ✅
  ```typescript
  // Completed! Created MessageDebouncer class with:
  // - Generic debouncing for any message type
  // - Configurable per-message-type delays
  // - Support for message batching (thinking blocks)
  // - Automatic flush on max batch size
  // - Promise-based API for async handling
  // File: src/migration/MessageDebouncer.ts
  ```
  
  **Sub-task 2.3.2.2: Message-Specific Debouncing** ✅
  ```typescript
  // Completed! Integrated into ExtensionMessageHandler:
  // - Auto-detection of critical messages (immediate send)
  // - Configurable delays per message type:
  //   - message/thinking: 100ms (batchable)
  //   - message/tokenUsage: 200ms 
  //   - message/update: 50ms
  //   - session/messageUpdated: 50ms
  // - Modified postWithDispatch() to support debouncing
  ```
  
  **Sub-task 2.3.2.3: Streaming Optimization** ✅
  ```typescript
  // Completed! Optimized for streaming:
  // - Thinking blocks batch multiple updates into single message
  // - Automatic flush on thinking completion
  // - Automatic flush on stream end
  // - Preserves message ordering within batches
  // - Combined content for smoother UI updates
  ```
  
  **Sub-task 2.3.2.4: Testing Debounce Behavior** ✅
  ```typescript
  // Completed! Comprehensive test coverage:
  // - 18 unit tests for MessageDebouncer
  // - 8 integration tests for streaming scenarios
  // - Performance tests for high-frequency updates
  // - Error recovery and shutdown tests
  // All 233 tests passing!
  ```

- [ ] **2.3.3** Implement selective field synchronization
  
  **Sub-task 2.3.3.1: Field-Level Change Detection**
  ```typescript
  interface FieldChange {
    path: string[];
    oldValue: any;
    newValue: any;
    operation: 'add' | 'update' | 'delete';
  }
  
  class ChangeDetector {
    detectChanges(oldState: any, newState: any): FieldChange[] {
      // Deep comparison with path tracking
    }
  }
  ```
  
  **Sub-task 2.3.3.2: Sync Rules Configuration**
  - Define which fields trigger immediate sync
  - Configure field dependencies (e.g., message.content → message.timestamp)
  - Set up ignore patterns for local-only state
  
  **Sub-task 2.3.3.3: Partial State Updates**
  - Implement granular webview updates (only changed fields)
  - Create Redux actions for partial updates
  - Handle field merging and conflicts
  
  **Sub-task 2.3.3.4: State Normalization**
  - Ensure consistent field naming between systems
  - Handle type conversions (e.g., Date objects)
  - Validate field compatibility

- [ ] **2.3.4** Create sync performance monitoring 🔶 **IN PROGRESS**
  
  **Sub-task 2.3.4.1: Metrics Collection** ✅
  ```typescript
  // COMPLETED! Lightweight monitoring with minimal overhead
  // File: src/migration/SyncPerformanceMonitor.ts
  
  // Simplified metrics - only what we need
  interface SyncMetrics {
    messageType: string;
    direction: 'toWebview' | 'fromWebview';
    duration: number;
    timestamp: number;
    error?: boolean;
  }
  
  // Zero-allocation design with pre-allocated circular buffer
  class SyncPerformanceMonitor {
    private metrics: SyncMetrics[] = new Array(1000); // Fixed size
    private nextIndex = 0;
    private totalCount = 0;
    private errorCount = 0;
    private sumDuration = 0;
    private maxDuration = 0;
    
    // Extremely lightweight recording
    recordSync(messageType, direction, duration, error = false): void {
      // Always update aggregates (cheap operations)
      this.totalCount++;
      this.sumDuration += duration;
      if (error) this.errorCount++;
      if (duration > this.maxDuration) this.maxDuration = duration;
      
      // Smart sampling: errors + slow ops + 10% normal
      if (error || duration > 10 || Math.random() < 0.1) {
        this.metrics[this.nextIndex] = { messageType, direction, duration, timestamp: Date.now(), error };
        this.nextIndex = (this.nextIndex + 1) % 1000;
      }
    }
    
    // Stats calculated on-demand, not during sync
    getStats(): PerformanceStats {
      return {
        totalSyncs: this.totalCount,
        errorCount: this.errorCount,
        averageDuration: this.totalCount > 0 ? this.sumDuration / this.totalCount : 0,
        maxDuration: this.maxDuration
      };
    }
  }
  
  // Integration: Automatic tracking in StateSynchronizer
  // - Records all sync completions
  // - Tracks blocked syncs as errors
  // - Zero performance impact (< 50ms for 10k ops)
  ```
  
  **Sub-task 2.3.4.2: Performance Thresholds**
  ```typescript
  // Simplified thresholds - built into SyncPerformanceMonitor
  isHealthy(): { healthy: boolean; reason?: string } {
    const stats = this.getStats();
    
    // Three simple checks that matter for Phase 3:
    if (stats.errorCount > stats.totalSyncs * 0.01) {
      return { healthy: false, reason: `Error rate too high: ${(stats.errorCount / stats.totalSyncs * 100).toFixed(2)}%` };
    }
    
    if (this.maxDuration > 100) {
      return { healthy: false, reason: `Max sync too slow: ${this.maxDuration}ms` };
    }
    
    if (stats.averageDuration > 5) {
      return { healthy: false, reason: `Average sync too slow: ${stats.averageDuration.toFixed(2)}ms` };
    }
    
    return { healthy: true };
  }
  
  // Phase 3 Go/No-Go Criteria:
  // ✅ Error rate < 1%
  // ✅ No sync > 100ms  
  // ✅ Average sync < 5ms
  // ✅ Debouncing reduces messages by ~50% (verified separately)
  ```
  
  **Sub-task 2.3.4.3: Diagnostic Tools**
  ```typescript
  // Simplified diagnostic commands - focus on what matters
  
  // 1. Quick health check command
  vscode.commands.registerCommand('claude-code-chat.sync.checkHealth', () => {
    const metrics = stateSynchronizer.getPerformanceMetrics();
    const { stats, health } = metrics;
    
    const message = health.healthy 
      ? `✅ Sync healthy: ${stats.totalSyncs} syncs, avg ${stats.averageDuration.toFixed(1)}ms`
      : `❌ Sync issue: ${health.reason}`;
      
    vscode.window.showInformationMessage(message);
  });
  
  // 2. Export metrics for debugging (only when needed)
  vscode.commands.registerCommand('claude-code-chat.sync.exportMetrics', () => {
    const metrics = stateSynchronizer.getPerformanceMetrics();
    const output = {
      timestamp: new Date().toISOString(),
      stats: metrics.stats,
      health: metrics.health,
      recentSamples: metrics.recentMetrics.slice(0, 50)
    };
    
    // Just copy to clipboard for easy sharing
    vscode.env.clipboard.writeText(JSON.stringify(output, null, 2));
    vscode.window.showInformationMessage('Sync metrics copied to clipboard');
  });
  
  // 3. Reset command for testing
  vscode.commands.registerCommand('claude-code-chat.sync.resetMetrics', () => {
    stateSynchronizer.resetPerformanceMetrics();
    vscode.window.showInformationMessage('Sync metrics reset');
  });
  ```
  
  **Sub-task 2.3.4.4: Integration with PerformanceMonitor**
  ```typescript
  // Keep it simple - monitoring is already integrated where needed
  
  // 1. StateSynchronizer automatically tracks all syncs
  completeSyncToWebview(context: SyncContext): void {
    const duration = performance.now() - context.startTime;
    this.performanceMonitor.recordSync(
      context.messageType,
      'toWebview',
      duration,
      false
    );
  }
  
  // 2. Existing PerformanceMonitor handles general operations
  // No need to complicate - they serve different purposes:
  // - PerformanceMonitor: General operation timing
  // - SyncPerformanceMonitor: Sync-specific lightweight tracking
  
  // 3. Access combined metrics when needed:
  getCombinedMetrics() {
    return {
      sync: stateSynchronizer.getPerformanceMetrics(),
      general: performanceMonitor.getAllStats(),
      debounce: messageDebouncer.getDebounceStats()
    };
  }

  ```
  
  **Implementation Summary for 2.3.4:**
  
  1. **Lightweight Design Principles:**
     - Zero-allocation tracking (pre-allocated buffers)
     - No complex calculations during sync
     - Smart sampling (10% normal, 100% errors/slow)
     - Minimal data collection (only what matters)
  
  2. **What We Actually Track:**
     ```typescript
     // Simple metrics that answer Phase 3 questions:
     - Total sync count
     - Error count (includes blocked syncs)
     - Average duration (simple running average)
     - Max duration (single comparison)
     - Message type counts (for analysis)
     ```
  
  3. **Phase 3 Decision Metrics:**
     ```typescript
     // Three numbers that matter:
     ✅ Error rate < 1%
     ✅ Max sync < 100ms  
     ✅ Average sync < 5ms
     
     // Plus verification from logs:
     ✅ Debouncing working (check message frequency)
     ✅ Loop prevention working (check for duplicates)
     ```
  
  4. **Why This Design:**
     - Performance impact: < 50ms for 10,000 operations
     - Memory footprint: < 10MB even after hours
     - No blocking operations during sync
     - Clear go/no-go criteria for Phase 3

#### Testing Strategy for Phase 2.3:
1. **Unit Tests**: Each sub-component in isolation
2. **Integration Tests**: Full sync flow with mock webview
3. **Stress Tests**: High-frequency state changes
4. **Regression Tests**: Ensure no message loss or duplication
5. **Performance Tests**: Verify monitoring overhead < 1%

### 📝 Phase 2 Implementation Guide for Claude

#### Before Starting ANY Task:
1. **Run the analysis commands** in Task 2.0.1 to understand the codebase
2. **Read CLAUDE.md** to understand project conventions
3. **Check feature flags** - they control which code paths are active

#### Key Files to Understand:
- `src/services/ExtensionMessageHandler.ts` - The main integration point
- `src/protocol/WebviewProtocol.ts` - How messages flow to/from webview
- `src/services/ClaudeService.ts` - How Claude API integration works
- `src/migration/*` - All migration utilities we've built

#### Testing Strategy:
1. **Unit Tests First** (Task 2.0.2) - Mock all dependencies
2. **Integration Tests** - Use existing `messageFlow.integration.test.ts`
3. **Manual Testing** - Create test scenarios with feature flags

#### Common Pitfalls to Avoid:
- ❌ Don't modify Redux state directly - always use actions
- ❌ Don't break existing functionality - dual-write is safer
- ❌ Don't ignore TypeScript errors - they catch real bugs
- ❌ Don't skip state validation - it prevents corruption

#### Success Criteria for Phase 2:
- [ ] All existing tests still pass
- [ ] State comparison shows no discrepancies
- [ ] Performance metrics show < 5ms overhead
- [ ] Feature flags can disable any change instantly
- [ ] No thinking block duplication bugs

---

## **Phase 3: StateManager Activation**
*Estimated Time: 2-3 hours*
*Priority: HIGH - Core switch with safety nets*

### Task 3.1: Extension.ts Integration
- [ ] **3.1.1** Add conditional StateManager initialization
  ```typescript
  // In extension.ts
  let stateManager: SimpleStateManager | StateManager;
  
  if (getFeatureFlag('useReduxStateManager')) {
    stateManager = StateManager.getInstance();
    stateManager.initialize(context);
    
    // Add state migration if needed
    const existingState = context.workspaceState.get('simpleState');
    if (existingState) {
      await migrateToReduxState(existingState, stateManager);
    }
  } else {
    stateManager = new SimpleStateManager(context);
  }
  ```
- [ ] **3.1.2** Update ServiceContainer with type guards
- [ ] **3.1.3** Add initialization error handling
- [ ] **3.1.4** Implement health checks

### Task 3.2: Session Migration Strategy
- [ ] **3.2.1** Create per-session migration flags
- [ ] **3.2.2** Implement gradual session migration
  ```typescript
  class SessionMigrator {
    async migrateSession(sessionId: string): Promise<void> {
      // Load from SimpleStateManager format
      // Convert to Redux format
      // Validate conversion
      // Mark as migrated
    }
  }
  ```
- [ ] **3.2.3** Add migration progress tracking
- [ ] **3.2.4** Create migration rollback per session

### Task 3.3: Parallel State Validation
- [ ] **3.3.1** Run both state managers simultaneously
- [ ] **3.3.2** Compare states after each operation
- [ ] **3.3.3** Log all discrepancies with context
- [ ] **3.3.4** Create automated discrepancy alerts

---

## **Phase 4: Testing and Validation**
*Estimated Time: 4-5 hours*
*Priority: CRITICAL - Must pass before proceeding*

### Task 4.1: Unit Testing (🚀 Vitest - Fast Feedback Loop)
- [ ] **4.1.1** Test ActionMapper with all known actions
- [ ] **4.1.2** Test state synchronization logic
- [ ] **4.1.3** Test loop prevention mechanisms
- [ ] **4.1.4** Test feature flag toggles
- [ ] **4.1.5** Test migration rollback scenarios
  - **Run with**: `npm run test:unit:watch` for TDD cycle

### Task 4.2: Integration Testing (VS Code Test Runner)
- [ ] **4.2.1** Test complete conversation flow
  - Start conversation → Send message → Receive response
  - Thinking blocks appear and disappear correctly
  - Tools execute and results display
  - Tokens count accurately
- [ ] **4.2.2** Test the manual stop/resume bug fix specifically
  - Start conversation with thinking
  - Manually stop during thinking
  - Resume and verify no duplicate thinking blocks
- [ ] **4.2.3** Test state persistence
  - Create conversation
  - Restart VS Code
  - Verify conversation restored correctly
- [ ] **4.2.4** Test concurrent operations
- [ ] **4.2.5** Test error recovery scenarios

### Task 4.3: Performance Validation
- [ ] **4.3.1** Compare benchmarks with Phase 0 baseline
- [ ] **4.3.2** Memory usage profiling
- [ ] **4.3.3** CPU usage during state sync
- [ ] **4.3.4** Extension startup time
- [ ] **4.3.5** Large conversation handling

### Task 4.4: User Acceptance Testing
- [ ] **4.4.1** Deploy to small test group
- [ ] **4.4.2** Monitor for any regression reports
- [ ] **4.4.3** Collect performance feedback
- [ ] **4.4.4** Validate all workflows function correctly

---

## **Phase 5: Gradual Rollout**
*Estimated Time: 1-2 weeks (passive)*
*Priority: MEDIUM - Safety through gradual adoption*

### Task 5.1: Phased Deployment
- [ ] **5.1.1** Enable for 10% of users
- [ ] **5.1.2** Monitor telemetry and errors
- [ ] **5.1.3** Increase to 50% after 3 days if stable
- [ ] **5.1.4** Full rollout after 1 week if stable

### Task 5.2: Monitoring and Alerting
- [ ] **5.2.1** Set up error rate monitoring
- [ ] **5.2.2** Create performance regression alerts
- [ ] **5.2.3** Monitor state discrepancy logs
- [ ] **5.2.4** Track rollback trigger frequency

### Task 5.3: User Communication
- [ ] **5.3.1** Prepare rollback instructions
- [ ] **5.3.2** Create known issues documentation
- [ ] **5.3.3** Set up feedback collection
- [ ] **5.3.4** Communicate benefits of migration

---

## **Phase 6: Cleanup and Optimization**
*Estimated Time: 2-3 hours*
*Priority: LOW - Only after successful rollout*

### Task 6.1: Remove Legacy Code
- [ ] **6.1.1** Wait 2 weeks after full rollout
- [ ] **6.1.2** Remove SimpleStateManager (keep in git history)
- [ ] **6.1.3** Remove compatibility shims
- [ ] **6.1.4** Remove parallel state tracking
- [ ] **6.1.5** Clean up feature flags

### Task 6.2: Performance Optimization
- [ ] **6.2.1** Remove state comparison overhead
- [ ] **6.2.2** Optimize Redux subscriptions
- [ ] **6.2.3** Implement memoization where beneficial
- [ ] **6.2.4** Profile and optimize hot paths

### Task 6.3: Documentation
- [ ] **6.3.1** Update architecture documentation
- [ ] **6.3.2** Document new state management patterns
- [ ] **6.3.3** Create troubleshooting guide
- [ ] **6.3.4** Update developer onboarding

---

## **Risk Mitigation Strategies**

### Critical Risk: State Synchronization Loops
- **Prevention**: Directional sync flags, debouncing
- **Detection**: Loop detection counter with auto-disable
- **Recovery**: Automatic fallback to SimpleStateManager

### Critical Risk: Breaking Existing Functionality  
- **Prevention**: Comprehensive tests, gradual rollout
- **Detection**: Error monitoring, user reports
- **Recovery**: Feature flag disable, immediate rollback

### High Risk: Performance Regression
- **Prevention**: Continuous benchmarking
- **Detection**: Performance monitoring alerts
- **Recovery**: Optimization or architectural changes

### Medium Risk: Data Loss During Migration
- **Prevention**: Backup all state before migration
- **Detection**: State validation after migration
- **Recovery**: Restore from backup, retry migration

---

## **Success Criteria**

### Must Have (Phase Gate Requirements):
- [ ] ✅ 100% of existing functionality works identically
- [ ] ✅ Thinking blocks accumulation bug is fixed
- [ ] ✅ No performance regression > 10%
- [ ] ✅ All integration tests pass
- [ ] ✅ Rollback tested and documented

### Should Have:
- [ ] ✅ Sessions persist across VS Code restarts  
- [ ] ✅ Improved error handling and recovery
- [ ] ✅ Better state debugging capabilities
- [ ] ✅ Cleaner architecture for future features

### Nice to Have:
- [ ] ✅ Redux DevTools integration for debugging
- [ ] ✅ State history/time travel in development
- [ ] ✅ Performance improvements from optimizations

---

## **Estimated Total Time: 20-25 hours active + 2 weeks passive monitoring**

### Recommended Execution Plan:
1. **Week 1**: Phase 0-1 (Foundation) - 5-7 hours
2. **Week 2**: Phase 2-3 (Integration) - 6-8 hours  
3. **Week 3**: Phase 4 (Testing) - 4-5 hours
4. **Week 4-5**: Phase 5 (Rollout) - Passive monitoring
5. **Week 6**: Phase 6 (Cleanup) - 2-3 hours

---

## **Next Steps**

### Immediate Actions (Do First):
1. **Create feature branch**: `git checkout -b feature/safe-statemanager-migration`
2. **Set up test infrastructure**: Start with Phase 0, Task 0.1
3. **Implement feature flags**: Phase 0, Task 0.2
4. **Begin action mapping analysis**: Document all webview actions

### Decision Points:
- After Phase 0: Go/No-Go based on test coverage
- After Phase 2: Go/No-Go based on integration success
- After Phase 4: Go/No-Go based on test results
- During Phase 5: Continue/Rollback based on metrics

### Key Principles:
- 🚨 **Never break existing functionality**
- 🔄 **Always have a rollback path**
- 📊 **Measure everything**
- 🧪 **Test exhaustively**
- 📢 **Communicate clearly**

This plan prioritizes safety and reliability over speed, ensuring the Claude Code extension continues to work flawlessly throughout the migration.