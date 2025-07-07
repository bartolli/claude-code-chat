/**
 * Message interfaces for communication between extension and webview
 */

export interface BaseMessage {
  /**
   *
   */
  id: string;
  /**
   *
   */
  timestamp: number;
}

export interface RequestMessage<T = unknown> extends BaseMessage {
  /**
   *
   */
  type: 'request';
  /**
   *
   */
  method: string;
  /**
   *
   */
  params?: T;
}

export interface ResponseMessage<T = unknown> extends BaseMessage {
  /**
   *
   */
  type: 'response';
  /**
   *
   */
  requestId: string;
  /**
   *
   */
  result?: T;
  /**
   *
   */
  error?: ErrorInfo;
}

export interface EventMessage<T = unknown> extends BaseMessage {
  /**
   *
   */
  type: 'event';
  /**
   *
   */
  event: string;
  /**
   *
   */
  data: T;
}

export interface ErrorInfo {
  /**
   *
   */
  code: string;
  /**
   *
   */
  message: string;
  /**
   *
   */
  data?: unknown;
}

export type Message = RequestMessage | ResponseMessage | EventMessage;

// Webview to Extension messages
export interface WebviewMessages {
  /**
   *
   */
  sendMessage: {
    /**
     *
     */
    message: string;
  };
  /**
   *
   */
  stopClaude: void;
  /**
   *
   */
  newSession: void;
  /**
   *
   */
  saveConversation: void;
  /**
   *
   */
  loadConversation: void;
  /**
   *
   */
  createBackup: void;
  /**
   *
   */
  selectModel: {
    /**
     *
     */
    model: string;
  };
  /**
   *
   */
  openExternal: {
    /**
     *
     */
    url: string;
  };
}

// Extension to Webview messages
export interface ExtensionMessages {
  /**
   *
   */
  userInput: {
    /**
     *
     */
    text: string;
  };
  /**
   *
   */
  assistantOutput: {
    /**
     *
     */
    text: string;
  };
  /**
   *
   */
  thinking: {
    /**
     *
     */
    text: string;
  };
  /**
   *
   */
  toolUse: {
    /**
     *
     */
    tool: string /**
     *
     */;
    /**
     *
     */
    input: unknown;
  };
  /**
   *
   */
  toolResult: {
    /**
     *
     */
    result: string;
  };
  /**
   *
   */
  error: {
    /**
     *
     */
    message: string;
  };
  /**
   *
   */
  sessionCreated: {
    /**
     *
     */
    sessionId: string;
  };
  /**
   *
   */
  conversationLoaded: {
    /**
     *
     */
    title: string /**
     *
     */;
    /**
     *
     */
    messages: unknown[];
  };
  /**
   *
   */
  sessionInfo: {
    /**
     *
     */
    sessionId: string /**
     *
     */;
    /**
     *
     */
    cost: number /**
     *
     */;
    /**
     *
     */
    inputTokens: number /**
     *
     */;
    /**
     *
     */
    outputTokens: number;
  };
}

export type WebviewMessageType = keyof WebviewMessages;
export type ExtensionMessageType = keyof ExtensionMessages;
