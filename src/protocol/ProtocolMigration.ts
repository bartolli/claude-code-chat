/**
 * Migration guide from old message style to new protocol system
 */

import * as vscode from 'vscode';
import { WebviewProtocol } from './WebviewProtocol';
import { FromWebviewProtocol } from './types';
import { createLogger, ExampleLogger } from './logger-factory';

/**
 * Provides migration guidance from old message style to new protocol
 */
export class ProtocolMigration {
  /**
   * Example: Migrating extension.ts to use WebviewProtocol
   */

  /**
   * OLD: Direct postMessage calls
   * @param panel - The VS Code webview panel to communicate with
   * @deprecated Use newStyle() instead
   */
  oldStyle(panel: vscode.WebviewPanel) {
    // Sending messages
    panel.webview.postMessage({
      type: 'output',
      data: 'Hello from Claude!',
    });

    panel.webview.postMessage({
      type: 'updateTokens',
      data: {
        totalTokensInput: 100,
        totalTokensOutput: 200,
        currentInputTokens: 10,
        currentOutputTokens: 20,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    });

    // Receiving messages
    panel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'sendMessage':
          // Example: In real code, use proper logging
          // const logger = createLogger('ProtocolMigration');
          // logger.info(`Text: ${message.text}`);
          // logger.info(`Plan mode: ${message.planMode}`);
          break;
        case 'getWorkspaceFiles':
          // Handle and respond
          panel.webview.postMessage({
            type: 'workspaceFiles',
            data: [{ relativePath: 'file.ts', isDirectory: false }],
          });
          break;
      }
    });
  }

  /**
   * NEW: Using WebviewProtocol
   * Demonstrates the modern approach with type safety
   * @param protocol - The WebviewProtocol instance for type-safe communication
   * @param panel - The VS Code webview panel to attach the protocol to
   */
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
      cacheReadTokens: 0,
    });

    // Register handlers - type safe!
    protocol.on('chat/sendMessage', async (data) => {
      // Example: In real code, use proper logging
      const logger = createLogger('ProtocolMigration');
      logger.info(`Text: ${data.text}`);
      logger.info(`Plan mode: ${data.planMode}`);
      logger.info(`Thinking mode: ${data.thinkingMode}`);
      // Handler automatically responds
    });

    protocol.on('file/getWorkspaceFiles', async (_data) => {
      // Type-safe response
      return [
        {
          relativePath: 'file.ts',
          isDirectory: false,
        },
      ];
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

  /**
   * OLD: Direct vscode.postMessage
   * @deprecated Use newWebviewStyle() instead
   */
  oldWebviewStyle() {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // Sending
    vscode.postMessage({
      type: 'sendMessage',
      text: 'Hello',
      planMode: false,
      thinkingMode: true,
    });

    // Receiving
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        const message = event.data;
        switch (message.type) {
          case 'output':
            // Example: would log 'Received:' with message.data
            break;
        }
      });
    }
  }

  /**
   * NEW: Using IdeMessenger
   * Demonstrates the modern webview communication approach
   */
  async newWebviewStyle() {
    const { IdeMessenger } = await import('./IdeMessenger.js');
    const messenger = new IdeMessenger();

    // Sending - type safe!
    messenger.post('chat/sendMessage', {
      text: 'Hello',
      planMode: false,
      thinkingMode: true,
    });

    // Request/response pattern
    try {
      const files = await messenger.request('file/getWorkspaceFiles', {
        searchTerm: 'test',
      });
      // Example: would log 'Files:' with files array
    } catch (error) {
      // Example: would log error 'Request failed:' with error details
    }

    // Receiving with handlers
    messenger.on('content/output', (_data) => {
      // Example: would log 'Received:' with data
    });

    // Streaming
    const generator = messenger.streamRequest('chat/sendMessage', {
      text: 'Stream this',
      planMode: false,
      thinkingMode: false,
    });

    for await (const chunk of generator) {
      // Example: would log 'Stream chunk:' with chunk data
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
