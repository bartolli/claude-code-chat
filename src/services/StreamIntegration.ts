/**
 * Example integration showing how to use the new stream processing services
 * with the existing ClaudeChatProvider
 */

import { Readable } from 'stream';
import { StreamProcessor } from './StreamProcessor';
import { ProgressiveUIUpdater } from './ProgressiveUIUpdater';
import { ServiceContainer } from './ServiceContainer';
import { ClaudeStreamMessage } from '../types/claude';
import * as vscode from 'vscode';
import { getLogger } from '../core/Logger';

/**
 * Integration service for processing Claude streams with progressive UI updates.
 * Provides examples and utilities for stream handling in the Claude chat extension.
 */
export class StreamIntegration {
  private streamProcessor: StreamProcessor;
  private uiUpdater: ProgressiveUIUpdater;
  private logger = getLogger();

  /**
   * Creates a new StreamIntegration instance with required services
   */
  constructor() {
    const services = ServiceContainer.getInstance();
    this.streamProcessor = services.streamProcessor;
    this.uiUpdater = services.uiUpdater;
  }

  /**
   * Example: Process Claude stream with progressive UI updates
   * @param stream - The readable stream containing Claude's response
   * @param webviewPanel - The VS Code webview panel to update
   * @param messageId - Unique identifier for the message being processed
   */
  async processClaudeStreamWithUI(
    stream: Readable,
    webviewPanel: vscode.WebviewPanel,
    messageId: string
  ): Promise<void> {
    // Register webview for updates
    this.uiUpdater.registerWebview(webviewPanel);

    // Process the stream
    const streamChunks = this.streamProcessor.processClaudeStream(stream);

    let fullContent = '';

    for await (const chunk of streamChunks) {
      const message = chunk.data;

      switch (message.type) {
        case 'assistant':
          // Process each content item in the message
          if (Array.isArray(message.message.content)) {
            for (const content of message.message.content) {
              if (content.type === 'text' && content.text) {
                // Accumulate content
                fullContent += content.text;

                // Update UI progressively
                const textGen = this.createTextGenerator(content.text);
                for await (const _ of this.uiUpdater.processTextStream(messageId, textGen, {
                  animateTyping: true,
                  typingSpeed: 50,
                })) {
                  // Text is being animated
                }
              } else if (content.type === 'tool_use' && content.name) {
                // Handle tool usage
                await this.uiUpdater.processToolUsage(messageId, content.name, content.input);
              }
            }
          } else if (typeof message.message.content === 'string') {
            fullContent += message.message.content;
            const textGen = this.createTextGenerator(message.message.content);
            for await (const _ of this.uiUpdater.processTextStream(messageId, textGen, {
              animateTyping: true,
              typingSpeed: 50,
            })) {
              // Text is being animated
            }
          }
          break;

        case 'result':
          // Handle completion
          if (message.subtype === 'success') {
            // Final update - using public method instead
            await webviewPanel.webview.postMessage({
              type: 'messageComplete',
              data: {
                messageId,
                content: fullContent,
                tokens: {
                  input: message.usage?.input_tokens || 0,
                  output: message.usage?.output_tokens || 0,
                  thinking: 0, // Not available in new format
                },
                cost: message.total_cost_usd || 0,
              },
            });
          }
          break;

        case 'system':
          // Handle system messages
          if (message.subtype === 'init') {
            this.logger.info('StreamIntegration', 'Claude initialized', {
              model: message.model,
              sessionId: message.session_id,
              tools: message.tools,
            });
          }
          break;

        case 'user':
          // Handle user messages (tool results)
          for (const content of message.message.content) {
            this.logger.debug('StreamIntegration', 'Tool result', content);
          }
          break;
      }
    }
  }

  /**
   * Example: Batch process stream chunks
   * @param stream - The readable stream to process in batches
   */
  async processBatchedStream(stream: Readable): Promise<void> {
    const chunks = this.streamProcessor.processClaudeStream(stream);
    const batched = this.streamProcessor.batchStream(chunks, 5, 100);

    for await (const batch of batched) {
      this.logger.debug('StreamIntegration', `Processing batch of ${batch.data.length} messages`);
      // Process batch...
    }
  }

  /**
   * Example: Rate-limited stream processing
   * @param stream - The readable stream to process with rate limiting
   */
  async processRateLimitedStream(stream: Readable): Promise<void> {
    const chunks = this.streamProcessor.processClaudeStream(stream);
    const rateLimited = this.streamProcessor.rateLimitStream(chunks, 10); // 10 items/second

    for await (const _ of rateLimited) {
      // Process at controlled rate...
    }
  }

  /**
   * Helper to create text generator for progressive updates
   * @param text - The text content to yield as a stream chunk
   */
  private async *createTextGenerator(text: string): AsyncGenerator<StreamChunk<string>> {
    yield {
      data: text,
      raw: text,
      timestamp: Date.now(),
      isComplete: true,
    };
  }

  /**
   * Example: Integration with existing ClaudeChatProvider._sendMessageToClaude
   *
   * This shows how to refactor the existing stream handling:
   *
   * OLD:
   * ```typescript
   * claudeProcess.stdout.on('data', (data) => {
   *     rawOutput += data.toString();
   *     const lines = rawOutput.split('\n');
   *     // ... manual parsing
   * });
   * ```
   *
   * NEW:
   * ```typescript
   * const integration = new StreamIntegration();
   * await integration.processClaudeStreamWithUI(
   *     claudeProcess.stdout,
   *     this._panel,
   *     messageId
   * );
   * ```
   */
}

/**
 * Represents a chunk of data from a stream with metadata
 */
interface StreamChunk<T> {
  /**
   * The parsed data content of the chunk
   */
  data: T;
  /**
   * The raw string representation of the chunk
   */
  raw: string;
  /**
   * Timestamp when the chunk was received
   */
  timestamp: number;
  /**
   * Whether this chunk represents the complete data
   */
  isComplete: boolean;
}
