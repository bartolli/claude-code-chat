/**
 * IdeMessenger for webview-side communication
 * Implements the same pattern as the GUI project for compatibility
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageResult,
  ToWebviewProtocol,
  FromWebviewProtocol,
  ToWebviewMessageType,
  FromWebviewMessageType,
} from './types';
import { logger } from './webview-logger';

declare const acquireVsCodeApi: () => {
  /**
   * Posts a message to the VS Code extension host
   */
  postMessage(message: any): void;
  /**
   * Gets the current state from VS Code
   */
  getState(): any;
  /**
   * Sets the state in VS Code
   */
  setState(state: any): void;
};

export interface IIdeMessenger {
  /**
   * Posts a message to the IDE without expecting a response
   */
  post<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    messageId?: string,
    attempt?: number
  ): void;

  /**
   * Responds to a message received from the IDE
   */
  respond<T extends ToWebviewMessageType>(
    messageType: T,
    data: ToWebviewProtocol[T][1],
    messageId: string
  ): void;

  /**
   * Sends a request to the IDE and waits for a response
   */
  request<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0]
  ): Promise<FromWebviewProtocol[T][1]>;

  /**
   * Sends a streaming request to the IDE
   */
  streamRequest<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    cancelToken?: AbortSignal
  ): AsyncGenerator<FromWebviewProtocol[T][1], void, unknown>;

  /**
   * Registers a handler for messages from the IDE
   */
  on<T extends ToWebviewMessageType>(
    messageType: T,
    handler: (data: ToWebviewProtocol[T][0]) => void
  ): () => void;

  /**
   * Registers a handler for streaming messages from the IDE
   */
  onStream<T extends ToWebviewMessageType>(
    messageType: T,
    handler: (data: AsyncGenerator<ToWebviewProtocol[T][1], void>) => void
  ): () => void;
}

/**
 * Implementation of IdeMessenger for webview-side communication
 */
export class IdeMessenger implements IIdeMessenger {
  private vscode: ReturnType<typeof acquireVsCodeApi>;
  private handlers = new Map<string, Set<(data: any) => void>>();
  private streamHandlers = new Map<string, Set<(data: any) => void>>();
  private responseHandlers = new Map<string, (data: any) => void>();
  private streamBuffers = new Map<
    string,
    {
      /**
       * Buffer for streaming data chunks
       */
      buffer: any[];
      /**
       * Promise resolver for stream completion
       */
      resolve?: (value: any) => void;
      /**
       * Promise rejector for stream errors
       */
      reject?: (error: any) => void;
    }
  >();

