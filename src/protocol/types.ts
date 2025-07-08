/**
 * Type-safe message protocol between extension and webview
 * Based on the IdeMessenger pattern from the GUI project
 */

import { ClaudeStreamMessage, ModelType } from '../types/claude';

// Base message structure
export interface Message<T = any> {
  /** Unique identifier for the message */
  messageId: string;
  /** Type of the message being sent */
  messageType: string;
  /** Payload data for the message */
  data: T;
}

// Message response types
export type MessageResult<T> =
  | { /** Successful response status */ status: 'success'; /** Response content */ content: T }
  | { /** Error response status */ status: 'error'; /** Error message */ error: string };

// Stream message types
export interface StreamMessage<T> {
  /** Indicates the stream is still active */
  done: false;
  /** Stream content chunk */
  content: T;
}

export interface StreamComplete<T> {
  /** Indicates the stream has completed */
  done: true;
  /** Optional final content */
  content?: T;
}

export type StreamResult<T> =
  | StreamMessage<T>
  | StreamComplete<T>
  | { /** Error message */ error: string };

// ============= Extension to Webview Messages =============

export interface ToWebviewProtocol {
  // Session Management
  /** Session has been resumed with stored state */
  'session/resumed': [
    void,
    {
      /** Unique identifier for the resumed session */
      sessionId: string;
      /** Optional title for the session */
      title?: string;
    },
  ];
  /** Session has been cleared and reset */
  'session/cleared': [void, void];
  /** Session information including available tools and servers */
  'session/info': [
    void,
    {
      /** Current session identifier */
      sessionId: string;
      /** List of available tool names */
      tools: string[];
      /** List of connected MCP server names */
      mcpServers: string[];
    },
  ];

  // MCP Server Status
  /** MCP server connection status update */
  'mcp/status': [
    void,
    {
      /** List of MCP servers with their current status */
      servers: Array<{
        /** Server name */
        name: string;
        /** Current connection status */
        status: 'connected' | 'disconnected' | 'error';
        /** Number of tools provided by this server */
        toolCount?: number;
        /** Number of prompts provided by this server */
        promptCount?: number;
      }>;
    },
  ];

  // Status Messages
  /** Extension is ready with status message */
  'status/ready': [void, string];
  /** Loading state with message */
  'status/loading': [void, string];
  /** Clear loading state */
  'status/clearLoading': [void, void];
  /** Processing state indicator */
  'status/processing': [void, boolean];
  /** User login is required */
  'status/loginRequired': [void, void];

  // Content Messages
  /** Assistant output content */
  'content/output': [void, string];
  /** User input content */
  'content/userInput': [void, string];
  /** Error message content */
  'content/error': [void, string];
  /** Thinking/reasoning content */
  'content/thinking': [void, string];
  /** Tool usage information */
  'content/toolUse': [
    void,
    {
      /** Human-readable tool information */
      toolInfo: string;
      /** Tool input as string */
      toolInput: string;
      /** Raw tool input data */
      rawInput: any;
      /** Name of the tool being used */
      toolName: string;
    },
  ];
  /** Tool execution result */
  'content/toolResult': [
    void,
    {
      /** Result content */
      content: string;
      /** Whether the result is an error */
      isError: boolean;
      /** Optional tool use identifier */
      toolUseId?: string;
    },
  ];

  // Token and Cost Updates
  /** Token usage update */
  'tokens/update': [
    void,
    {
      /** Total input tokens used */
      totalTokensInput: number;
      /** Total output tokens generated */
      totalTokensOutput: number;
      /** Current message input tokens */
      currentInputTokens: number;
      /** Current message output tokens */
      currentOutputTokens: number;
      /** Tokens used for cache creation */
      cacheCreationTokens: number;
      /** Tokens saved by cache reads */
      cacheReadTokens: number;
    },
  ];
  /** Total usage statistics update */
  'totals/update': [
    void,
    {
      /** Total cost in dollars */
      totalCost: number;
      /** Total input tokens across all requests */
      totalTokensInput: number;
      /** Total output tokens across all requests */
      totalTokensOutput: number;
      /** Number of API requests made */
      requestCount: number;
      /** Cost of current request */
      currentCost?: number;
      /** Duration of current request in ms */
      currentDuration?: number;
      /** Number of conversation turns */
      currentTurns?: number;
    },
  ];

  // File and Workspace
  /** List of workspace files */
  'workspace/files': [
    void,
    Array<{
      /** Relative path from workspace root */
      relativePath: string;
      /** Whether the path is a directory */
      isDirectory: boolean;
    }>,
  ];
  /** Selected image file path */
  'workspace/imagePath': [void, string];
  /** Current clipboard text content */
  'workspace/clipboardText': [void, string];

