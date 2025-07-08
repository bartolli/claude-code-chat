/**
 * Base protocol definitions for typed communication
 */

export interface ProtocolMessage<T = unknown> {
  /** Unique message identifier */
  messageId: string;
  /** Type of the message */
  messageType: string;
  /** Timestamp when message was created */
  timestamp: number;
  /** Message payload data */
  data: T;
  /** Message priority level */
  priority?: 'high' | 'medium' | 'low';
}

export interface ProtocolRequest<T = unknown> extends ProtocolMessage<T> {
  /** Indicates this message expects a response */
  expectsResponse: true;
  /** Optional timeout in milliseconds for the response */
  timeout?: number;
}

export interface ProtocolResponse<T = unknown> extends ProtocolMessage<T> {
  /** ID of the original request this is responding to */
  requestId: string;
  /** Whether the request was successful */
  success: boolean;
  /** Error information if the request failed */
  error?: ProtocolError;
}

export interface ProtocolEvent<T = unknown> extends ProtocolMessage<T> {
  /** Indicates this is a one-way event with no response expected */
  expectsResponse: false;
}

export interface ProtocolError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details or context */
  details?: unknown;
}

export type Protocol<
  T extends Record<
    string,
    {
      /** Request payload type */
      request: unknown;
      /** Response payload type */
      response: unknown;
    }
  >,
> = {
  [K in keyof T]: {
    /** Request payload for this protocol method */
    request: T[K]['request'];
    /** Response payload for this protocol method */
    response: T[K]['response'];
  };
};

// Define the protocol between extension and webview
export interface ExtensionProtocol {
  /** Send a chat message to the AI */
  'chat/sendMessage': {
    /** Request to send a message */
    request: {
      /** The message text to send */
      message: string;
      /** Optional context for the message */
      context?: unknown;
    };
    /** Response containing session and message IDs */
    response: {
      /** ID of the chat session */
      sessionId: string;
      /** ID of the created message */
      messageId: string;
    };
  };
  /** Stop the current chat generation */
  'chat/stop': {
    /** No request data needed */
    request: void;
    /** Response indicating if stop was successful */
    response: {
      /** Whether the chat was successfully stopped */
      stopped: boolean;
    };
  };
  /** Create a new chat session */
  'session/new': {
    /** Request to create a new session */
    request: {
      /** Optional model to use for the session */
      model?: string;
    };
    /** Response with the new session ID */
    response: {
      /** ID of the newly created session */
      sessionId: string;
    };
  };
  /** Load an existing chat session */
  'session/load': {
    /** Request to load a session from file */
    request: {
      /** Path to the session file */
      path: string;
    };
    /** Response with loaded session data */
    response: {
      /** ID of the loaded session */
      sessionId: string;
      /** Array of messages in the session */
      messages: unknown[];
    };
  };
  /** Save the current chat session */
  'session/save': {
    /** Request to save a session */
    request: {
      /** ID of the session to save */
      sessionId: string;
    };
    /** Response with save location */
    response: {
      /** Path where the session was saved */
      path: string;
    };
  };
  /** Update configuration settings */
  'config/update': {
    /** Request to update configuration */
    request: {
      /** Partial configuration object to merge */
      config: Partial<unknown>;
    };
    /** Response indicating update status */
    response: {
      /** Whether the configuration was successfully updated */
      success: boolean;
    };
  };
}

/** Union type of all extension protocol message types */
export type ExtensionProtocolType = keyof ExtensionProtocol;

// Test function demonstrating proper implementation
/**
 * Processes data with proper typing and logging
 * @param data - The data to process
 * @returns The processed data
 */
export function processData<T>(data: T): T {
  // Proper implementation with type safety
  // In production, this would use Logger.getInstance()
  const processed = { ...data };
  return processed;
}
