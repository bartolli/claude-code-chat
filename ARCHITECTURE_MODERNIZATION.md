# Architecture Modernization: Aligning Extension with GUI Patterns

## Overview
This document outlines the changes needed to modernize the current extension architecture to match the GUI's design patterns while maintaining backward compatibility.

## Key Architectural Changes

### 1. Separate Concerns: UI Process vs Extension Process

**Current Architecture:**
- `ClaudeChatProvider` class handles everything: state, UI, Claude process, file operations
- Webview communication is tightly coupled with business logic
- State is scattered across class properties

**Proposed Architecture:**
```typescript
// extension.ts - Pure VS Code extension logic
export class ClaudeCodeExtension {
  private messageHandler: MessageHandler;
  private processManager: ClaudeProcessManager;
  private stateManager: StateManager;
  
  constructor() {
    // Dependency injection for testability
  }
}

// core/ClaudeProcessManager.ts - Claude CLI process management
export class ClaudeProcessManager {
  spawn(options: SpawnOptions): ClaudeProcess
  terminate(processId: string): void
  // Pure process management, no UI concerns
}

// core/StateManager.ts - Centralized state
export class StateManager {
  private store: Store<AppState>;
  
  dispatch(action: Action): void
  getState(): AppState
  subscribe(listener: StateListener): Unsubscribe
}
```

### 2. Protocol-Based Communication

**Current Approach:**
```typescript
// Direct postMessage with ad-hoc message types
this._view.webview.postMessage({
  type: 'userInput',
  text: formattedText
});
```

**GUI-Inspired Approach:**
```typescript
// protocol/messages.ts
export interface ProtocolMessage<T = any> {
  messageId: string;
  messageType: keyof MessageProtocol;
  timestamp: number;
  data: T;
}

// protocol/handlers.ts
export class MessageHandler {
  private handlers = new Map<string, Handler>();
  
  register<T>(type: string, handler: Handler<T>): void
  async handle(message: ProtocolMessage): Promise<void>
  
  // Type-safe message sending
  send<K extends keyof MessageProtocol>(
    type: K,
    data: MessageProtocol[K]['request']
  ): Promise<MessageProtocol[K]['response']>
}
```

### 3. Stream-Based Claude Communication

**Current Approach:**
```typescript
// Direct stdout parsing in the main class
claudeProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  // Inline parsing logic
});
```

**GUI-Inspired Approach:**
```typescript
// streaming/ClaudeStreamParser.ts
export class ClaudeStreamParser {
  async *parse(stream: ReadableStream): AsyncGenerator<ParsedMessage> {
    const reader = stream.getReader();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value);
      const messages = this.extractMessages(buffer);
      
      for (const message of messages) {
        yield this.parseMessage(message);
      }
    }
  }
}

// Usage with abort support
const parser = new ClaudeStreamParser();
const abortController = new AbortController();

for await (const message of parser.parse(stream)) {
  if (abortController.signal.aborted) break;
  await messageHandler.handle(message);
}
```

### 4. Redux-Style State Management

**Current State Management:**
```typescript
// Scattered state across class properties
private sessionId?: string;
private selectedModel?: string;
private conversationTitle?: string;
private messages: any[] = [];
```

**GUI-Inspired State Management:**
```typescript
// state/store.ts
export interface AppState {
  session: SessionState;
  config: ConfigState;
  ui: UIState;
  processes: ProcessState;
}

// state/actions.ts
export const actions = {
  session: {
    start: createAction<{id: string}>('session/start'),
    addMessage: createAction<ChatMessage>('session/addMessage'),
    updateTitle: createAction<string>('session/updateTitle'),
  },
  // ... other actions
};

// state/reducers.ts
const sessionReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(actions.session.start, (state, action) => {
      state.id = action.payload.id;
      state.messages = [];
    })
    .addCase(actions.session.addMessage, (state, action) => {
      state.messages.push(action.payload);
    });
});
```

### 5. Service Layer Architecture

**Current Approach:**
```typescript
// Everything in ClaudeChatProvider
private async saveConversation() {
  // Direct file system access
  // Direct UI updates
  // Mixed concerns
}
```

**GUI-Inspired Service Architecture:**
```typescript
// services/ConversationService.ts
export class ConversationService {
  constructor(
    private fileService: FileService,
    private stateManager: StateManager
  ) {}
  
  async save(conversation: Conversation): Promise<void> {
    const state = this.stateManager.getState();
    const formatted = this.format(state.session);
    await this.fileService.write(conversation.path, formatted);
    
    this.stateManager.dispatch(
      actions.session.saved({ path: conversation.path })
    );
  }
}

// services/BackupService.ts
export class BackupService {
  async createBackup(): Promise<BackupResult> {
    // Isolated backup logic
  }
}
```

