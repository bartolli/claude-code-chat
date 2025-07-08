/**
 * Claude-specific type definitions
 */

export type ModelType = 'opus' | 'sonnet' | 'haiku' | 'default';

export interface ClaudeProcessOptions {
  /**
   * The Claude model to use
   */
  model?: ModelType;
  /**
   * Current working directory for the process
   */
  cwd?: string;
  /**
   * Session ID to resume from
   */
  resumeSession?: string;
  /**
   * Enable verbose output logging
   */
  verbose?: boolean;
  /**
   * Skip permission checks (use with caution)
   */
  dangerouslySkipPermissions?: boolean;
}

export interface ClaudeProcess {
  /**
   * Unique process identifier
   */
  id: string;
  /**
   * Process ID from the operating system
   */
  pid: number;
  /**
   * Standard input stream for sending data to the process
   */
  stdin: NodeJS.WritableStream;
  /**
   * Standard output stream for receiving data from the process
   */
  stdout: NodeJS.ReadableStream;
  /**
   * Standard error stream for error output
   */
  stderr: NodeJS.ReadableStream;
  /**
   * Terminate the process with an optional signal
   */
  kill: (signal?: NodeJS.Signals) => boolean;
  /**
   * Register event listeners for process events
   */
  on: (event: string, listener: (...args: any[]) => void) => void;
}

// ============= MCP-specific Types =============

// MCP tool result content structure
export interface McpToolResultContent {
  /**
   * Content type identifier
   */
  type: 'text';
  /**
   * The text content of the tool result
   */
  text: string;
}

// MCP server configuration from .mcp.json
export interface McpServerConfig {
  /**
   * Command to execute the MCP server
   */
  command: string;
  /**
   * Command line arguments for the server
   */
  args?: string[];
  /**
   * Environment variables for the server process
   */
  env?: Record<string, string>;
  /**
   * Transport protocol for server communication
   */
  transport?: 'stdio' | 'sse' | 'http';
  /**
   * Server URL for SSE/HTTP transports
   */
  url?: string; // For SSE/HTTP transports
  /**
   * HTTP headers for SSE/HTTP transports
   */
  headers?: Record<string, string>; // For SSE/HTTP
}

export interface McpConfig {
  /**
   * Map of server names to their configurations
   */
  mcpServers: Record<string, McpServerConfig>;
}

// MCP server status from system init message
export interface McpServerStatus {
  /**
   * Name of the MCP server
   */
  name: string;
  /**
   * Current connection status of the server
   */
  status: 'connected' | 'disconnected' | 'error';
}

// ============= Core Types =============

export interface ClaudeMessage {
  /**
   * Message sender role
   */
  role: 'user' | 'assistant' | 'system';
  /**
   * Message text content
   */
  content: string;
  /**
   * Unix timestamp of when the message was created
   */
  timestamp?: number;
  /**
   * Unique identifier for tracking Claude's messages
   */
  messageId?: string; // Track Claude's message ID
  /**
   * Array of tool uses in this message
   */
  toolUses?: Array<{
    /**
     * Name of the tool being used
     */
    toolName: string;
    /**
     * Unique identifier for this tool use
     */
    toolId: string;
    /**
     * Input parameters for the tool
     */
    input: any;
    /**
     * Result returned by the tool
     */
    result?: string;
    /**
     * Whether the tool execution resulted in an error
     */
    isError?: boolean;
    /**
     * ID of the parent tool use if nested
     */
    parentToolUseId?: string;
  }>;
  /**
   * Claude's thinking process content
   */
  thinking?: string;
  /**
   * Duration of thinking in milliseconds
   */
  thinkingDuration?: number;
  /**
   * Whether thinking is currently in progress
   */
  isThinkingActive?: boolean;
  /**
   * Current line being processed in thinking
   */
  currentThinkingLine?: string;
  /**
   * Token usage statistics for this message
   */
  tokenUsage?: {
    /**
     * Number of input tokens consumed
     */
    input: number;
    /**
     * Number of output tokens generated
     */
    output: number;
    /**
     * Number of cached tokens used
     */
    cache: number;
    /**
     * Number of thinking tokens used
     */
    thinking: number;
  };
}

export interface ToolUse {
  /**
   * Type identifier for tool use
   */
  type: 'tool_use';
  /**
   * Name of the tool to invoke
   */
  name: string;
  /**
   * Input parameters for the tool
   */
  input: Record<string, unknown>;
  /**
   * Unique identifier for this tool use
   */
  id?: string;
}

export interface ToolResult {
  /**
   * Type identifier for tool result
   */
  type: 'tool_result';
  /**
   * Result content from the tool execution
   */
  content: string;
  /**
   * ID of the tool use this result corresponds to
   */
  tool_use_id?: string;
  /**
   * Whether the tool execution resulted in an error
   */
  is_error?: boolean;
}