  // Conversation Management
  /** List of saved conversations */
  'conversation/list': [
    void,
    Array<{
      /** Conversation filename */
      filename: string;
      /** Unix timestamp of last update */
      timestamp: number;
      /** Conversation title */
      title: string;
      /** Model used in conversation */
      model: string;
      /** Number of messages in conversation */
      messagesCount: number;
      /** Total tokens used */
      totalTokens: number;
      /** Total cost in dollars */
      totalCost: number;
    }>,
  ];
  /** Show conversation restore options from git history */
  'conversation/showRestoreOption': [
    void,
    Array<{
      /** Git commit SHA */
      sha: string;
      /** Commit message */
      message: string;
      /** Commit date */
      date: string;
    }>,
  ];
  /** Conversation restore progress message */
  'conversation/restoreProgress': [void, string];
  /** Conversation restore completed successfully */
  'conversation/restoreSuccess': [void, void];
  /** Conversation restore error message */
  'conversation/restoreError': [void, string];

  // Settings and Configuration
  /** Current settings data */
  'settings/data': [void, Record<string, any>];
  /** Model selection update */
  'settings/modelSelected': [void, string];
  /** Terminal opened notification */
  'settings/terminalOpened': [void, string];

  // Terminal messages
  /** Terminal opened with message */
  'terminal/opened': [
    void,
    {
      /** Terminal status message */
      message: string;
    },
  ];

  // Progressive UI Updates
  /** Update specific UI element */
  'ui/updateElement': [
    void,
    {
      /** Element identifier */
      id: string;
      /** Type of element to update */
      type: 'text' | 'code' | 'tool' | 'thinking';
      /** Element content */
      content: string;
      /** Additional element metadata */
      metadata?: Record<string, any>;
    },
  ];
  /** Progressive message update */
  'ui/progressiveUpdate': [
    void,
    {
      /** Message identifier */
      messageId: string;
      /** Updated content */
      content: string;
      /** Whether update is complete */
      isComplete: boolean;
      /** Update timestamp */
      timestamp: number;
    },
  ];
  /** Batch of UI updates */
  'ui/batchUpdate': [
    void,
    {
      /** Parent message identifier */
      messageId: string;
      /** Array of update operations */
      updates: Array<{
        /** Update message identifier */
        messageId: string;
        /** Update content */
        content: string;
        /** Whether this update is complete */
        isComplete: boolean;
        /** Update timestamp */
        timestamp: number;
      }>;
      /** Final update data */
      final: any;
    },
  ];
  /** Message generation complete */
  'ui/messageComplete': [
    void,
    {
      /** Completed message identifier */
      messageId: string;
      /** Final message content */
      content: string;
      /** Token usage breakdown */
      tokens: {
        /** Input tokens used */
        input?: number;
        /** Output tokens generated */
        output?: number;
        /** Thinking tokens used */
        thinking?: number;
      };
      /** Message cost in dollars */
      cost?: number;
    },
  ];

  // Stream Messages
  /** Claude stream message */
  'stream/claude': [void, ClaudeStreamMessage];

  // Permission handling
  /** Permission request for tool usage */
  'permission/request': [
    void,
    {
      /** Name of the tool requiring permission */
      toolName: string;
      /** Unique tool identifier */
      toolId: string;
      /** Tool input parameters */
      toolInput: any;
    },
  ];

  // Error handling
  /** Show error message */
  'error/show': [
    void,
    {
      /** Error message to display */
      message: string;
    },
  ];

  // Chat message protocol
  /** Add new message to chat */
  'message/add': [
    void,
    {
      /** Message sender role */
      role: 'user' | 'assistant';
      /** Message content */
      content: string;
      /** Thinking/reasoning content */
      thinking?: string;
      /** Tool usage information */
      toolUses?: Array<{
        /** Tool name */
        toolName: string;
        /** Tool identifier */
        toolId: string;
        /** Tool input data */
        input: any;
        /** Tool execution result */
        result?: string;
        /** Whether tool execution failed */
        isError?: boolean;
      }>;
    },
  ];
  /** Update existing message */
  'message/update': [
    void,
    {
      /** Message role (always assistant for updates) */
      role: 'assistant';
      /** Updated message content */
      content: string;
    },
  ];
  /** Thinking/reasoning update */
  'message/thinking': [
    void,
    {
      /** Full thinking content */
      content: string;
      /** Current line being processed */
      currentLine?: string;
      /** Whether thinking is active */
      isActive: boolean;
      /** Thinking duration in ms */
      duration?: number;
    },
  ];
  /** Tool usage notification */
  'message/toolUse': [
    void,
    {
      /** Name of tool being used */
      toolName: string;
      /** Unique tool use identifier */
      toolId: string;
      /** Tool input parameters */
      input: any;
      /** Current tool status */
      status: string;
      /** Parent tool use ID for nested calls */
      parentToolUseId?: string;
    },
  ];
  /** Tool execution result */
  'message/toolResult': [
    void,
    {
      /** Tool use identifier */
      toolId: string;
      /** Tool execution result */
      result: string;
      /** Whether execution failed */
      isError?: boolean;
      /** Result status */
      status: string;
      /** Parent tool use ID for nested calls */
      parentToolUseId?: string;
    },
  ];
  /** Chat message generation complete */
  'chat/messageComplete': [
    void,
    {
      /** Session identifier */
      sessionId?: string;
      /** Total cost for this message */
      totalCost?: number;
      /** Generation duration in ms */
      duration?: number;
    },
  ];
  /** Token usage report */
  'message/tokenUsage': [
    void,
    {
      /** Number of input tokens */
      inputTokens: number;
      /** Number of output tokens */
      outputTokens: number;
      /** Number of thinking tokens */
      thinkingTokens?: number;
      /** Number of cached tokens */
      cacheTokens?: number;
    },
  ];