### 6. Dependency Injection & Testability

**Current Approach:**
```typescript
// Hard dependencies
vscode.commands.registerCommand('claude-chat.createBackup', async () => {
  const hasGit = await this.checkGitInstallation();
  // Direct implementation
});
```

**GUI-Inspired Approach:**
```typescript
// container.ts
export class ServiceContainer {
  private services = new Map<string, any>();
  
  register<T>(token: string, factory: () => T): void
  get<T>(token: string): T
}

// extension.ts
const container = new ServiceContainer();
container.register('git', () => new GitService());
container.register('backup', () => new BackupService(container.get('git')));

// Easy to mock for testing
const mockGit = { isInstalled: () => true };
container.register('git', () => mockGit);
```

### 7. Error Handling & Recovery

**Current Approach:**
```typescript
// Basic try-catch with console.error
try {
  // operation
} catch (error) {
  console.error('Error:', error);
  vscode.window.showErrorMessage('Operation failed');
}
```

**GUI-Inspired Approach:**
```typescript
// error/ErrorBoundary.ts
export class ErrorBoundary {
  async execute<T>(
    operation: () => Promise<T>,
    options: ErrorOptions
  ): Promise<Result<T>> {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      const handled = await this.handleError(error, options);
      
      if (handled.retry && options.retryCount > 0) {
        return this.execute(operation, {
          ...options,
          retryCount: options.retryCount - 1
        });
      }
      
      return { success: false, error: handled.error };
    }
  }
}
```

### 8. Modern TypeScript Patterns

**Current Approach:**
```typescript
// Loose typing
private async sendMessageToClaude(message: any, cwd?: string)
```

**GUI-Inspired Approach:**
```typescript
// Strict typing with discriminated unions
type ClaudeMessage = 
  | { type: 'text'; content: string }
  | { type: 'tool_use'; tool: ToolUse }
  | { type: 'tool_result'; result: ToolResult };

interface SendMessageOptions {
  message: ClaudeMessage;
  cwd?: string;
  model?: ModelType;
  signal?: AbortSignal;
}

private async sendMessage(options: SendMessageOptions): Promise<void>
```

## Migration Strategy

### Phase 1: Extract Services (No Breaking Changes)
1. Create service classes alongside existing code
2. Gradually move logic from `ClaudeChatProvider` to services
3. Keep existing method signatures as facades

### Phase 2: Introduce State Management
1. Implement Redux-style store
2. Sync store with existing class properties
3. Gradually migrate state updates to actions

### Phase 3: Protocol-Based Messages
1. Implement message protocol alongside existing messages
2. Add adapters for backward compatibility
3. Migrate handlers one by one

### Phase 4: Modern Patterns
1. Add TypeScript strict mode incrementally
2. Implement error boundaries
3. Add retry logic and better error handling

## Benefits of This Architecture

1. **Testability**: Each component can be tested in isolation
2. **Maintainability**: Clear separation of concerns
3. **Extensibility**: Easy to add new features without touching core logic
4. **Performance**: Streaming and efficient state updates
5. **Type Safety**: Full TypeScript with strict typing
6. **Error Recovery**: Robust error handling with retry logic
7. **Modern Patterns**: Follows current best practices

## Example: Refactored Message Sending

**Before:**
```typescript
private async sendMessageToClaude(message: string, cwd?: string) {
  // 200+ lines of mixed concerns
}
```

**After:**
```typescript
private async sendMessageToClaude(message: string, cwd?: string) {
  // Facade for backward compatibility
  return this.messageService.send({
    content: message,
    workingDirectory: cwd,
    model: this.stateManager.getState().config.model
  });
}

// MessageService.ts
export class MessageService {
  constructor(
    private processManager: ClaudeProcessManager,
    private streamParser: ClaudeStreamParser,
    private stateManager: StateManager
  ) {}
  
  async send(options: SendOptions): Promise<void> {
    const process = await this.processManager.spawn(options);
    const stream = process.stdout;
    
    for await (const message of this.streamParser.parse(stream)) {
      this.stateManager.dispatch(
        actions.session.addMessage(message)
      );
    }
  }
}
```

This architecture brings the extension in line with modern practices while maintaining full backward compatibility.