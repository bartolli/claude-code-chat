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
        const timestamp = new Date().toISOString();
        const messageId = Math.random().toString(36).substring(7);
        
        console.log(`[${timestamp}] SimpleWebviewProtocol: Preparing to send message`);
        console.log(`  - Type: ${type}`);
        console.log(`  - Message ID: ${messageId}`);
        console.log(`  - Data:`, JSON.stringify(data, null, 2));
        
        try {
            const message = {
                messageType: type,
                data,
                timestamp,
                messageId
            };
            
            console.log(`[${timestamp}] SimpleWebviewProtocol: Calling webview.postMessage`);
            const result = this.webview.postMessage(message);
            console.log(`[${timestamp}] SimpleWebviewProtocol: postMessage returned:`, result);
            
            // Log specific message types that are problematic
            if (type === 'message/add' || type === 'message/update') {
                console.log(`[${timestamp}] SimpleWebviewProtocol: CRITICAL - Sent ${type} message with ID ${messageId}`);
            }
        } catch (error) {
            console.error(`[${timestamp}] SimpleWebviewProtocol: ERROR sending message:`, error);
            console.error(`  - Error details:`, error);
        }
    }
}