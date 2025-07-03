# Phase 1 Testing Guide

## How to Test Phase 1 Implementation

### Prerequisites
1. Build the extension: `npm run compile`
2. Open VS Code with the extension loaded
3. Open the Output panel and select "Claude Code GUI" channel

### Test Scenarios

#### Test 1: Basic AbortController Creation
1. Open the Claude Code Chat panel
2. Send a message to Claude
3. **Check Output Panel for:**
   ```
   [ClaudeProcessManager] Created/stored AbortController for session <session-id>
   isCustomController: false
   totalControllers: 1
   ```
4. **Verify spawn success log includes:**
   ```
   abortControllerAccessible: true
   abortControllerValid: true
   ```

#### Test 2: Multiple Sessions
1. Send a message to Claude
2. Wait for response
3. Clear session (New Session button)
4. Send another message
5. **Check Output Panel:**
   - Should show `totalControllers: 2` for second session
   - Different session IDs for each

#### Test 3: Controller Cleanup
1. Start a Claude session
2. Note the session ID in logs
3. Stop the extension or close VS Code
4. **Check logs for:**
   ```
   [ClaudeProcessManager] Claude process terminated
   ```
5. Restart and check that controllers start fresh

#### Test 4: Debug Logging
1. If debug logging is enabled, when getting abort controller:
   ```
   [ClaudeProcessManager] Getting abort controller for session <session-id>
   found: true/false
   totalControllers: <number>
   ```

### What to Look For

#### Success Indicators:
- ✅ AbortController created for each session
- ✅ Controllers stored with correct session IDs
- ✅ Controllers accessible after spawn
- ✅ No errors in console
- ✅ Existing functionality still works

#### Potential Issues:
- ❌ "abortControllerAccessible: false" - Controller not stored properly
- ❌ "totalControllers" not incrementing - Storage issue
- ❌ Errors about AbortController - Compatibility issue

### Debugging Tips

1. **Enable verbose logging** in VS Code settings:
   ```json
   "claudeCodeChatModern.logLevel": "debug"
   ```

2. **Check session IDs** match between:
   - Controller creation log
   - Process spawn log
   - Any getAbortController calls

3. **Monitor memory** - Controllers should be cleaned up on terminate

### Next Steps
Once all tests pass:
1. Confirm no regression in existing features
2. Document any issues found
3. Proceed to Phase 2 implementation

## Quick Verification Commands

In VS Code Developer Tools Console (Help > Toggle Developer Tools):
```javascript
// Check if extension is loaded
const ext = vscode.extensions.getExtension('claude-code-chat.claude-code-chat-modern');
console.log('Extension active:', ext?.isActive);
```