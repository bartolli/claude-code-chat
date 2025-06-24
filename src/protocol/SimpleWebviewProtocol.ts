/**
 * Simple WebviewProtocol for webview communication
 */

import * as vscode from 'vscode';
import { Message } from './types';

export class SimpleWebviewProtocol {
    private handler?: (type: string, data: any) => Promise<any>;

    constructor(private webview: vscode.Webview) {
        // Set up message receiving
        webview.onDidReceiveMessage(async (message: Message) => {
            console.log('SimpleWebviewProtocol: Received message', message);
            
            if (this.handler && message.messageType) {
                try {
                    const result = await this.handler(message.messageType, message.data);
                    
                    // Send response back if there's a messageId
                    if (message.messageId) {
                        this.webview.postMessage({
                            messageId: message.messageId,
                            messageType: message.messageType,
                            data: result
                        });
                    }
                } catch (error) {
                    console.error('SimpleWebviewProtocol: Error handling message', error);
                }
            }
        });
    }

    /**
     * Set the message handler
     */
    public setHandler(handler: (type: string, data: any) => Promise<any>): void {
        this.handler = handler;
    }

    /**
     * Send a message to the webview
     */
    public post(type: string, data: any): void {
        this.webview.postMessage({
            messageType: type,
            data
        });
    }
}