  // Plan mode messages
  /** Plan proposal for approval */
  'message/planProposal': [
    void,
    {
      /** Tool identifier for plan */
      toolId: string;
      /** Proposed plan content */
      plan: string;
      /** Associated message ID */
      messageId?: string;
    },
  ];
  /** Toggle plan mode on/off */
  'planMode/toggle': [void, boolean];
}

// ============= Webview to Extension Messages =============

export interface FromWebviewProtocol {
  // Chat Operations
  /** Send chat message request */
  'chat/sendMessage': [
    {
      /** Message text to send */
      text: string;
      /** Whether plan mode is enabled */
      planMode: boolean;
      /** Whether thinking mode is enabled */
      thinkingMode: boolean;
      /** Level of thinking intensity */
      thinkingIntensity?: 'think' | 'think-hard' | 'think-harder';
    },
    void,
  ];
  /** Stop current chat generation */
  'chat/stopRequest': [void, void];
  /** Create new chat session */
  'chat/newSession': [void, void];

  // File Operations
  /** Get workspace files with optional search */
  'file/getWorkspaceFiles': [
    {
      /** Optional search term to filter files */
      searchTerm?: string;
    },
    Array<{
      /** Relative file path */
      relativePath: string;
      /** Whether path is directory */
      isDirectory: boolean;
    }>,
  ];
  /** Select image file from dialog */
  'file/selectImage': [void, string | undefined];
  /** Get current clipboard text */
  'file/getClipboardText': [void, string];

  // Conversation Management
  /** Get list of saved conversations */
  'conversation/getList': [
    void,
    Array<{
      /** Conversation filename */
      filename: string;
      /** Last modified timestamp */
      timestamp: number;
      /** Conversation title */
      title: string;
      /** Model used */
      model: string;
      /** Number of messages */
      messagesCount: number;
      /** Total tokens used */
      totalTokens: number;
      /** Total cost in dollars */
      totalCost: number;
    }>,
  ];
  /** Load conversation from file */
  'conversation/load': [
    {
      /** Filename to load */
      filename: string;
    },
    void,
  ];
  /** Restore conversation from git history */
  'conversation/restore': [
    {
      /** Git commit SHA to restore from */
      commitSha: string;
    },
    void,
  ];

  // Settings and Configuration
  /** Get current settings */
  'settings/get': [void, Record<string, any>];
  /** Update settings */
  'settings/update': [Record<string, any>, void];
  /** Select AI model */
  'settings/selectModel': [
    {
      /** Model identifier to select */
      model: string;
    },
    void,
  ];
  /** Open model configuration terminal */
  'settings/openModelTerminal': [void, void];

  // Streaming requests
  /** Start streaming request */
  'stream/start': [
    {
      /** Unique request identifier */
      requestId: string;
    },
    void,
  ];
  /** Abort streaming request */
  'stream/abort': [
    {
      /** Request identifier to abort */
      requestId: string;
    },
    void,
  ];

  // Permission handling
  /** Permission response from user */
  'permission/response': [
    {
      /** Tool identifier */
      toolId: string;
      /** Tool name */
      toolName: string;
      /** Whether permission was approved */
      approved: boolean;
    },
    void,
  ];

  // MCP requests
  /** Get MCP server list */
  'mcp/getServers': [void, void];

  // Plan mode operations
  /** Approve proposed plan */
  'plan/approve': [
    {
      /** Tool identifier for plan */
      toolId: string;
    },
    void,
  ];
  /** Request plan refinement */
  'plan/refine': [
    {
      /** Tool identifier for plan */
      toolId: string;
    },
    void,
  ];
}

// Helper types for type safety
export type ToWebviewMessageType = keyof ToWebviewProtocol;
export type FromWebviewMessageType = keyof FromWebviewProtocol;

export type ToWebviewMessage<T extends ToWebviewMessageType> = {
  /** Message type */
  type: T;
  /** Message data payload */
  data: ToWebviewProtocol[T][1];
};

export type FromWebviewMessage<T extends FromWebviewMessageType> = {
  /** Message type */
  type: T;
  /** Message data payload */
  data: FromWebviewProtocol[T][0];
  /** Optional message identifier */
  messageId?: string;
};

// Utility types for protocol handling
export type ProtocolHandler<P extends Record<string, [any, any]>> = {
  [K in keyof P]: (data: P[K][0]) => Promise<P[K][1]> | P[K][1];
};

export type StreamProtocolHandler<P extends Record<string, [any, any]>> = {
  [K in keyof P]: (data: P[K][0]) => AsyncGenerator<P[K][1], void, unknown>;
};
