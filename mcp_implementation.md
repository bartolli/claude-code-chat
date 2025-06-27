# MCP Implementation Plan

## Overview
This document outlines the implementation plan for adding proper Model Context Protocol (MCP) support to the Claude Code Chat extension. The extension uses Claude Code in non-interactive streaming mode (`-p` flag with `--output-format stream-json`), so all MCP functionality must be handled through command-line arguments and JSON stream processing.

## Problem Statement
The webview crashes when expanding MCP tool containers because:
1. MCP tools return results with a different structure than native tools
2. Tool results from MCP have `content` as an array of `{type: 'text', text: string}` objects  
3. The current code passes this structure directly to the UI without proper handling
4. React error #31 occurs when trying to render non-React elements

## Key Constraints
- **No Interactive Features**: Cannot use `/mcp` slash command or interactive OAuth
- **Streaming Only**: All communication via `--output-format stream-json`
- **CLI Arguments**: Must use `--mcp-config` and other CLI flags
- **Non-blocking**: MCP operations should not block the UI

## Implementation Tasks

### 1. Fix Immediate MCP Tool Crash (Priority: HIGH)
**File:** `src/services/ExtensionMessageHandler.ts:678`

**Current Issue:**
```typescript
result: block.content || block.text,
```

**MCP Tool Result Structure (from CLI output):**
```json
{
  "type": "tool_result",
  "content": [
    {
      "type": "text",
      "text": "{\n  \"timezone\": \"Europe/Sofia\",\n  \"datetime\": \"2025-06-27T21:45:08+03:00\",\n  \"is_dst\": true\n}"
    }
  ]
}
```

**Fix Implementation:**
```typescript
// Extract text from MCP tool result content array
let resultText = block.text;
if (!resultText && Array.isArray(block.content)) {
  // Handle MCP tool results with content array
  const textContent = block.content.find(c => c.type === 'text');
  resultText = textContent?.text || JSON.stringify(block.content);
} else if (!resultText && block.content) {
  // Handle native tool results
  resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
}
result: resultText,
```

### 2. Verify ToolUseDisplay Component (Priority: HIGH)
**File:** `src/webview/components/ToolUseDisplay/index.tsx`

- Already updated formatInput function (lines 161-185)
- Handles `{type: 'text', text: string}` objects
- Verify String() conversion on line 205 works correctly
- Test with both native and MCP tool inputs

### 3. Create McpService (Priority: MEDIUM)
**New file:** `src/services/McpService.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export interface McpServerInfo {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse' | 'http';
  status?: 'connected' | 'disconnected' | 'error';
}

export interface McpConfig {
  mcpServers: Record<string, Omit<McpServerInfo, 'name'>>;
}

export class McpService {
  private execAsync = promisify(exec);

  /**
   * List all configured MCP servers
   * @param scope - Scope to list servers from (local, project, user)
   */
  async listServers(scope?: 'local' | 'project' | 'user'): Promise<McpServerInfo[]> {
    const cmd = scope ? `claude mcp list -s ${scope}` : 'claude mcp list';
    const { stdout } = await this.execAsync(cmd);
    // Parse the output to extract server information
    return this.parseServerList(stdout);
  }

  /**
   * Get details for a specific MCP server
   */
  async getServer(name: string): Promise<McpServerInfo | null> {
    const { stdout } = await this.execAsync(`claude mcp get ${name}`);
    return this.parseServerDetails(stdout);
  }

  /**
   * Load MCP configuration from project
   */
  async loadMcpConfig(projectPath: string): Promise<McpConfig | null> {
    const mcpJsonPath = path.join(projectPath, '.mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      const content = await fs.promises.readFile(mcpJsonPath, 'utf-8');
      return JSON.parse(content) as McpConfig;
    }
    return null;
  }

  /**
   * Get MCP config flag for CLI
   */
  getMcpConfigFlag(projectPath: string): string[] {
    const mcpJsonPath = path.join(projectPath, '.mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      return ['--mcp-config', '.mcp.json'];
    }
    return [];
  }

  // Helper methods for parsing CLI output
  private parseServerList(output: string): McpServerInfo[] {
    // Implementation depends on actual CLI output format
    return [];
  }

  private parseServerDetails(output: string): McpServerInfo | null {
    // Implementation depends on actual CLI output format
    return null;
  }
}
```

### 4. Add MCP-Specific Types (Priority: MEDIUM)
**File:** `src/types/claude.ts`

