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

export class StreamIntegration {
    private streamProcessor: StreamProcessor;
    private uiUpdater: ProgressiveUIUpdater;

    constructor() {
        const services = ServiceContainer.getInstance();
        this.streamProcessor = services.streamProcessor;
        this.uiUpdater = services.uiUpdater;
    }

    /**
     * Example: Process Claude stream with progressive UI updates
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
                                for await (const textChunk of this.uiUpdater.processTextStream(
                                    messageId,
                                    textGen,
                                    { animateTyping: true, typingSpeed: 50 }
                                )) {
                                    // Text is being animated
                                }
                            } else if (content.type === 'tool_use' && content.name) {
                                // Handle tool usage
                                await this.uiUpdater.processToolUsage(
                                    messageId,
                                    content.name,
                                    content.input
                                );
                            }
                        }
                    } else if (typeof message.message.content === 'string') {
                        fullContent += message.message.content;
                        const textGen = this.createTextGenerator(message.message.content);
                        for await (const textChunk of this.uiUpdater.processTextStream(
                            messageId,
                            textGen,
                            { animateTyping: true, typingSpeed: 50 }
                        )) {
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
                                    thinking: 0 // Not available in new format
                                },
                                cost: message.total_cost_usd || 0
                            }
                        });
                    }
                    break;
                    
                case 'system':
                    // Handle system messages
                    if (message.subtype === 'init') {
                        console.log('Claude initialized:', {
                            model: message.model,
                            sessionId: message.session_id,
                            tools: message.tools
                        });
                    }
                    break;
                    
                case 'user':
                    // Handle user messages (tool results)
                    for (const content of message.message.content) {
                        console.log('Tool result:', content);
                    }
                    break;
            }
        }
    }

    /**
     * Example: Batch process stream chunks
     */
    async processBatchedStream(stream: Readable): Promise<void> {
        const chunks = this.streamProcessor.processClaudeStream(stream);
        const batched = this.streamProcessor.batchStream(chunks, 5, 100);
        
        for await (const batch of batched) {
            console.log(`Processing batch of ${batch.data.length} messages`);
            // Process batch...
        }
    }

    /**
     * Example: Rate-limited stream processing
     */
    async processRateLimitedStream(stream: Readable): Promise<void> {
        const chunks = this.streamProcessor.processClaudeStream(stream);
        const rateLimited = this.streamProcessor.rateLimitStream(chunks, 10); // 10 items/second
        
        for await (const chunk of rateLimited) {
            // Process at controlled rate...
        }
    }

    /**
     * Helper to create text generator for progressive updates
     */
    private async *createTextGenerator(text: string): AsyncGenerator<StreamChunk<string>> {
        yield {
            data: text,
            raw: text,
            timestamp: Date.now(),
            isComplete: true
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

// Type for stream chunks
interface StreamChunk<T> {
    data: T;
    raw: string;
    timestamp: number;
    isComplete: boolean;
}