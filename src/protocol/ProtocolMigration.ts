/**
 * Migration guide from old message style to new protocol
 */

import * as vscode from 'vscode';
import { WebviewProtocol } from './WebviewProtocol';
import { FromWebviewProtocol } from './types';

export class ProtocolMigration {
    /**
     * Example: Migrating extension.ts to use WebviewProtocol
     */
    
    // OLD: Direct postMessage calls
    oldStyle(panel: vscode.WebviewPanel) {
        // Sending messages
        panel.webview.postMessage({
            type: 'output',
            data: 'Hello from Claude!'
        });

        panel.webview.postMessage({
            type: 'updateTokens',
            data: {
                totalTokensInput: 100,
                totalTokensOutput: 200,
                currentInputTokens: 10,
                currentOutputTokens: 20,
                cacheCreationTokens: 0,
                cacheReadTokens: 0
            }
        });

        // Receiving messages
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'sendMessage':
                        console.log('Text:', message.text);
                        console.log('Plan mode:', message.planMode);
                        break;
                    case 'getWorkspaceFiles':
                        // Handle and respond
                        panel.webview.postMessage({
                            type: 'workspaceFiles',
                            data: [{ relativePath: 'file.ts', isDirectory: false }]
                        });
                        break;
                }
            }
        );
    }

    // NEW: Using WebviewProtocol
    newStyle(protocol: WebviewProtocol, panel: vscode.WebviewPanel) {
        // Attach protocol to panel
        protocol.attach(panel);

        // Sending messages - type safe!
        protocol.post('content/output', 'Hello from Claude!');

        protocol.post('tokens/update', {
            totalTokensInput: 100,
            totalTokensOutput: 200,
            currentInputTokens: 10,
            currentOutputTokens: 20,
            cacheCreationTokens: 0,
            cacheReadTokens: 0
        });

        // Register handlers - type safe!
        protocol.on('chat/sendMessage', async (data) => {
            console.log('Text:', data.text);
            console.log('Plan mode:', data.planMode);
            console.log('Thinking mode:', data.thinkingMode);
            // Handler automatically responds
        });

        protocol.on('file/getWorkspaceFiles', async (_data) => {
            // Type-safe response
            return [{
                relativePath: 'file.ts',
                isDirectory: false
            }];
        });

        // Stream example
        protocol.onStream('chat/sendMessage', async function* (_data) {
            // Stream responses back
            yield; // First chunk
            yield; // Second chunk
            // Automatically handles completion
        });
    }

    /**
     * Example: Migrating webview code to use IdeMessenger
     */

    // OLD: Direct vscode.postMessage
    oldWebviewStyle() {
        // @ts-ignore
        const vscode = acquireVsCodeApi();

        // Sending
        vscode.postMessage({
            type: 'sendMessage',
            text: 'Hello',
            planMode: false,
            thinkingMode: true
        });

        // Receiving
        if (typeof window !== 'undefined') {
            window.addEventListener('message', (event: MessageEvent) => {
                const message = event.data;
                switch (message.type) {
                    case 'output':
                        console.log('Received:', message.data);
                        break;
                }
            });
        }
    }

    // NEW: Using IdeMessenger
    async newWebviewStyle() {
        const { IdeMessenger } = await import('./IdeMessenger.js');
        const messenger = new IdeMessenger();

        // Sending - type safe!
        messenger.post('chat/sendMessage', {
            text: 'Hello',
            planMode: false,
            thinkingMode: true
        });

        // Request/response pattern
        try {
            const files = await messenger.request('file/getWorkspaceFiles', {
                searchTerm: 'test'
            });
            console.log('Files:', files);
        } catch (error) {
            console.error('Request failed:', error);
        }

        // Receiving with handlers
        messenger.on('content/output', (data) => {
            console.log('Received:', data);
        });

        // Streaming
        const generator = messenger.streamRequest('chat/sendMessage', {
            text: 'Stream this',
            planMode: false,
            thinkingMode: false
        });

        for await (const chunk of generator) {
            console.log('Stream chunk:', chunk);
        }
    }

    /**
     * Benefits of the new protocol:
     * 
     * 1. Type Safety - All messages are typed
     * 2. Request/Response - Built-in async patterns
     * 3. Streaming - First-class support
     * 4. Error Handling - Automatic error responses
     * 5. Compatibility - Works with existing GUI components
     * 6. Migration Path - Use postLegacy() for gradual migration
     */
}