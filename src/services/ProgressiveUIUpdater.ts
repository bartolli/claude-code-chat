import * as vscode from 'vscode';
import { Logger } from '../core/Logger';
import { StreamChunk } from './StreamProcessor';

/**
 * Configuration options for progressive UI updates
 */
export interface UIUpdateOptions {
  /**
   * Interval between UI updates in milliseconds
   * @default 16 (~60fps)
   */
  updateInterval?: number;
  /**
   * Number of updates to batch together before rendering
   * @default 10
   */
  batchSize?: number;
  /**
   * Whether to animate text typing effect
   * @default true
   */
  animateTyping?: boolean;
  /**
   * Typing animation speed in characters per second
   * @default 30
   */
  typingSpeed?: number;
}

/**
 * Represents a progressive update to a message in the UI
 */
export interface MessageUpdate {
  /**
   * Unique identifier for the message being updated
   */
  messageId: string;
  /**
   * Current accumulated content of the message
   */
  content: string;
  /**
   * Whether this update represents the final state of the message
   */
  isComplete: boolean;
  /**
   * Unix timestamp of when this update was created
   */
  timestamp: number;
}

/**
 * Represents a UI element that can be rendered in the webview
 */
export interface UIElement {
  /**
   * Unique identifier for this UI element
   */
  id: string;
  /**
   * Type of UI element determining how it should be rendered
   */
  type: 'text' | 'code' | 'tool' | 'thinking';
  /**
   * Main content of the UI element
   */
  content: string;
  /**
   * Additional metadata specific to the element type
   * @example For 'code' type: { language: 'javascript' }
   * @example For 'tool' type: { input: {}, output: {}, status: 'running' }
   */
  metadata?: Record<string, any>;
}

/**
 * Handles progressive updates to the UI for streaming content
 * Supports text animation, batching, and efficient webview updates
 */
export class ProgressiveUIUpdater {
  /**
   * Logger instance for debugging
   */
  private readonly logger: Logger;
  /**
   * Default options for UI updates with optimal performance settings
   */
  private readonly defaultOptions: Required<UIUpdateOptions> = {
    updateInterval: 16, // ~60fps
    batchSize: 10,
    animateTyping: true,
    typingSpeed: 30, // characters per second
  };

  /**
   * Map of message IDs to their pending updates for batching
   */
  private pendingUpdates = new Map<string, MessageUpdate[]>();
  /**
   * Timers for scheduled batch update processing
   */
  private updateTimers = new Map<string, NodeJS.Timeout>();
  /**
   * Set of registered webview panels to update
   */
  private webviewPanels = new Set<vscode.WebviewPanel>();

  /**
   * Creates a new ProgressiveUIUpdater instance
   * @param logger - Logger instance for debugging and error tracking
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a webview panel for updates
   * @param panel - VS Code webview panel to receive UI updates
   */
  registerWebview(panel: vscode.WebviewPanel): void {
    this.webviewPanels.add(panel);

    panel.onDidDispose(() => {
      this.webviewPanels.delete(panel);
      this.logger.debug('ProgressiveUIUpdater', 'Webview panel disposed', {
        panelCount: this.webviewPanels.size,
      });
    });
  }

  /**
   * Process streaming text updates progressively
   * @param messageId - Unique identifier for the message being updated
   * @param textGenerator - Async generator yielding text chunks
   * @param options - Optional UI update configuration
   * @yields {MessageUpdate} Progressive updates for the UI
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
          timestamp: now,
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
        timestamp: Date.now(),
      };

      yield finalUpdate;
      this.scheduleUIUpdate(finalUpdate, opts);
    }
  }

  /**
   * Animate text typing effect
   * @param text - Full text to animate
   * @param options - Optional UI update configuration
   * @yields {string} Progressive text segments for typing animation
   */
  async *animateText(text: string, options?: UIUpdateOptions): AsyncGenerator<string> {
    const opts = { ...this.defaultOptions, ...options };

    if (!opts.animateTyping) {
      yield text;
      return;
    }

    const charsPerUpdate = Math.max(1, Math.floor((opts.typingSpeed * opts.updateInterval) / 1000));

    for (let i = 0; i < text.length; i += charsPerUpdate) {
      yield text.substring(0, i + charsPerUpdate);
      await this.delay(opts.updateInterval);
    }

    yield text; // Ensure complete text is yielded
  }