// Claude Code JSON stream message types (from SDK documentation)
export interface ClaudeSystemMessage {
  /**
   * Message type identifier
   */
  type: 'system';
  /**
   * System message subtype
   */
  subtype?: 'init';
  /**
   * Current working directory
   */
  cwd?: string;
  /**
   * Session identifier
   */
  session_id?: string;
  /**
   * Available tools list
   */
  tools?: string[];
  /**
   * MCP server connection statuses
   */
  mcp_servers?: McpServerStatus[];
  /**
   * Claude model being used
   */
  model?: string;
  /**
   * Permission handling mode
   */
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  /**
   * Source of the API key
   */
  apiKeySource?: string;
}

export interface ClaudeAssistantMessage {
  /**
   * Message type identifier
   */
  type: 'assistant';
  /**
   * The assistant's message content
   */
  message: {
    /**
     * Message unique identifier
     */
    id?: string;
    /**
     * Message type
     */
    type?: 'message';
    /**
     * Message sender role
     */
    role?: 'assistant';
    /**
     * Model that generated this message
     */
    model?: string;
    /**
     * Message content array or string
     */
    content:
      | Array<{
          /**
           * Content block type
           */
          type: 'text' | 'tool_use' | 'thinking';
          /**
           * Text content for text blocks
           */
          text?: string;
          /**
           * Thinking content for thinking blocks
           */
          thinking?: string;
          /**
           * Tool name for tool_use blocks
           */
          name?: string;
          /**
           * Tool input parameters
           */
          input?: any;
          /**
           * Unique identifier for tool_use blocks
           */
          id?: string;
        }>
      | string;
    /**
     * Reason the assistant stopped generating
     */
    stop_reason?: string | null;
    /**
     * Stop sequence that triggered completion
     */
    stop_sequence?: string | null;
    /**
     * Token usage statistics
     */
    usage?: {
      /**
       * Number of input tokens
       */
      input_tokens: number;
      /**
       * Number of output tokens
       */
      output_tokens: number;
      /**
       * Tokens used for cache creation
       */
      cache_creation_input_tokens?: number;
      /**
       * Tokens read from cache
       */
      cache_read_input_tokens?: number;
      /**
       * Tokens used for thinking
       */
      thinking_tokens?: number;
      /**
       * Service tier used
       */
      service_tier?: string;
    };
  };
  /**
   * Parent tool use ID if this is a tool response
   */
  parent_tool_use_id?: string | null;
  /**
   * Session identifier
   */
  session_id?: string;
}

export interface ClaudeUserMessage {
  /**
   * Message type identifier
   */
  type: 'user';
  /**
   * The user's message content
   */
  message: {
    /**
     * Message sender role
     */
    role: 'user';
    /**
     * Array of content blocks
     */
    content: Array<{
      /**
       * Content block type
       */
      type: 'text' | 'tool_result';
      /**
       * Text content for text blocks
       */
      text?: string;
      /**
       * Tool result content (string or MCP format)
       */
      content?: string | McpToolResultContent[]; // MCP returns array
      /**
       * ID of the tool use this result is for
       */
      tool_use_id?: string;
      /**
       * Whether the tool result is an error
       */
      is_error?: boolean;
    }>;
  };
  /**
   * Parent tool use ID if responding to a tool
   */
  parent_tool_use_id?: string | null;
  /**
   * Session identifier
   */
  session_id?: string;
}

export interface ClaudeResultMessage {
  /**
   * Message type identifier
   */
  type: 'result';
  /**
   * Result subtype indicating success or error type
   */
  subtype: 'success' | 'error_max_turns' | 'error_during_execution';
  /**
   * Total duration in milliseconds
   */
  duration_ms?: number;
  /**
   * API call duration in milliseconds
   */
  duration_api_ms?: number;
  /**
   * Whether the result indicates an error
   */
  is_error: boolean;
  /**
   * Number of conversation turns
   */
  num_turns?: number;
  /**
   * Final result summary
   */
  result?: string;
  /**
   * Session identifier
   */
  session_id?: string;
  /**
   * Total cost in USD
   */
  total_cost_usd?: number;
  /**
   * Token usage statistics
   */
  usage?: {
    /**
     * Total input tokens used
     */
    input_tokens: number;
    /**
     * Tokens used for cache creation
     */
    cache_creation_input_tokens?: number;
    /**
     * Tokens read from cache
     */
    cache_read_input_tokens?: number;
    /**
     * Total output tokens generated
     */
    output_tokens: number;
    /**
     * Tokens used for thinking
     */
    thinking_tokens?: number;
    /**
     * Server-side tool usage statistics
     */
    server_tool_use?: {
      /**
       * Number of web search requests made
       */
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
  /**
   * Error code identifier
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Additional error details
   */
  details?: unknown;
}

export interface SessionInfo {
  /**
   * Unique session identifier
   */
  id: string;
  /**
   * Session title or summary
   */
  title?: string;
  /**
   * Unix timestamp of session creation
   */
  createdAt: number;
  /**
   * Unix timestamp of last update
   */
  updatedAt: number;
  /**
   * Claude model used in this session
   */
  model: ModelType;
  /**
   * Array of messages in the session
   */
  messages: ClaudeMessage[];
  /**
   * Total input tokens used in session
   */
  totalInputTokens: number;
  /**
   * Total output tokens generated in session
   */
  totalOutputTokens: number;
  /**
   * Total cost in USD for the session
   */
  totalCost: number;
}
