import * as vscode from 'vscode';
import { Logger } from '../core/Logger';
import { StreamChunk } from './StreamProcessor';

export interface UIUpdateOptions {
    updateInterval?: number;
    batchSize?: number;
    animateTyping?: boolean;
    typingSpeed?: number;
}

export interface MessageUpdate {
    messageId: string;
    content: string;
    isComplete: boolean;
    timestamp: number;
}

export interface UIElement {
    id: string;
    type: 'text' | 'code' | 'tool' | 'thinking';
    content: string;
    metadata?: Record<string, any>;
}

export class ProgressiveUIUpdater {
    private readonly logger: Logger;
    private readonly defaultOptions: Required<UIUpdateOptions> = {
        updateInterval: 16, // ~60fps
        batchSize: 10,
        animateTyping: true,
        typingSpeed: 30 // characters per second
    };
    
    private pendingUpdates = new Map<string, MessageUpdate[]>();
    private updateTimers = new Map<string, NodeJS.Timer>();
    private webviewPanels = new Set<vscode.WebviewPanel>();

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Register a webview panel for updates
     */
    registerWebview(panel: vscode.WebviewPanel): void {
        this.webviewPanels.add(panel);
        
        panel.onDidDispose(() => {
            this.webviewPanels.delete(panel);
            this.logger.debug('ProgressiveUIUpdater', 'Webview panel disposed', { panelCount: this.webviewPanels.size });
        });
    }

    /**
     * Process streaming text updates progressively
     */
    async *processTextStream(
        messageId: string,
        textGenerator: AsyncGenerator<StreamChunk<string>>,
        options?: UIUpdateOptions
    ): AsyncGenerator<MessageUpdate> {
        const opts = { ...this.defaultOptions, ...options };
        let accumulatedText = '';
        let lastUpdate = Date.now();

        for await (const chunk of textGenerator) {
            accumulatedText += chunk.data;
            
            const now = Date.now();
            const shouldUpdate = 
                chunk.isComplete || 
                now - lastUpdate >= opts.updateInterval ||
                accumulatedText.length % opts.batchSize === 0;

            if (shouldUpdate) {
                const update: MessageUpdate = {
                    messageId,
                    content: accumulatedText,
                    isComplete: chunk.isComplete,
                    timestamp: now
                };

                yield update;
                this.scheduleUIUpdate(update, opts);
                lastUpdate = now;
            }
        }

        // Final update
        if (accumulatedText) {
            const finalUpdate: MessageUpdate = {
                messageId,
                content: accumulatedText,
                isComplete: true,
                timestamp: Date.now()
            };
            
            yield finalUpdate;
            this.scheduleUIUpdate(finalUpdate, opts);
        }
    }

    /**
     * Animate text typing effect
     */
    async *animateText(
        text: string,
        options?: UIUpdateOptions
    ): AsyncGenerator<string> {
        const opts = { ...this.defaultOptions, ...options };
        
        if (!opts.animateTyping) {
            yield text;
            return;
        }

        const charsPerUpdate = Math.max(1, Math.floor(opts.typingSpeed * opts.updateInterval / 1000));
        
        for (let i = 0; i < text.length; i += charsPerUpdate) {
            yield text.substring(0, i + charsPerUpdate);
            await this.delay(opts.updateInterval);
        }
        
        yield text; // Ensure complete text is yielded
    }

    /**
     * Process code blocks with syntax highlighting
     */
    async processCodeBlock(
        messageId: string,
        language: string,
        code: string,
        _options?: UIUpdateOptions
    ): Promise<void> {
        const element: UIElement = {
            id: `${messageId}-code-${Date.now()}`,
            type: 'code',
            content: code,
            metadata: { language }
        };

        await this.updateWebviews({
            type: 'updateElement',
            data: element
        });
    }

