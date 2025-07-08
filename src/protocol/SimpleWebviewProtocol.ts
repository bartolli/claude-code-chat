/**
 * Simple WebviewProtocol for webview communication
 */

import * as vscode from 'vscode';
import { Message } from './types';
import { Logger } from '../core/Logger';

/**
 * Simple protocol handler for VS Code webview communication
 */
export class SimpleWebviewProtocol {
  private handler?: (type: string, data: any) => Promise<any>;

  /**
   * Creates a new SimpleWebviewProtocol instance
   * @param webview - The VS Code webview to communicate with
   */
  constructor(private webview: vscode.Webview) {
    // Set up message receiving
    webview.onDidReceiveMessage(async (message: Message) => {
      Logger.getInstance().debug('SimpleWebviewProtocol', 'Received message', message);

      if (this.handler && message.messageType) {
        try {
          const result = await this.handler(message.messageType, message.data);

          // Send response back if there's a messageId
          if (message.messageId) {
            this.webview.postMessage({
              messageId: message.messageId,
              messageType: message.messageType,
              data: result,
            });
          }
        } catch (error) {
          Logger.getInstance().error(
            'SimpleWebviewProtocol',
            'Error handling message',
            error as Error
          );
        }
      }
    });
  }

  /**
   * Set the message handler
   * @param handler - Function to handle incoming messages
   */
  public setHandler(handler: (type: string, data: any) => Promise<any>): void {
    this.handler = handler;
  }

  /**
   * Send a message to the webview
   * @param type - The message type
   * @param data - The message data
   */
  public post(type: string, data: any): void {
    const timestamp = new Date().toISOString();
    const messageId = Math.random().toString(36).substring(7);

    Logger.getInstance().debug(
      'SimpleWebviewProtocol',
      `Preparing to send message
  - Type: ${type}
  - Message ID: ${messageId}
  - Data: ${JSON.stringify(data, null, 2)}`
    );

    try {
      const message = {
        messageType: type,
        data,
        timestamp,
        messageId,
      };

      Logger.getInstance().debug('SimpleWebviewProtocol', 'Calling webview.postMessage');
      const result = this.webview.postMessage(message);
      Logger.getInstance().debug('SimpleWebviewProtocol', `postMessage returned: ${result}`);

      // Log specific message types that are problematic
      if (type === 'message/add' || type === 'message/update') {
        Logger.getInstance().info(
          'SimpleWebviewProtocol',
          `CRITICAL - Sent ${type} message with ID ${messageId}`
        );
      }
    } catch (error) {
      Logger.getInstance().error('SimpleWebviewProtocol', 'ERROR sending message', error as Error);
    }
  }
}
