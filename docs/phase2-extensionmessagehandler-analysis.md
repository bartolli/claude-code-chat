# Phase 2.0.1: ExtensionMessageHandler Analysis

## Overview
ExtensionMessageHandler is the core message routing component that bridges VS Code extension, webview, and Claude processes. It currently manages state using local instance variables and communicates state changes via webviewProtocol.post() calls.

## Current Architecture

### Key Dependencies
- **SimpleWebviewProtocol**: For webview communication
- **ServiceContainer**: For dependency injection (Logger, StreamProcessor, etc.)
- **ClaudeProcessManager**: For Claude CLI process management
- **No direct StateManager dependency**: State is managed locally

### State Management Pattern
The handler maintains state through private instance variables:

```typescript
// Session state
private currentSessionId: string | null = null;
private currentClaudeProcess: ClaudeProcessAdapter | null = null;
private currentAbortController: AbortController | null = null;

// Message state
private currentAssistantMessageId: string | null = null;
private thinkingMessageId: string | null = null;
private hasCreatedAssistantMessage: boolean = false;
private isFirstTextBlock: boolean = true;

// Thinking state
private thinkingStartTime: number | null = null;
private accumulatedThinking: string = '';
private latestThinkingLine: string = '';

// Plan mode state
private waitingForPlan: boolean = false;
private hasReceivedPlan: boolean = false;
private isInPlanMode: boolean = false;

// Tool tracking
private hasSeenToolUse: boolean = false;
private pendingToolIds: Set<string> = new Set();
private pendingPermissionResponses: Map<string, (response: string) => void> = new Map();
```

### Message Flow
1. **Incoming messages**: `handleMessage()` receives messages from webview
2. **Processing**: Updates local state variables during stream processing
3. **Outgoing updates**: Calls `webviewProtocol.post()` to notify webview

### Key WebviewProtocol Posts
The handler sends these state updates to the webview:

**Message Management**:
- `message/add` - Add new message (user/assistant)
- `message/update` - Update existing message content
- `message/thinking` - Update thinking block
- `message/toolUse` - Tool usage notification
- `message/toolResult` - Tool execution results
- `message/planProposal` - Plan mode proposals
- `message/tokenUsage` - Token usage stats

**Status Updates**:
- `status/processing` - Toggle processing state
- `chat/messageComplete` - Signal message completion
- `planMode/toggle` - Toggle plan mode
- `error/show` - Display errors

**Other**:
- `permission/request` - Request user permission
- `mcp/status` - MCP server status
- `terminal/opened` - Terminal opened notification

## Integration Points for StateManager

### 1. Message State Updates
Currently handled via direct webviewProtocol posts:
```typescript
this.webviewProtocol.post('message/add', {
  role: 'user',
  content: data.text,
  messageId: generateMessageId(),
  timestamp: new Date().toISOString()
});
```

Should dispatch Redux actions:
```typescript
const action = this.actionMapper.mapFromWebview({
  type: 'message/add',
  payload: { role: 'user', content: data.text, messageId, timestamp }
});
this.stateManager.dispatch(action);
```

### 2. Processing State
Currently:
```typescript
this.webviewProtocol?.post('status/processing', true);
```

Should be:
```typescript
this.stateManager.dispatch(setProcessingStatus(true));
```

### 3. Session Management
Currently uses local variables. Should sync with StateManager's session state.

### 4. Stream Processing
The `processStream()` method handles Claude's streaming responses and updates state incrementally. This is where most state mutations occur.

## Migration Strategy

### Phase 2.1: Read-Only Integration
1. Add StateManager as dependency
2. Dispatch actions alongside existing webviewProtocol posts
3. No behavior changes - dual state updates

### Phase 2.2: Write Integration
1. Replace webviewProtocol posts with StateManager dispatches
2. StateManager will handle webview updates via subscriptions
3. Remove local state variables

### Phase 2.3: Full Integration
1. Replace all local state with StateManager selectors
2. Remove direct webviewProtocol dependencies
3. Complete reactive state management

## Testing Requirements

### Unit Tests Needed
1. Message routing tests
2. State update verification
3. Error handling scenarios
4. Stream processing state mutations
5. Permission flow tests
6. Plan mode state transitions

### Integration Tests
1. Full message flow (user → Claude → response)
2. State synchronization verification
3. Error recovery scenarios
4. Multi-turn conversations

## Risk Mitigation
1. **Feature flags**: All changes behind migration flags
2. **Parallel operation**: Keep existing code paths intact
3. **Incremental migration**: One state type at a time
4. **Comprehensive testing**: Unit + integration coverage

## Next Steps
1. Create ExtensionMessageHandler unit tests (Phase 2.0.2)
2. Add StateManager dependency injection
3. Implement ActionMapper integration
4. Begin read-only state dispatch