Add the following types:
```typescript
// MCP tool result content structure
export interface McpToolResultContent {
  type: 'text';
  text: string;
}

// MCP configuration from .mcp.json
export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse' | 'http';
  url?: string; // For SSE/HTTP transports
  headers?: Record<string, string>; // For SSE/HTTP
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

// Update ClaudeUserMessage to handle MCP content
export interface ClaudeUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'text' | 'tool_result';
      text?: string;
      content?: string | McpToolResultContent[]; // MCP returns array
      tool_use_id?: string;
      is_error?: boolean;
    }>;
  };
  parent_tool_use_id?: string | null;
  session_id?: string;
}
```

### 5. Implement MCP Config Loading (Priority: MEDIUM)
**Scope Precedence:** local > project > user

**Implementation in McpService:**
- Check `.mcp.json` in project root
- Check local settings (`.claude/settings.local.json`)
- Check user settings (`~/.config/claude/settings.user.json`)
- Merge configurations with proper precedence

### 6. Add --mcp-config Support (Priority: MEDIUM)
**File:** `src/services/ClaudeProcessManager.ts`

Add to spawn arguments:
```typescript
// In spawnClaude method
const mcpService = new McpService();
const mcpFlags = mcpService.getMcpConfigFlag(options.cwd || process.cwd());
if (mcpFlags.length > 0) {
  args.push(...mcpFlags);
}

// Optional: Add allowed tools for MCP
const mcpConfig = await mcpService.loadMcpConfig(options.cwd || process.cwd());
if (mcpConfig && Object.keys(mcpConfig.mcpServers).length > 0) {
  const mcpTools = Object.keys(mcpConfig.mcpServers)
    .map(name => `mcp__${name}__*`)
    .join(',');
  args.push('--allowedTools', mcpTools);
}
```

### 7. Handle MCP Server Status (Priority: LOW)
**File:** `src/services/ExtensionMessageHandler.ts`

In the system message handler:
```typescript
case 'system':
  if (json.subtype === 'init') {
    // Existing session ID handling...
    
    // Handle MCP server status
    if (json.mcp_servers) {
      this.webviewProtocol?.post('mcp/status', {
        servers: json.mcp_servers.map(s => ({
          name: s.name,
          status: s.status, // 'connected' | 'disconnected' | 'error'
        }))
      });
    }
  }
  break;
```

### 8. Testing Configuration (Priority: LOW)

**Test Servers from .mcp.json:**
1. **time server**
   - Command: `/Users/bartolli/.pyenv/shims/uv`
   - Args: `["--directory", "/Users/bartolli/Projects/mcp-servers/servers/src/time", "run", "mcp-server-time", "--local-timezone=America/New_York"]`
   - Tool: `mcp__time__get_current_time`
   - Test input: `{"timezone": "Europe/Sofia"}`

2. **exa server**
   - Command: `npx`
   - Args: `["/Users/bartolli/Projects/mcp-servers/exa-mcp-server/build/index.js"]`
   - Env: `{"EXA_API_KEY": "c20ba150-98e8-461f-8c29-cccba2ec52a5"}`
   - Tools: `mcp__exa__exa_web_search`, `mcp__exa__exa_get_contents`

## Testing Plan

### Unit Tests
1. Test MCP content extraction in ExtensionMessageHandler
2. Test formatInput with various MCP structures
3. Test McpService config loading and merging

### Integration Tests
1. Test with time server - verify timezone queries work
2. Test with exa server - verify search functionality
3. Test error handling for disconnected servers
4. Test tool result rendering in UI

### Manual Testing
1. Expand MCP tool containers without crashes
2. Verify tool inputs display correctly
3. Verify tool results display correctly
4. Check MCP server status indicators

## Security Considerations
1. Project `.mcp.json` requires user approval
2. Environment variables must be handled securely
3. API keys should never be logged
4. Validate all MCP server configurations

## Error Handling
1. Handle MCP server startup failures gracefully
2. Respect MCP_TIMEOUT environment variable
3. Provide clear error messages for missing servers
4. Fall back gracefully when MCP unavailable

## Future Enhancements
1. UI for managing MCP servers
2. Visual indicators for MCP tool calls
3. MCP server health monitoring
4. Support for MCP resources (@mentions)
5. Support for MCP prompts (slash commands in UI)

## References
- [Claude Code MCP Documentation](docs/claude_code_mcp.md)
- [CLI Reference](docs/cli_reference.md)
- [SDK Documentation](docs/claude_code_sdk.md)
- Example verbose output showing MCP tool structure