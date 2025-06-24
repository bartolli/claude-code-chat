# Debugging Guide - Current State

## Current Architecture (As of Phase 3 completion)

### What's Built But Not Integrated:
1. **Redux Store** - Running but not connected to UI
2. **StateManager** - Initialized but not used for actual state
3. **Services** - Created but extension still uses direct methods

### What's Still Using Old Code:
1. **UI** - Still imports from `./ui` (the old HTML string)
2. **State Variables** - Using instance variables:
   - `_currentSessionId`
   - `_selectedModel` 
   - `_totalCost`
   - `_conversationIndex`
   - etc.
3. **Message Handling** - Direct webview.postMessage calls

## How to Debug

### 1. Launch Extension in Debug Mode
```bash
# Press F5 in VS Code or:
# Run > Start Debugging
```

### 2. Open Developer Tools in Extension Host
- In the new VS Code window that opens
- Help > Toggle Developer Tools (Ctrl+Shift+I)
- Go to Console tab

### 3. Check Redux State
```javascript
// In the debug console, you can check:
// (But note: state is not yet connected to UI)

// The store exists but isn't driving the UI yet
// You'll see console logs from:
console.log('Claude Code Chat extension is being activated!');
```

### 4. Current State Flow
```
User Action in Webview
    ↓
webview.postMessage
    ↓
ClaudeChatProvider._handleMessage()
    ↓
Updates instance variables (_selectedModel, etc.)
    ↓
Posts message back to webview
```

### 5. New State Flow (Not Yet Connected)
```
User Action in Webview
    ↓
Protocol Message
    ↓
StateManager.dispatch()
    ↓
Redux Store Update
    ↓
Selectors Recompute
    ↓
UI Updates (via subscription)
```

## Key Files to Set Breakpoints

### Currently Active (Old System):
- `src/extension.ts:233` - Model selection handler
- `src/extension.ts:281` - Send message to Claude
- `src/extension.ts:595` - Process Claude output

### Ready But Not Connected (New System):
- `src/state/StateManager.ts:85` - Create/resume session
- `src/state/StateManager.ts:143` - Set selected model
- `src/state/slices/sessionSlice.ts:23` - Create session reducer

## What You'll See in DevTools

### Console Output:
```
Claude Code Chat extension is being activated!
[Logger] [Extension] Claude Code Chat extension is being activated
[Logger] [ServiceContainer] Initializing services
[Logger] [StateManager] Initializing state manager
```

### Network Tab:
- No network calls yet (Claude runs as subprocess)

### Elements Tab:
- Webview iframe with old UI HTML

## State Inspection

The Redux store exists but isn't connected to the UI. To inspect it:

1. Set a breakpoint in `StateManager.getState()`
2. Or add temporary logging:

```typescript
// In extension.ts activate():
setTimeout(() => {
    console.log('Current Redux State:', services.stateManager.getState());
}, 1000);
```

## Next Integration Steps

To actually use the new state management, we need to:

1. Replace instance variables with StateManager calls
2. Update message handlers to dispatch Redux actions
3. Subscribe to state changes and update webview
4. Eventually replace the HTML UI with the React GUI

But for now, everything works with the old system while the new infrastructure waits to be connected.