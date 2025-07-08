/**
 * Message interfaces for communication between extension and webview
 */

export interface BaseMessage {
  /**
   * Unique identifier for the message
   */
  id: string;
  /**
   * Unix timestamp when the message was created
   */
  timestamp: number;
}

export interface RequestMessage<T = unknown> extends BaseMessage {
  /**
   * Message type identifier
   */
  type: 'request';
  /**
   * The method name to invoke
   */
  method: string;
  /**
   * Optional parameters for the method
   */
  params?: T;
}

export interface ResponseMessage<T = unknown> extends BaseMessage {
  /**
   * Message type identifier
   */
  type: 'response';
  /**
   * ID of the request this response is for
   */
  requestId: string;
  /**
   * Successful result data
   */
  result?: T;
  /**
   * Error information if the request failed
   */
  error?: ErrorInfo;
}

export interface EventMessage<T = unknown> extends BaseMessage {
  /**
   * Message type identifier
   */
  type: 'event';
  /**
   * Name of the event
   */
  event: string;
  /**
   * Event payload data
   */
  data: T;
}

export interface ErrorInfo {
  /**
   * Error code identifier
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Additional error context data
   */
  data?: unknown;
}

export type Message = RequestMessage | ResponseMessage | EventMessage;

// Webview to Extension messages
export interface WebviewMessages {
  /**
   * Send a message to Claude
   */
  sendMessage: {
    /**
     * The message text to send
     */
    message: string;
  };
  /**
   * Stop the current Claude process
   */
  stopClaude: void;
  /**
   * Start a new chat session
   */
  newSession: void;
  /**
   * Save the current conversation
   */
  saveConversation: void;
  /**
   * Load a previous conversation
   */
  loadConversation: void;
  /**
   * Create a backup of conversations
   */
  createBackup: void;
  /**
   * Select a Claude model
   */
  selectModel: {
    /**
     * The model identifier to use
     */
    model: string;
  };
  /**
   * Open an external URL
   */
  openExternal: {
    /**
     * The URL to open externally
     */
    url: string;
  };
}

// Extension to Webview messages
export interface ExtensionMessages {
  /**
   * User input message
   */
  userInput: {
    /**
     * The user's message text
     */
    text: string;
  };
  /**
   * Assistant response output
   */
  assistantOutput: {
    /**
     * The assistant's response text
     */
    text: string;
  };
  /**
   * Assistant thinking process
   */
  thinking: {
    /**
     * The thinking text content
     */
    text: string;
  };
  /**
   * Tool usage notification
   */
  toolUse: {
    /**
     * Name of the tool being used
     */
    tool: string;
    /**
     * Input parameters for the tool
     */
    input: unknown;
  };
  /**
   * Tool execution result
   */
  toolResult: {
    /**
     * The tool's output result
     */
    result: string;
  };
  /**
   * Error notification
   */
  error: {
    /**
     * The error message to display
     */
    message: string;
  };
  /**
   * New session created notification
   */
  sessionCreated: {
    /**
     * Unique identifier for the new session
     */
    sessionId: string;
  };
  /**
   * Conversation loaded notification
   */
  conversationLoaded: {
    /**
     * Title of the loaded conversation
     */
    title: string;
    /**
     * Array of conversation messages
     */
    messages: unknown[];
  };
  /**
   * Session information update
   */
  sessionInfo: {
    /**
     * Current session identifier
     */
    sessionId: string;
    /**
     * Total cost of the session
     */
    cost: number;
    /**
     * Number of input tokens used
     */
    inputTokens: number;
    /**
     * Number of output tokens generated
     */
    outputTokens: number;
  };
}

export type WebviewMessageType = keyof WebviewMessages;
export type ExtensionMessageType = keyof ExtensionMessages;