  /**
   * Creates a new IdeMessenger instance
   * @param vscodeApi - Optional VS Code API instance for testing
   */
  constructor(vscodeApi?: ReturnType<typeof acquireVsCodeApi>) {
    // Use provided API or acquire it
    if (vscodeApi) {
      this.vscode = vscodeApi;
    } else if (typeof acquireVsCodeApi !== 'undefined') {
      this.vscode = acquireVsCodeApi();
    } else {
      // Mock for testing
      this.vscode = {
        postMessage: (msg) => logger.debug('Mock postMessage:', msg),
        getState: () => ({}),
        setState: () => {},
      };
    }

    // Set up message receiving
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        const timestamp = new Date().toISOString();
        logger.debug(`Window message event received`);
        logger.debug(`  - Origin: ${event.origin}`);
        logger.debug(`  - Source: ${event.source}`);
        logger.debug(`  - Data:`, event.data);

        const message = event.data as Message;

        // Validate message structure
        if (!message || typeof message !== 'object') {
          logger.warn(`Invalid message format - not an object`);
          return;
        }

        if (!message.messageType) {
          logger.warn(`Message missing messageType field`);
          logger.warn(`  - Full event data:`, event.data);
          return;
        }

        this.handleMessage(message);
      });
    }
  }

  /**
   * Internal method to post messages to the IDE
   * @param messageType - The type of message to send
   * @param data - The message data
   * @param messageId - Optional message ID (auto-generated if not provided)
   */
  private _postToIde(messageType: string, data: any, messageId: string = uuidv4()) {
    const msg: Message = {
      messageId,
      messageType,
      data,
    };

    this.vscode.postMessage(msg);
  }

  /**
   * Posts a message to the IDE without expecting a response
   * @param messageType - The type of message to send
   * @param data - The message data
   * @param messageId - Optional message ID
   * @param attempt - Current retry attempt number
   */
  post<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    messageId?: string,
    attempt: number = 0
  ) {
    try {
      this._postToIde(messageType, data, messageId);
    } catch (error) {
      if (attempt < 5) {
        logger.info(`Attempt ${attempt} failed. Retrying...`);
        setTimeout(
          () => this.post(messageType, data, messageId, attempt + 1),
          Math.pow(2, attempt) * 1000
        );
      } else {
        logger.error('Max attempts reached. Message could not be sent.', error);
      }
    }
  }

  /**
   * Responds to a message received from the IDE
   * @param messageType - The type of response message
   * @param data - The response data
   * @param messageId - The ID of the original message
   */
  respond<T extends ToWebviewMessageType>(
    messageType: T,
    data: ToWebviewProtocol[T][1],
    messageId: string
  ) {
    this._postToIde(messageType, data, messageId);
  }

  /**
   * Sends a request to the IDE and waits for a response
   * @param messageType - The type of request message
   * @param data - The request data
   * @returns Promise that resolves with the response data
   */
  request<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0]
  ): Promise<FromWebviewProtocol[T][1]> {
    const messageId = uuidv4();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(messageId);
        reject(new Error(`Request timeout: ${messageType}`));
      }, 30000); // 30 second timeout

      this.responseHandlers.set(messageId, (response: MessageResult<FromWebviewProtocol[T][1]>) => {
        clearTimeout(timeout);
        this.responseHandlers.delete(messageId);

        if (response.status === 'error') {
          reject(new Error(response.error));
        } else {
          resolve(response.content);
        }
      });

      this.post(messageType, data, messageId);
    });
  }

  /**
   * Sends a streaming request to the IDE
   * @param messageType - The type of streaming request
   * @param data - The request data
   * @param cancelToken - Optional AbortSignal to cancel the stream
   */
  async *streamRequest<T extends FromWebviewMessageType>(
    messageType: T,
    data: FromWebviewProtocol[T][0],
    cancelToken?: AbortSignal
  ): AsyncGenerator<FromWebviewProtocol[T][1], void, unknown> {
    const messageId = uuidv4();

    // Initialize stream buffer
    this.streamBuffers.set(messageId, { buffer: [] });

    // Send the request
    this.post(messageType, data, messageId);

    // Handle abort
    const handleAbort = () => {
      this.post(
        'stream/abort' as FromWebviewMessageType,
        { requestId: messageId } as FromWebviewProtocol[T][0],
        messageId
      );
      this.streamBuffers.delete(messageId);
    };
    cancelToken?.addEventListener('abort', handleAbort);

    try {
      let done = false;
      let index = 0;

      while (!done) {
        const bufferInfo = this.streamBuffers.get(messageId);
        if (!bufferInfo) {
          throw new Error('Stream buffer not found');
        }

        // Check for new data
        if (bufferInfo.buffer.length > index) {
          const chunks = bufferInfo.buffer.slice(index);
          index = bufferInfo.buffer.length;

          for (const chunk of chunks) {
            if ('error' in chunk) {
              throw new Error(chunk.error);
            } else if (chunk.done) {
              done = true;
              if (chunk.content !== undefined) {
                yield chunk.content;
              }
            } else {
              yield chunk.content;
            }
          }
        }

        if (!done) {
          // Wait for more data
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
      }
    } finally {
      cancelToken?.removeEventListener('abort', handleAbort);
      this.streamBuffers.delete(messageId);
    }
  }

  /**
   * Registers a handler for messages from the IDE
   * @param messageType - The type of message to handle
   * @param handler - The handler function
   * @returns Function to unsubscribe the handler
   */
  on<T extends ToWebviewMessageType>(
    messageType: T,
    handler: (data: ToWebviewProtocol[T][0]) => void
  ): () => void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }

    this.handlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Registers a handler for streaming messages from the IDE
   * @param messageType - The type of streaming message to handle
   * @param handler - The handler function for the stream
   * @returns Function to unsubscribe the handler
   */
  onStream<T extends ToWebviewMessageType>(
    messageType: T,
    handler: (data: AsyncGenerator<ToWebviewProtocol[T][1], void>) => void
  ): () => void {
    if (!this.streamHandlers.has(messageType)) {
      this.streamHandlers.set(messageType, new Set());
    }

    this.streamHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.streamHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.streamHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Handles incoming messages from the IDE
   * @param message - The message object received from the IDE
   */
  private handleMessage(message: Message): void {
    const { messageId, messageType, data } = message;
    const timestamp = new Date().toISOString();

    // Enhanced logging for debugging
    logger.debug(`Received message from backend`);
    logger.debug(`  - Type: ${messageType}`);
    logger.debug(`  - Message ID: ${messageId || 'none'}`);
    logger.debug(`  - Data:`, data);

    // Log critical message types
    if (messageType === 'message/add' || messageType === 'message/update') {
      logger.info(`CRITICAL - Received ${messageType}`);
      logger.info(`  - Full message object:`, JSON.stringify(message, null, 2));
    }

    // Check for response to a request
    if (this.responseHandlers.has(messageId)) {
      logger.debug(`Handling as response to request ${messageId}`);
      this.responseHandlers.get(messageId)!(data);
      return;
    }

    // Check for stream data
    if (this.streamBuffers.has(messageId)) {
      logger.debug(`Handling as stream data for ${messageId}`);
      const bufferInfo = this.streamBuffers.get(messageId)!;
      bufferInfo.buffer.push(data);
      return;
    }

    // Check for regular handlers
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      logger.debug(`Found ${handlers.size} handlers for ${messageType}`);
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in handler for ${messageType}:`, error);
        }
      });
    } else {
      logger.warn(`No handlers registered for message type: ${messageType}`);
    }

    // Check for stream start
    const streamHandlers = this.streamHandlers.get(messageType);
    if (streamHandlers && data.messageId) {
      logger.debug(`Starting stream for ${messageType}`);
      // Initialize stream for this message
      this.streamBuffers.set(data.messageId, { buffer: [] });

      // Create async generator for this stream
      const generator = this.createStreamGenerator(data.messageId);

      streamHandlers.forEach((handler) => {
        try {
          handler(generator);
        } catch (error) {
          logger.error(`Error in stream handler:`, error);
        }
      });
    }
  }

  /**
   * Creates an async generator for streaming data
   * @param messageId - The ID of the stream message
   */
  private async *createStreamGenerator(messageId: string): AsyncGenerator<any, void, unknown> {
    const bufferInfo = this.streamBuffers.get(messageId);
    if (!bufferInfo) {
      throw new Error('Stream buffer not found');
    }

    let index = 0;
    let done = false;

    while (!done) {
      if (bufferInfo.buffer.length > index) {
        const chunks = bufferInfo.buffer.slice(index);
        index = bufferInfo.buffer.length;

        for (const chunk of chunks) {
          if ('error' in chunk) {
            throw new Error(chunk.error);
          } else if (chunk.done) {
            done = true;
            if (chunk.content !== undefined) {
              yield chunk.content;
            }
          } else {
            yield chunk.content;
          }
        }
      }

      if (!done) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.streamBuffers.delete(messageId);
  }
}
