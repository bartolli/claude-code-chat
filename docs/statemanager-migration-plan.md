# StateManager Migration Plan

## **Overview**
Migrate from SimpleStateManager to the full Redux-based StateManager to gain persistence, proper session management, and improved thinking block handling.

## **Phase 1: Pre-Migration Preparation** 
*Estimated Time: 1-2 hours*

### Task 1.1: Create Backup and Fallback Strategy
- [ ] **1.1.1** Create git branch for migration: `feature/migrate-to-state-manager`
- [ ] **1.1.2** Document current SimpleStateManager usage patterns
- [ ] **1.1.3** Create rollback script to quickly revert changes
- [ ] **1.1.4** Test current functionality works as baseline

### Task 1.2: Interface Compatibility Analysis
- [ ] **1.2.1** Compare SimpleStateManager vs StateManager method signatures
- [ ] **1.2.2** Identify breaking changes in return types or parameters
- [ ] **1.2.3** Create compatibility shim if needed
- [ ] **1.2.4** Document migration mapping for each method

### Task 1.3: Environment Setup
- [ ] **1.3.1** Ensure Redux DevTools are disabled in production
- [ ] **1.3.2** Set up debugging for Redux state in development
- [ ] **1.3.3** Create state inspection utilities

## **Phase 2: Core Migration Implementation**
*Estimated Time: 4-6 hours*

### Task 2.1: Update Extension Initialization
**Files**: `src/extension.ts`, `src/core/ServiceContainer.ts`

- [ ] **2.1.1** Replace SimpleStateManager import with StateManager
  ```typescript
  // Before:
  const { SimpleStateManager } = require('./state/SimpleStateManager');
  const stateManager = new SimpleStateManager(context);
  
  // After:
  const { StateManager } = require('./state/StateManager');
  const stateManager = StateManager.getInstance();
  stateManager.initialize(context);
  ```

- [ ] **2.1.2** Update ServiceContainer type definitions
  ```typescript
  // In core/ServiceContainer.ts
  StateManager: StateManager; // Instead of SimpleStateManager
  ```

- [ ] **2.1.3** Test extension activation doesn't break

### Task 2.2: Update ExtensionMessageHandler Integration
**File**: `src/services/ExtensionMessageHandler.ts`

- [ ] **2.2.1** Replace direct webview protocol calls with StateManager calls
  ```typescript
  // Before:
  this.webviewProtocol.post('message/add', { role: 'user', content: data.text });
  
  // After:
  this.stateManager.addMessageToSession({ role: 'user', content: data.text });
  this.webviewProtocol.post('message/add', { role: 'user', content: data.text });
  ```

- [ ] **2.2.2** Replace thinking block handling
  ```typescript
  // Before:
  this.webviewProtocol?.post('message/thinking', { content, isActive, messageId });
  
  // After:
  this.stateManager.updateThinking({ content, isActive, messageId });
  this.webviewProtocol?.post('message/thinking', { content, isActive, messageId });
  ```

- [ ] **2.2.3** Replace tool use tracking
  ```typescript
  // Before:
  this.webviewProtocol?.post('message/toolUse', toolData);
  
  // After:
  this.stateManager.addToolUse(toolData);
  this.webviewProtocol?.post('message/toolUse', toolData);
  ```

- [ ] **2.2.4** Update token usage tracking
- [ ] **2.2.5** Update session creation and management
- [ ] **2.2.6** Update process tracking

### Task 2.3: Handle State Synchronization
**Focus**: Ensure backend Redux state stays in sync with frontend

- [ ] **2.3.1** Add state change listeners in ExtensionMessageHandler
  ```typescript
  this.stateManager.subscribe(() => {
    // Sync relevant state changes to webview
    const state = this.stateManager.getState();
    // Send updates via webview protocol
  });
  ```

- [ ] **2.3.2** Implement selective state sync (avoid infinite loops)
- [ ] **2.3.3** Handle state conflicts between backend and frontend
- [ ] **2.3.4** Add debugging for state sync issues

## **Phase 3: Persistence and Session Management**
*Estimated Time: 2-3 hours*

### Task 3.1: Implement Session Persistence
- [ ] **3.1.1** Update session creation in handleChatMessage
  ```typescript
  // Use StateManager session management
  if (!this.stateManager.getCurrentSessionId()) {
    this.stateManager.createOrResumeSession(sessionId, 'New Conversation');
  }
  ```

- [ ] **3.1.2** Implement session restoration on extension startup
- [ ] **3.1.3** Handle session cleanup on extension shutdown
- [ ] **3.1.4** Test session persistence across VS Code restarts