  /**
   * Process code blocks with syntax highlighting
   * @param messageId - Unique identifier for the parent message
   * @param language - Programming language for syntax highlighting
   * @param code - Code content to display
   * @param _options - Optional UI update configuration (currently unused)
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
      metadata: { language },
    };

    await this.updateWebviews({
      type: 'updateElement',
      data: element,
    });
  }

  /**
   * Process tool usage visualization
   * @param messageId - Unique identifier for the parent message
   * @param toolName - Name of the tool being used
   * @param toolInput - Input parameters passed to the tool
   * @param toolOutput - Optional output from the tool execution
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
        status: toolOutput ? 'complete' : 'running',
      },
    };

    await this.updateWebviews({
      type: 'updateElement',
      data: element,
    });
  }

  /**
   * Process thinking/reasoning sections
   * @param messageId - Unique identifier for the parent message
   * @param content - Thinking/reasoning content to display
   * @param isComplete - Whether the thinking process is complete
   */
  async processThinking(messageId: string, content: string, isComplete: boolean): Promise<void> {
    const element: UIElement = {
      id: `${messageId}-thinking-${Date.now()}`,
      type: 'thinking',
      content,
      metadata: { isComplete },
    };

    await this.updateWebviews({
      type: 'updateElement',
      data: element,
    });
  }

  /**
   * Batch updates for efficiency
   * @param messageId - Unique identifier for the message
   * @param updates - Array of updates to batch together
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
   * @param title - Title text for the progress notification
   * @param cancellable - Whether the progress can be cancelled by the user
   * @returns Promise resolving to a Progress object for updating the indicator
   */
  async showProgress(
    title: string,
    cancellable: boolean = false
  ): Promise<
    vscode.Progress<{
      /** Optional message to display in the progress indicator */
      message?: string;
      /** Optional increment value for the progress bar */
      increment?: number;
    }>
  > {
    return new Promise((resolve) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title,
          cancellable,
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
   * @param message - Message object to send to all webviews
   */
  private async updateWebviews(message: any): Promise<void> {
    const promises = Array.from(this.webviewPanels).map((panel) => {
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
   * @param update - Message update to schedule
   * @param options - UI update configuration with all defaults applied
   */
  private scheduleUIUpdate(update: MessageUpdate, options: Required<UIUpdateOptions>): void {
    if (options.animateTyping && !update.isComplete) {
      // For animated typing, update immediately
      this.updateWebviews({
        type: 'progressiveUpdate',
        data: update,
      });
    } else {
      // Batch non-animated updates
      this.batchUpdates(update.messageId, [update]);
    }
  }

  /**
   * Process pending updates for a message
   * @param messageId - Unique identifier for the message to process updates for
   */
  private processPendingUpdates(messageId: string): void {
    const updates = this.pendingUpdates.get(messageId);
    if (!updates || updates.length === 0) {
      return;
    }

    // Get the latest update
    const latestUpdate = updates[updates.length - 1];

    this.updateWebviews({
      type: 'batchUpdate',
      data: {
        messageId,
        updates: updates,
        final: latestUpdate,
      },
    });

    this.pendingUpdates.delete(messageId);
  }

  /**
   * Clear all pending updates and cancel all scheduled timers
   */
  clearPendingUpdates(): void {
    // Clear all timers
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }

    this.updateTimers.clear();
    this.pendingUpdates.clear();
  }

  /**
   * Utility delay function
   * @param ms - Number of milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format content for display
   * @param content - Raw content to format
   * @param type - Type of formatting to apply
   * @returns HTML-formatted content ready for display
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
   * @param text - Raw text containing potential HTML entities
   * @returns Text with HTML entities properly escaped
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
