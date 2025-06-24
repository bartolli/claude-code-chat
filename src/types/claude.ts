/**
 * Claude-specific type definitions
 */

export type ModelType = 'opus' | 'sonnet' | 'haiku' | 'default';

export interface ClaudeProcessOptions {
  model?: ModelType;
  cwd?: string;
  resumeSession?: string;
  verbose?: boolean;
  dangerouslySkipPermissions?: boolean;
}

export interface ClaudeProcess {
  id: string;
  pid: number;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  kill: (signal?: NodeJS.Signals) => boolean;
  on: (event: string, listener: (...args: any[]) => void) => void;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ToolUse {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
  id?: string;
}

export interface ToolResult {
  type: 'tool_result';
  content: string;
  tool_use_id?: string;
  is_error?: boolean;
}

// Claude Code JSON stream message types (from SDK documentation)
export interface ClaudeSystemMessage {
  type: 'system';
  subtype?: 'init';
  cwd?: string;
  session_id?: string;
  tools?: string[];
  mcp_servers?: Array<{
    name: string;
    status: string;
  }>;
  model?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  apiKeySource?: string;
}

export interface ClaudeAssistantMessage {
  type: 'assistant';
  message: {
    id?: string;
    type?: 'message';
    role?: 'assistant';
    model?: string;
    content: Array<{
      type: 'text' | 'tool_use' | 'thinking';
      text?: string;
      thinking?: string;
      name?: string;
      input?: any;
      id?: string;
    }> | string;
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      service_tier?: string;
    };
  };
  parent_tool_use_id?: string | null;
  session_id?: string;
}

export interface ClaudeUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'text' | 'tool_result';
      text?: string;
      content?: string;
      tool_use_id?: string;
      is_error?: boolean;
    }>;
  };
  parent_tool_use_id?: string | null;
  session_id?: string;
}

export interface ClaudeResultMessage {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error_during_execution';
  duration_ms?: number;
  duration_api_ms?: number;
  is_error: boolean;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens: number;
    server_tool_use?: {
      web_search_requests?: number;
    };
  };
}

export type ClaudeStreamMessage = 
  | ClaudeSystemMessage
  | ClaudeAssistantMessage
  | ClaudeUserMessage
  | ClaudeResultMessage;

export interface ClaudeError {
  code: string;
  message: string;
  details?: unknown;
}

export interface SessionInfo {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  model: ModelType;
  messages: ClaudeMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}