### Task 3.2: Migration of Existing State
- [ ] **3.2.1** Create migration script for existing workspace state
- [ ] **3.2.2** Convert SimpleStateManager data format to Redux format
- [ ] **3.2.3** Preserve user preferences (model selection, etc.)
- [ ] **3.2.4** Handle edge cases and corrupted state

### Task 3.3: Workspace State Integration
- [ ] **3.3.1** Ensure VS Code workspace state APIs work correctly
- [ ] **3.3.2** Test multi-workspace scenarios
- [ ] **3.3.3** Handle workspace switching and cleanup

## **Phase 4: Testing and Validation**
*Estimated Time: 3-4 hours*

### Task 4.1: Unit Testing
- [ ] **4.1.1** Test StateManager method compatibility
- [ ] **4.1.2** Test session creation and management
- [ ] **4.1.3** Test thinking block lifecycle
- [ ] **4.1.4** Test tool use tracking
- [ ] **4.1.5** Test token counting and cost tracking

### Task 4.2: Integration Testing
- [ ] **4.2.1** Test full conversation flow with thinking blocks
- [ ] **4.2.2** Test manual stop/resume scenarios (the original bug)
- [ ] **4.2.3** Test multiple tool use scenarios
- [ ] **4.2.4** Test error handling and recovery
- [ ] **4.2.5** Test VS Code restart scenarios

### Task 4.3: Performance Testing
- [ ] **4.3.1** Test memory usage with Redux store
- [ ] **4.3.2** Test extension startup time impact
- [ ] **4.3.3** Test with large conversation histories
- [ ] **4.3.4** Profile state synchronization performance

### Task 4.4: User Experience Testing
- [ ] **4.4.1** Test UI responsiveness during thinking
- [ ] **4.4.2** Test conversation history preservation
- [ ] **4.4.3** Test model switching and preferences
- [ ] **4.4.4** Test error messages and user feedback

## **Phase 5: Cleanup and Optimization**
*Estimated Time: 1-2 hours*

### Task 5.1: Remove Legacy Code
- [ ] **5.1.1** Remove SimpleStateManager.ts file
- [ ] **5.1.2** Clean up unused imports and references
- [ ] **5.1.3** Update type definitions
- [ ] **5.1.4** Remove compatibility shims if created

### Task 5.2: Documentation and Code Quality
- [ ] **5.2.1** Update code comments and documentation
- [ ] **5.2.2** Add JSDoc for new StateManager methods
- [ ] **5.2.3** Update README with new state management info
- [ ] **5.2.4** Run linting and fix any issues

### Task 5.3: Performance Optimization
- [ ] **5.3.1** Optimize state subscription patterns
- [ ] **5.3.2** Add selective re-rendering optimizations
- [ ] **5.3.3** Minimize state sync overhead
- [ ] **5.3.4** Profile and optimize hot paths

## **Phase 6: Deployment and Monitoring**
*Estimated Time: 1 hour*

### Task 6.1: Pre-deployment Validation
- [ ] **6.1.1** Run full test suite
- [ ] **6.1.2** Test in clean VS Code environment
- [ ] **6.1.3** Validate all features work as expected
- [ ] **6.1.4** Check for any regressions

### Task 6.2: Deployment Strategy
- [ ] **6.2.1** Deploy to development/testing environment first
- [ ] **6.2.2** Get user feedback on critical workflows
- [ ] **6.2.3** Monitor for any issues or performance regressions
- [ ] **6.2.4** Create rollback plan if issues arise

## **Risk Mitigation Strategies**

### High Risk Areas:
1. **State Synchronization Issues**
   - Mitigation: Implement comprehensive logging and debugging
   - Fallback: Graceful degradation to webview-only state

2. **Performance Regressions**
   - Mitigation: Profile before/after migration
   - Fallback: Optimize or revert if unacceptable

3. **Data Loss During Migration**
   - Mitigation: Comprehensive backup and migration testing
   - Fallback: State reconstruction from webview data

4. **Breaking Changes in Interface**
   - Mitigation: Thorough compatibility testing
   - Fallback: Compatibility shim layer

## **Success Criteria**

- [ ] ✅ All existing functionality works as before
- [ ] ✅ Thinking blocks no longer accumulate after manual stops
- [ ] ✅ Sessions persist across VS Code restarts
- [ ] ✅ Token counting and cost tracking work correctly
- [ ] ✅ No performance regressions
- [ ] ✅ Extension startup time remains acceptable
- [ ] ✅ User preferences are preserved
- [ ] ✅ Error handling is improved

## **Estimated Total Time: 12-18 hours**

**Recommended Approach**: 
- Start with Phase 1-2 in one session (6-8 hours)
- Complete Phase 3-4 in a second session (5-7 hours)  
- Finish Phase 5-6 in a final session (2-3 hours)

This plan ensures a systematic, tested migration with proper fallback strategies and comprehensive validation.