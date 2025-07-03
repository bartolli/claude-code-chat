# Claude Code SDK Compatibility Analysis

## Official SDK Parameters (from sdk.mjs)

The official Claude Code SDK accepts these parameters in the `query` function:

### Core Parameters
- `prompt` - String or async generator of messages
- `abortController` - For cancellation (default: new AbortController)

### Options Object
```typescript
{
  // Process Control
  abortController?: AbortController
  executable?: string // 'node' or 'bun'
  executableArgs?: string[]
  pathToClaudeCodeExecutable?: string
  
  // Tool Management
  allowedTools?: string[]
  disallowedTools?: string[]
  
  // System Prompts
  appendSystemPrompt?: string
  customSystemPrompt?: string
  
  // Execution Options
  cwd?: string
  maxTurns?: number
  model?: string
  fallbackModel?: string
  
  // Permission Management
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  permissionPromptToolName?: string
  
  // Session Management
  continue?: boolean
  resume?: string
  
  // MCP Configuration
  mcpServers?: Record<string, any>
}
```

## CLI Flag Mapping (SDK → CLI)

| SDK Parameter | CLI Flag | Your Implementation |
|--------------|----------|-------------------|
| `prompt` (string) | `--print <prompt>` | ✅ Using `-p` |
| `prompt` (stream) | `--input-format stream-json` | ❌ Not implemented |
| `abortController` | Process signal handling | ⚠️ Partial (ESC only) |
| `executable` | Binary to run | ❌ Not configurable |
| `executableArgs` | Args before claude path | ❌ Not implemented |
| `pathToClaudeCodeExecutable` | Path to cli.js | ⚠️ Hardcoded to 'claude' |
| `allowedTools` | `--allowedTools <csv>` | ❌ Not implemented |
| `disallowedTools` | `--disallowedTools <csv>` | ❌ Not implemented |
| `appendSystemPrompt` | `--append-system-prompt` | ✅ Only in plan mode |
| `customSystemPrompt` | `--system-prompt` | ❌ Not implemented |
| `cwd` | Process working directory | ✅ Implemented |
| `maxTurns` | `--max-turns <n>` | ❌ Not implemented |
| `model` | `--model <name>` | ✅ Implemented |
| `fallbackModel` | `--fallback-model <name>` | ❌ Not implemented |
| `permissionMode` | `--permission-mode <mode>` | ⚠️ Only 'plan' mode |
| `permissionPromptToolName` | `--permission-prompt-tool` | ❌ Not implemented |
| `continue` | `--continue` | ❌ Not implemented |
| `resume` | `--resume <id>` | ✅ Implemented |
| `mcpServers` | `--mcp-config <json>` | ⚠️ Different approach |

## Key Differences

### 1. Input Format Handling
**SDK**: Supports both string prompts and streaming JSON input
```javascript
if (typeof prompt === "string") {
  args.push("--print", prompt.trim());
} else {
  args.push("--input-format", "stream-json");
}
```

**Your Implementation**: Only supports string input via stdin
```typescript
claudeProcess.stdin.write(data.text + '\n');
claudeProcess.stdin.end();
```

### 2. MCP Configuration
**SDK**: Passes MCP config as JSON via `--mcp-config`
```javascript
if (mcpServers && Object.keys(mcpServers).length > 0) {
  args.push("--mcp-config", JSON.stringify({ mcpServers }));
}
```

**Your Implementation**: Uses file-based approach via McpService

### 3. Process Management
**SDK**: Uses AbortController with proper signal handling
```javascript
const child = spawn(executable, [...executableArgs, pathToClaudeCodeExecutable, ...args], {
  cwd,
  stdio: ["pipe", "pipe", "pipe"],
  signal: abortController.signal,
  env: { ...process.env }
});
```

**Your Implementation**: Manual process management without AbortController

### 4. Error Handling
**SDK**: Specific error types (AbortError) and process exit handling
**Your Implementation**: Generic error handling

## Recommendations for Full Compatibility

