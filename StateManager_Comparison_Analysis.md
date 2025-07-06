# StateManager vs SimpleStateManager Action Comparison

## 1. Actions Currently Dispatched in Webview (App.tsx)

### Session Actions
- `session/messageAppended` - Appends content to current message
- `session/tokensUpdated` - Updates token count
- `session/resumed` - Resumes a session
- `session/cleared` - Clears session
- `session/modelSelected` - Selects a model
- `session/messageAdded` ✅ - Adds new message
- `session/messageUpdated` ✅ - Updates existing message
- `session/messageCompleted` ✅ - Marks message as complete
- **`session/thinkingUpdated` ✅** - Critical for thinking blocks
- **`session/toolUseAdded` ✅** - For tool management
- **`session/toolResultAdded` ✅** - For tool results
- **`session/tokenUsageUpdated` ✅** - For token tracking

### UI Actions
- `ui/setReady` - Sets webview ready state
- `ui/showError` - Shows error message
- `ui/showPermissionRequest` ✅ - Shows permission dialog
- `ui/showNotification` - Shows notification
- `ui/showPlanProposal` - Shows plan proposal

### Claude Actions
- **`claude/setProcessing` ✅** - Sets processing state

### Other Actions
- `stream/messageReceived` - Handles Claude stream messages
- `config/initializeConfig` - Initialize config
- `mcp/updateConnectedServers` - Update MCP server status

## 2. What StateManager Provides

### Direct Methods
- `createOrResumeSession(sessionId, title)` - Creates or resumes session
- `getCurrentSessionId()` - Gets current session ID
- `updateSessionFromResult(result)` - Updates from Claude result
- `setCurrentSession(sessionId)` - Sets current session
- `getSelectedModel()` - Gets selected model
- `setSelectedModel(model)` - Sets selected model with validation
- `setClaudeRunning(running)` - Sets Claude running state
- `setWebviewReady(ready)` - Sets webview ready state
- `trackProcess(sessionId, pid)` - Tracks process
- `untrackProcess(sessionId)` - Removes process tracking
- `getTotalCost()` - Gets total cost
- `getTotalTokens()` - Gets total tokens

### Generic Methods
- `dispatch(action)` - Generic dispatch for any action
- `getState()` - Get current state
- `subscribe(listener)` - Subscribe to state changes

## 3. Available Actions in Redux Slices

### sessionSlice Exports
✅ All critical actions are exported:
- `createSession`
- `setCurrentSession`
- `updateSessionTitle`
- `addMessage`
- `updateTokenUsage`
- `setLoading`
- `setError`
- `clearSession`
- `deleteSession`
- `loadSessions`
- `messageAdded` ✅
- `messageUpdated` ✅
- `messageCompleted` ✅
- **`thinkingUpdated` ✅**
- **`tokenUsageUpdated` ✅**
- **`toolUseAdded` ✅**
- **`toolResultAdded` ✅**

### uiSlice Exports
- `setWebviewReady`
- `setClaudeRunning`
- `setShowThinking`
- `setShowCost`
- `toggleToolExpanded`
- `setToolExpanded`
- `clearExpandedTools`
- `showPermissionRequest` ✅
- `clearPermissionRequest`
- `resetUI`

### claudeSlice Exports
- `setConnected`
- **`setProcessing` ✅**
- `setError`
- `setCurrentModel`
- `updateClaudeState`

## 4. Missing Actions Analysis

### Actions NOT in Redux Slices (need custom handling):
1. **`session/messageAppended`** - Not a slice action, needs custom logic
2. **`session/tokensUpdated`** - Not a slice action, use `updateTokenUsage` instead
3. **`session/resumed`** - Not a slice action, use `setCurrentSession`
4. **`session/cleared`** - Not a slice action, use `clearSession`
5. **`session/modelSelected`** - Not a slice action, use config slice
6. **`ui/setReady`** - Not a slice action, use `setWebviewReady`
7. **`ui/showError`** - Not a slice action, needs custom handling
8. **`ui/showNotification`** - Not a slice action, needs custom handling
9. **`ui/showPlanProposal`** - Not a slice action, needs custom handling
10. **`stream/messageReceived`** - Not a slice action, needs custom handling
11. **`config/initializeConfig`** - Not a slice action, needs custom handling
12. **`mcp/updateConnectedServers`** - Not a slice action, needs custom handling

## 5. Critical Functionality Assessment

### ✅ Fully Supported Critical Actions:
- `session/thinkingUpdated` → Can use `dispatch(thinkingUpdated(...))`
- `session/toolUseAdded` → Can use `dispatch(toolUseAdded(...))`
- `session/toolResultAdded` → Can use `dispatch(toolResultAdded(...))`
- `session/tokenUsageUpdated` → Can use `dispatch(tokenUsageUpdated(...))`
- `claude/setProcessing` → Can use `dispatch(setProcessing(...))`

### ⚠️ Actions Requiring Mapping:
StateManager can handle ALL actions through its generic `dispatch()` method, but some actions from the webview don't match slice action names:

1. **Token Updates**: 
   - Webview: `session/tokensUpdated`
   - Slice: `updateTokenUsage` or `tokenUsageUpdated`

2. **UI Ready State**:
   - Webview: `ui/setReady`
   - Slice: `setWebviewReady`

3. **Session Operations**:
   - Webview: `session/resumed` → Use `setCurrentSession`
   - Webview: `session/cleared` → Use `clearSession`

## 6. Conclusion

**StateManager CAN be a drop-in replacement** for SimpleStateManager because:

1. ✅ It has a generic `dispatch()` method that can handle ANY action
2. ✅ All critical actions for thinking blocks, tools, and tokens are available in the slices
3. ✅ It provides convenience methods for common operations
4. ✅ It maintains the same state structure

### Required Implementation:
To make StateManager work with the existing webview, you need to:

1. **Create a middleware or adapter** that maps webview action types to slice actions:
   ```typescript
   // Example mapping
   const actionMap = {
     'session/tokensUpdated': (payload) => updateTokenUsage(payload),
     'ui/setReady': (payload) => setWebviewReady(payload),
     'session/resumed': (payload) => setCurrentSession(payload.sessionId),
     // etc.
   };
   ```

2. **Handle non-slice actions** (like stream/messageReceived) with custom reducers or middleware

3. **Import and use slice actions** directly in StateManager for cleaner API

The StateManager already provides the foundation - it just needs action mapping to be fully compatible with the existing webview communication protocol.