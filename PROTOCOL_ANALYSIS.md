# Claude Code Protocol Analysis & Improvement Recommendations

## Current Implementation Status

### ✅ Supported CLI Commands
- `-p` (print mode)
- `--output-format stream-json`
- `--verbose`
- `--model`
- `--resume`
- `--dangerously-skip-permissions`
- `--permission-mode plan`
- `--append-system-prompt`
- MCP configuration flags

### ❌ Missing TypeScript SDK Parameters
1. **`maxTurns`** - Limits agentic turns in non-interactive mode
2. **`abortController`** - For cancelling requests programmatically
3. **`executableArgs`** - Additional args for the runtime
4. **`pathToClaudeCodeExecutable`** - Custom Claude binary path
5. **`--max-turns`** - CLI equivalent of maxTurns
6. **`--allowedTools`** - Whitelist tools
7. **`--disallowedTools`** - Blacklist tools
8. **`--add-dir`** - Additional working directories
9. **`--permission-prompt-tool`** - MCP tool for permissions
10. **`--input-format`** - Input format specification

## Improvements Without Changing Method Signatures

### 1. Extend ClaudeProcessOptions Interface
```typescript
// In src/types/claude.ts
export interface ClaudeProcessOptions {
  model?: ModelType;
  cwd?: string;
  resumeSession?: string;
  verbose?: boolean;
  dangerouslySkipPermissions?: boolean;
  // Add new optional properties:
  maxTurns?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  additionalDirs?: string[];
  permissionPromptTool?: string;
  inputFormat?: 'text' | 'stream-json';
  executablePath?: string;
  executableArgs?: string[];
}
```

### 2. Update buildArguments Method
```typescript
// In ClaudeProcessManager.ts
private buildArguments(options: SpawnOptions): string[] {
  const args = ['-p', '--output-format', 'stream-json', '--verbose'];
  
  if (options.model) {
    args.push('--model', options.model);
  }
  
  if (options.resumeSession) {
    args.push('--resume', options.resumeSession);
  }
  
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  }
  
  // Add new parameters:
  if (options.maxTurns) {
    args.push('--max-turns', options.maxTurns.toString());
  }
  
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push('--allowedTools', options.allowedTools.join(','));
  }
  
  if (options.disallowedTools && options.disallowedTools.length > 0) {
    args.push('--disallowedTools', options.disallowedTools.join(','));
  }
  
  if (options.additionalDirs && options.additionalDirs.length > 0) {
    options.additionalDirs.forEach(dir => {
      args.push('--add-dir', dir);
    });
  }
  
  if (options.permissionPromptTool) {
    args.push('--permission-prompt-tool', options.permissionPromptTool);
  }
  
  if (options.inputFormat) {
    args.push('--input-format', options.inputFormat);
  }
  
  // MCP config flags
  const workingDir = options.cwd || process.cwd();
  const mcpFlags = mcpService.getMcpConfigFlag(workingDir);
  if (mcpFlags.length > 0) {
    args.push(...mcpFlags);
  }
  
  return args;
}
```

### 3. Add AbortController Support
```typescript
// In ClaudeProcessManager.ts
export class ClaudeProcessManager {
  private processes: Map<string, ClaudeProcess> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  
  public async spawn(options: SpawnOptions): Promise<Result<ClaudeProcess, ApplicationError>> {
    // Create abort controller for this session
    const abortController = new AbortController();
    this.abortControllers.set(options.sessionId, abortController);
    
    // Listen for abort signal
    abortController.signal.addEventListener('abort', () => {
      const process = this.processes.get(options.sessionId);
      if (process) {
        process.kill('SIGTERM');
      }
    });
    
    // ... rest of spawn logic
  }
  
  // Add method to get abort controller
  public getAbortController(sessionId: string): AbortController | undefined {
    return this.abortControllers.get(sessionId);
  }
}
```

### 4. Enhance ExtensionMessageHandler
```typescript
// In ExtensionMessageHandler.ts handleChatMessage method

// Add support for max turns from workspace config
const config = vscode.workspace.getConfiguration('claudeCodeChatModern');
const maxTurns = config.get<number>('maxTurns');

// Pass additional options when spawning
const spawnOptions: SpawnOptions = {
  sessionId: sessionId,
  model: selectedModel,
  cwd: cwd,
  resumeSession: this.currentSessionId,
  dangerouslySkipPermissions: true,
  maxTurns: maxTurns,
  allowedTools: config.get<string[]>('allowedTools'),
  disallowedTools: config.get<string[]>('disallowedTools'),
  additionalDirs: config.get<string[]>('additionalDirectories'),
  permissionPromptTool: config.get<string>('permissionPromptTool')
};
```

### 5. Add Stop Request Handling via AbortController
```typescript
// In ExtensionMessageHandler.ts
case 'chat/stopRequest':
  if (this.currentSessionId) {
    const abortController = this.serviceContainer
      .get('ClaudeProcessManager')
      .getAbortController(this.currentSessionId);
    
    if (abortController) {
      abortController.abort();
    }
  }
  break;
```

### 6. Configuration Schema Update
```json
// In package.json contributions.configuration
{
  "claudeCodeChatModern.maxTurns": {
    "type": "number",
    "default": null,
    "description": "Maximum number of agentic turns"
  },
  "claudeCodeChatModern.allowedTools": {
    "type": "array",
    "items": { "type": "string" },
    "default": [],
    "description": "Tools to allow without prompting"
  },
  "claudeCodeChatModern.disallowedTools": {
    "type": "array", 
    "items": { "type": "string" },
    "default": [],
    "description": "Tools to disallow"
  },
  "claudeCodeChatModern.additionalDirectories": {
    "type": "array",
    "items": { "type": "string" },
    "default": [],
    "description": "Additional working directories"
  },
  "claudeCodeChatModern.permissionPromptTool": {
    "type": "string",
    "default": null,
    "description": "MCP tool for permission prompts"
  }
}
```

## TypeScript SDK Compatibility

To ensure full compatibility with the TypeScript SDK:

1. **Use the same argument names** - Map SDK options to CLI flags consistently
2. **Support process lifecycle** - AbortController maps to process termination
3. **Handle executable customization** - Allow custom Claude binary paths
4. **Pass through runtime args** - Support executableArgs for Bun/Deno

## Testing Recommendations

1. Test with TypeScript SDK directly to ensure compatibility
2. Verify all CLI flags are properly passed through
3. Test abort/cancellation scenarios
4. Verify MCP tool permissions work correctly
5. Test with different runtime environments (Node, Bun, Deno)