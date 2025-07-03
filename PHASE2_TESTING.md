# Phase 2 Testing Guide

## How to Test Abort Functionality in VS Code

### 1. Start Extension in Debug Mode
1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open with the extension loaded

### 2. Open Debug Console
1. In the new VS Code window, go to View → Debug Console
2. You should see messages indicating the extension loaded
3. Look for: `Test utilities loaded! Use abortTest.* in Debug Console`

### 3. Test Commands Available

In the Debug Console, you can type these commands:

```javascript
// Initial setup (run this first)
abortTest.setup()

// Start a Claude process
abortTest.startProcess()

// Check current status
abortTest.status()

// Abort the current process
abortTest.abort()

// Get the AbortController directly
abortTest.getController()

// Test abort signal functionality
abortTest.testAbortSignal()

// Run all tests automatically
abortTest.runAll()
```

### 4. Expected Test Results

#### When you run `abortTest.startProcess()`:
```
🚀 Starting process with session: abort_test_1234567890
✅ Process started successfully!
   PID: 12345
   Has AbortController: YES
   Signal aborted: false
```

#### When you run `abortTest.abort()`:
```
🛑 Aborting process...
   Session: abort_test_1234567890
   Signal already aborted: false
✅ Abort signal sent!
   Signal now aborted: true

📤 Process Exit Event:
   Exit code: 143
   Exit signal: SIGTERM
   Was aborted: true
   SIGTERM exit (143): YES ✅

🧹 Cleanup Check:
   Controller removed: YES ✅
   Process removed: YES ✅
```

### 5. What Phase 2 Validates

- ✅ AbortSignal is passed to child process spawn
- ✅ Abort event listener fires when controller.abort() is called
- ✅ Process receives SIGTERM and exits with code 143
- ✅ AbortController is cleaned up after process exit
- ✅ Process is removed from manager after exit
- ✅ No memory leaks from orphaned controllers

### 6. Manual Test Scenarios

1. **Basic Abort Test**:
   ```javascript
   abortTest.setup()
   abortTest.startProcess()
   // Wait a moment, then:
   abortTest.abort()
   ```

2. **Check Cleanup**:
   ```javascript
   abortTest.status()  // Before abort
   abortTest.abort()
   // Wait for exit message
   abortTest.status()  // After abort - should show no process
   ```

3. **Direct Signal Test**:
   ```javascript
   abortTest.testAbortSignal()
   // Should show event fired immediately
   ```

### 7. Debugging Tips

- Check the Output panel (View → Output → Claude Code GUI) for detailed logs
- The Debug Console shows all console.log statements
- Look for `[ClaudeProcessManager]` logs to track abort flow
- Exit code 143 = 128 + 15 (SIGTERM signal number)

### 8. Common Issues

- If `abortTest` is undefined, make sure you're in debug mode (F5)
- If setup() fails, check that ServiceContainer initialized properly
- If process doesn't start, check Claude CLI is installed
- If abort doesn't work, check Node.js version supports AbortSignal (v15.4+)

## Next Steps

Once Phase 2 is verified working:
1. Phase 3 will connect the UI stop button to trigger abort
2. Phase 4 will ensure session preservation after abort
3. Phase 5 will handle edge cases and error scenarios