### 1. Update SpawnOptions Interface
```typescript
export interface SpawnOptions extends ClaudeProcessOptions {
  sessionId: string;
  // Add SDK-compatible options
  executable?: string;
  executableArgs?: string[];
  pathToClaudeCodeExecutable?: string;
  customSystemPrompt?: string;
  appendSystemPrompt?: string;
  fallbackModel?: string;
  permissionPromptToolName?: string;
  continueConversation?: boolean;
  mcpServers?: Record<string, any>;
}
```

### 2. Implement Proper Flag Mapping
```typescript
private buildArguments(options: SpawnOptions): string[] {
  const args = ['--output-format', 'stream-json', '--verbose'];
  
  // Use --print instead of -p for SDK compatibility
  if (options.prompt) {
    args.push('--print', options.prompt);
  } else if (options.inputFormat === 'stream-json') {
    args.push('--input-format', 'stream-json');
  }
  
  // System prompts
  if (options.customSystemPrompt) {
    args.push('--system-prompt', options.customSystemPrompt);
  }
  if (options.appendSystemPrompt) {
    args.push('--append-system-prompt', options.appendSystemPrompt);
  }
  
  // Tool management
  if (options.allowedTools?.length > 0) {
    args.push('--allowedTools', options.allowedTools.join(','));
  }
  if (options.disallowedTools?.length > 0) {
    args.push('--disallowedTools', options.disallowedTools.join(','));
  }
  
  // Other flags...
  if (options.maxTurns) {
    args.push('--max-turns', options.maxTurns.toString());
  }
  if (options.fallbackModel) {
    args.push('--fallback-model', options.fallbackModel);
  }
  if (options.permissionPromptToolName) {
    args.push('--permission-prompt-tool', options.permissionPromptToolName);
  }
  if (options.continueConversation) {
    args.push('--continue');
  }
  
  // MCP servers as JSON
  if (options.mcpServers && Object.keys(options.mcpServers).length > 0) {
    args.push('--mcp-config', JSON.stringify({ mcpServers: options.mcpServers }));
  }
  
  return args;
}
```

### 3. Add AbortController Support
```typescript
public async spawn(options: SpawnOptions): Promise<Result<ClaudeProcess, ApplicationError>> {
  const abortController = options.abortController || new AbortController();
  
  const spawnOptions: cp.SpawnOptions = {
    cwd: options.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    signal: abortController.signal,
    env: { ...process.env }
  };
  
  // Use configurable executable
  const executable = options.executable || 'node';
  const executableArgs = options.executableArgs || [];
  const claudePath = options.pathToClaudeCodeExecutable || 'claude';
  
  const claudeProcess = cp.spawn(
    executable,
    [...executableArgs, claudePath, ...args],
    spawnOptions
  );
  
  // Store abort controller
  this.abortControllers.set(options.sessionId, abortController);
  
  // Handle abort
  abortController.signal.addEventListener('abort', () => {
    if (!claudeProcess.killed) {
      claudeProcess.kill('SIGTERM');
    }
  });
}
```

### 4. Support Streaming Input
```typescript
private async handleChatMessage(data: { 
  text?: string; 
  messages?: AsyncGenerator<any>;
  planMode?: boolean; 
}) {
  // If streaming messages provided
  if (data.messages) {
    args.push('--input-format', 'stream-json');
    
    // After spawning, stream messages to stdin
    for await (const message of data.messages) {
      claudeProcess.stdin.write(JSON.stringify(message) + '\n');
    }
    claudeProcess.stdin.end();
  } else if (data.text) {
    // Current string-based approach
    args.push('--print', data.text);
    claudeProcess.stdin.end();
  }
}
```

## Summary

To achieve full TypeScript SDK compatibility:

1. **Update argument building** to match SDK's flag mapping exactly
2. **Add AbortController support** for proper cancellation
3. **Support streaming input** via `--input-format stream-json`
4. **Allow process customization** (executable, args, path)
5. **Implement missing flags** (fallbackModel, customSystemPrompt, etc.)
6. **Use `--print` instead of `-p`** for consistency with SDK
7. **Pass MCP config as JSON** via `--mcp-config` flag

These changes would make your extension fully compatible with code written for the TypeScript SDK while maintaining your current UI functionality.