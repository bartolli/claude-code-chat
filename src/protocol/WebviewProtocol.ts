/**
 * WebviewProtocol service for type-safe communication between extension and webview
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../core/Logger';
import {
  Message,
  MessageResult,
  StreamResult,
  ToWebviewProtocol,
  FromWebviewProtocol,
  ToWebviewMessageType,
  FromWebviewMessageType,
  ProtocolHandler,
  StreamProtocolHandler,
} from './types';

/**
 * Service for type-safe bidirectional communication between VS Code extension and webview
 */
export class WebviewProtocol {
  private readonly logger: Logger;
  private readonly messageHandlers = new Map<string, (data: any) => void>();
  private readonly streamHandlers = new Map<string, (data: any) => void>();
  private webviewPanel?: vscode.WebviewPanel;
  private handlers: Partial<Record<FromWebviewMessageType, (data: any) => Promise<any> | any>> = {};
  private streamHandlers2: Partial<
    Record<FromWebviewMessageType, (data: any) => AsyncGenerator<any, void, unknown>>
  > = {};

  /**
   * Creates a new WebviewProtocol instance
   * @param logger - Logger instance for debugging
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Attach to a webview panel
   * @param webviewPanel - The VS Code webview panel to attach to
   */
  attach(webviewPanel: vscode.WebviewPanel): void {
    this.webviewPanel = webviewPanel;

    // Set up message receiving
    webviewPanel.webview.onDidReceiveMessage(async (message: Message) => {
      this.logger.debug('WebviewProtocol', 'Received message', {
        type: message.messageType,
        id: message.messageId,
      });

      try {
        await this.handleMessage(message);
      } catch (error) {
        this.logger.error('WebviewProtocol', 'Error handling message', error as Error, { message });

        // Send error response if we have a message ID
        if (message.messageId) {
          this.respondError(message.messageId, message.messageType, error);
        }
      }
    });

    // Clean up on dispose
    webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
      this.messageHandlers.clear();
      this.streamHandlers.clear();
    });
  }

  /**
   * Send a message to the webview
   * @param messageType - The type of message to send
   * @param data - The message data
   * @param messageId - Optional message ID (auto-generated if not provided)
   */
  post<T extends ToWebviewMessageType>(
    messageType: T,
    data: ToWebviewProtocol[T][1],
    messageId: string = uuidv4()
  ): void {
    if (!this.webviewPanel) {
      this.logger.warn('WebviewProtocol', 'No webview panel attached');
      return;
    }

    const message: Message = {
      messageId,
      messageType,
      data,
    };

    this.webviewPanel.webview.postMessage(message);
    this.logger.debug('WebviewProtocol', 'Sent message', {
      type: messageType,
      id: messageId,
    });
  }

  /**
   * Send a response to a request from the webview
   * @param messageId - The ID of the original request
   * @param messageType - The type of the response message
   * @param data - The response data
   */
  respond<T extends FromWebviewMessageType>(
    messageId: string,
    messageType: T,
    data: FromWebviewProtocol[T][1]
  ): void {
    if (!this.webviewPanel) {
      this.logger.warn('WebviewProtocol', 'No webview panel attached');
      return;
    }

    const response: Message<MessageResult<FromWebviewProtocol[T][1]>> = {
      messageId,
      messageType,
      data: { status: 'success', content: data },
    };

    this.webviewPanel.webview.postMessage(response);
  }

  /**
   * Send an error response
   * @param messageId - The ID of the original request
   * @param messageType - The type of the response message
   * @param error - The error to send
   */
  respondError(messageId: string, messageType: string, error: any): void {
    if (!this.webviewPanel) {
      return;
    }

    const response: Message<MessageResult<any>> = {
      messageId,
      messageType,
      data: { status: 'error', error: String(error) },
    };

    this.webviewPanel.webview.postMessage(response);
  }

  /**
   * Make a request to the webview and wait for response
   * @param messageType - The type of request message
   * @param data - The request data
   * @returns Promise that resolves with the response data
   */
  request<T extends ToWebviewMessageType>(
    messageType: T,
    data: ToWebviewProtocol[T][0]
  ): Promise<ToWebviewProtocol[T][1]> {
    const messageId = uuidv4();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.messageHandlers.delete(messageId);
        clearTimeout(timeout);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout: ${messageType}`));
      }, 30000); // 30 second timeout

      this.messageHandlers.set(messageId, (response: MessageResult<ToWebviewProtocol[T][1]>) => {
        cleanup();

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
   * Stream data to the webview
   * @param messageType - The type of stream message
   * @param generator - Async generator that yields stream data
   * @param messageId - Optional message ID for the stream
   */
  async *stream<T extends ToWebviewMessageType>(
    messageType: T,
    generator: AsyncGenerator<ToWebviewProtocol[T][1], void, unknown>,
    messageId: string = uuidv4()
  ): AsyncGenerator<void, void, unknown> {
    if (!this.webviewPanel) {
      this.logger.warn('WebviewProtocol', 'No webview panel attached');
      return;
    }

    try {
      for await (const data of generator) {
        const streamMessage: Message<StreamResult<ToWebviewProtocol[T][1]>> = {
          messageId,
          messageType,
          data: { done: false, content: data },
        };

        this.webviewPanel.webview.postMessage(streamMessage);
        yield;
      }

      // Send completion
      const completeMessage: Message<StreamResult<ToWebviewProtocol[T][1]>> = {
        messageId,
        messageType,
        data: { done: true },
      };

      this.webviewPanel.webview.postMessage(completeMessage);
    } catch (error) {
      // Send error
      const errorMessage: Message<StreamResult<ToWebviewProtocol[T][1]>> = {
        messageId,
        messageType,
        data: { error: String(error) },
      };

      this.webviewPanel.webview.postMessage(errorMessage);
      throw error;
    }
  }

  /**
   * Register a handler for a message type
   * @param messageType - The type of message to handle
   * @param handler - Function to handle the message
   */
  on<T extends FromWebviewMessageType>(
    messageType: T,
    handler: (
      data: FromWebviewProtocol[T][0]
    ) => Promise<FromWebviewProtocol[T][1]> | FromWebviewProtocol[T][1]
  ): void {
    this.handlers[messageType] = handler;
  }

  /**
   * Register a stream handler for a message type
   * @param messageType - The type of stream message to handle
   * @param handler - Async generator function to handle the stream
   */
  onStream<T extends FromWebviewMessageType>(
    messageType: T,
    handler: (
      data: FromWebviewProtocol[T][0]
    ) => AsyncGenerator<FromWebviewProtocol[T][1], void, unknown>
  ): void {
    this.streamHandlers2[messageType] = handler;
  }

  /**
   * Handle incoming messages
   * @param message - The message to handle
   */
  private async handleMessage(message: Message): Promise<void> {
    const { messageId, messageType, data } = message;

    // Check for response handlers first
    if (this.messageHandlers.has(messageId)) {
      this.messageHandlers.get(messageId)!(data);
      return;
    }

    // Check for stream handlers
    if (messageType in this.streamHandlers2) {
      const handler = this.streamHandlers2[messageType as FromWebviewMessageType];
      if (!handler) {
        return;
      }
      const generator = handler(data);

      try {
        for await (const chunk of generator) {
          const streamMessage: Message<StreamResult<any>> = {
            messageId,
            messageType,
            data: { done: false, content: chunk },
          };

          this.webviewPanel!.webview.postMessage(streamMessage);
        }

        // Send completion
        const completeMessage: Message<StreamResult<any>> = {
          messageId,
          messageType,
          data: { done: true },
        };

        this.webviewPanel!.webview.postMessage(completeMessage);
      } catch (error) {
        this.respondError(messageId, messageType, error);
      }

      return;
    }

    // Check for regular handlers
    if (messageType in this.handlers) {
      const handler = this.handlers[messageType as FromWebviewMessageType];
      if (!handler) {
        return;
      }

      try {
        const result = await handler(data);
        this.respond(messageId, messageType as FromWebviewMessageType, result);
      } catch (error) {
        this.respondError(messageId, messageType, error);
      }

      return;
    }

    // No handler found
    this.logger.warn('WebviewProtocol', 'No handler for message type', { messageType });
    this.respondError(
      messageId,
      messageType,
      new Error(`No handler for message type: ${messageType}`)
    );
  }

  /**
   * Helper to convert old-style messages to new protocol
   * @param type - The old-style message type to convert
   * @param data - The message data payload
   */
  postLegacy(type: string, data: any): void {
    // Map old message types to new protocol
    const mappings: Record<string, ToWebviewMessageType> = {
      ready: 'status/ready',
      loading: 'status/loading',
      clearLoading: 'status/clearLoading',
      setProcessing: 'status/processing',
      loginRequired: 'status/loginRequired',
      output: 'content/output',
      userInput: 'content/userInput',
      error: 'content/error',
      thinking: 'content/thinking',
      toolUse: 'content/toolUse',
      toolResult: 'content/toolResult',
      updateTokens: 'tokens/update',
      updateTotals: 'totals/update',
      workspaceFiles: 'workspace/files',
      imagePath: 'workspace/imagePath',
      clipboardText: 'workspace/clipboardText',
      conversationList: 'conversation/list',
      showRestoreOption: 'conversation/showRestoreOption',
      restoreProgress: 'conversation/restoreProgress',
      restoreSuccess: 'conversation/restoreSuccess',
      restoreError: 'conversation/restoreError',
      settingsData: 'settings/data',
      modelSelected: 'settings/modelSelected',
      terminalOpened: 'settings/terminalOpened',
      sessionResumed: 'session/resumed',
      sessionCleared: 'session/cleared',
      sessionInfo: 'session/info',
    };

    const newType = mappings[type];
    if (newType) {
      this.post(newType, data);
    } else {
      // Fallback to old style for unmapped types
      this.webviewPanel?.webview.postMessage({ type, data });
    }
  }
}