    /**
     * Process tool usage visualization
     */
    async processToolUsage(
        messageId: string,
        toolName: string,
        toolInput: any,
        toolOutput?: any
    ): Promise<void> {
        const element: UIElement = {
            id: `${messageId}-tool-${Date.now()}`,
            type: 'tool',
            content: toolName,
            metadata: {
                input: toolInput,
                output: toolOutput,
                status: toolOutput ? 'complete' : 'running'
            }
        };

        await this.updateWebviews({
            type: 'updateElement',
            data: element
        });
    }

    /**
     * Process thinking/reasoning sections
     */
    async processThinking(
        messageId: string,
        content: string,
        isComplete: boolean
    ): Promise<void> {
        const element: UIElement = {
            id: `${messageId}-thinking-${Date.now()}`,
            type: 'thinking',
            content,
            metadata: { isComplete }
        };

        await this.updateWebviews({
            type: 'updateElement',
            data: element
        });
    }

    /**
     * Batch updates for efficiency
     */
    batchUpdates(messageId: string, updates: MessageUpdate[]): void {
        const existing = this.pendingUpdates.get(messageId) || [];
        this.pendingUpdates.set(messageId, [...existing, ...updates]);
        
        // Schedule batch processing
        if (!this.updateTimers.has(messageId)) {
            const timer = setTimeout(() => {
                this.processPendingUpdates(messageId);
                this.updateTimers.delete(messageId);
            }, this.defaultOptions.updateInterval);
            
            this.updateTimers.set(messageId, timer);
        }
    }

    /**
     * Create a progress indicator
     */
    async showProgress(
        title: string,
        cancellable: boolean = false
    ): Promise<vscode.Progress<{ message?: string; increment?: number }>> {
        return new Promise((resolve) => {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title,
                    cancellable
                },
                async (progress) => {
                    resolve(progress);
                    // Keep progress open until manually closed
                    return new Promise(() => {});
                }
            );
        });
    }

    /**
     * Update all registered webviews
     */
    private async updateWebviews(message: any): Promise<void> {
        const promises = Array.from(this.webviewPanels).map(panel => {
            if (panel.visible) {
                return panel.webview.postMessage(message).then(
                    () => true,
                    (error) => {
                        this.logger.warn('ProgressiveUIUpdater', 'Failed to update webview', { error });
                        return false;
                    }
                );
            }
            return Promise.resolve(false);
        });

        await Promise.all(promises);
    }

    /**
     * Schedule a UI update
     */
    private scheduleUIUpdate(update: MessageUpdate, options: Required<UIUpdateOptions>): void {
        if (options.animateTyping && !update.isComplete) {
            // For animated typing, update immediately
            this.updateWebviews({
                type: 'progressiveUpdate',
                data: update
            });
        } else {
            // Batch non-animated updates
            this.batchUpdates(update.messageId, [update]);
        }
    }

    /**
     * Process pending updates for a message
     */
    private processPendingUpdates(messageId: string): void {
        const updates = this.pendingUpdates.get(messageId);
        if (!updates || updates.length === 0) {return;}

        // Get the latest update
        const latestUpdate = updates[updates.length - 1];
        
        this.updateWebviews({
            type: 'batchUpdate',
            data: {
                messageId,
                updates: updates,
                final: latestUpdate
            }
        });

        this.pendingUpdates.delete(messageId);
    }

    /**
     * Clear all pending updates
     */
    clearPendingUpdates(): void {
        // Clear all timers
        for (const timer of this.updateTimers.values()) {
            clearTimeout(timer as any);
        }
        
        this.updateTimers.clear();
        this.pendingUpdates.clear();
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format content for display
     */
    formatContent(content: string, type: 'markdown' | 'code' | 'plain' = 'plain'): string {
        switch (type) {
            case 'markdown':
                // Basic markdown formatting
                return content
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');
            
            case 'code':
                return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
            
            case 'plain':
            default:
                return this.escapeHtml(content).replace(/\n/g, '<br>');
        }
    }

    /**
     * Escape HTML entities
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}