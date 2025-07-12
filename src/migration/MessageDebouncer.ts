import { Logger } from '../core/Logger';

/**
 * Configuration for message-specific debouncing behavior
 */
export interface DebounceConfig {
  /** Debounce delay in milliseconds */
  debounceMs: number;
  /** Whether messages can be batched together */
  batchable: boolean;
  /** Maximum batch size before forced flush */
  maxBatchSize?: number;
  /** Whether to preserve message order strictly */
  preserveOrder?: boolean;
}

/**
 * Buffered message waiting to be sent
 */
interface BufferedMessage {
  /** Message type */
  type: string;
  /** Message data payload */
  data: any;
  /** When the message was queued */
  timestamp: number;
  /** Optional callback for when message is sent */
  onSent?: () => void;
}

/**
 * Debouncer state for a specific message type
 */
interface DebouncerState {
  /** Timer for delayed sending */
  timer: NodeJS.Timeout | null;
  /** Buffer of messages waiting to be sent */
  buffer: BufferedMessage[];
  /** Timestamp of last sent message */
  lastSent: number;
  /** Configuration for this message type */
  config: DebounceConfig;
}

/**
 * Default debounce configurations for high-frequency message types
 */
export const DEFAULT_DEBOUNCE_CONFIG: Record<string, DebounceConfig> = {
  'message/thinking': {
    debounceMs: 100,
    batchable: true,
    maxBatchSize: 10,
    preserveOrder: true,
  },
  'message/tokenUsage': {
    debounceMs: 200,
    batchable: false,
  },
  'message/update': {
    debounceMs: 50,
    batchable: false,
  },
  'session/messageUpdated': {
    debounceMs: 50,
    batchable: false,
  },
};

/**
 * MessageDebouncer handles debouncing and batching of high-frequency messages
 * to improve performance during streaming and rapid updates.
 */
export class MessageDebouncer {
  private debouncers = new Map<string, DebouncerState>();
  private defaultConfig: DebounceConfig = {
    debounceMs: 100,
    batchable: false,
  };
  private messageConfigs: Record<string, DebounceConfig>;
  private sendHandler: (type: string, data: any) => void;
  private logger: Logger;
  private isShuttingDown = false;

  /**
   * Creates a new MessageDebouncer instance
   * @param sendHandler Function to call when messages are ready to send
   * @param logger Logger instance for debugging
   * @param customConfigs Optional custom debounce configurations
   */
  constructor(
    sendHandler: (type: string, data: any) => void,
    logger: Logger,
    customConfigs?: Record<string, DebounceConfig>
  ) {
    this.sendHandler = sendHandler;
    this.logger = logger;
    this.messageConfigs = { ...DEFAULT_DEBOUNCE_CONFIG, ...customConfigs };
  }

  /**
   * Queue a message for debounced sending
   * @param type Message type
   * @param data Message data
   * @param immediate Whether to bypass debouncing
   * @returns Promise that resolves when message is sent
   */
  async queueMessage(type: string, data: any, immediate = false): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('MessageDebouncer', 'Rejecting message during shutdown', { type });
      return;
    }

    // Get or create debouncer state for this message type
    const config = this.messageConfigs[type] || this.defaultConfig;
    
    // Immediate messages bypass debouncing
    if (immediate || config.debounceMs === 0) {
      this.sendHandler(type, data);
      return;
    }

    return new Promise<void>((resolve) => {
      const message: BufferedMessage = {
        type,
        data,
        timestamp: Date.now(),
        onSent: resolve,
      };

      if (!this.debouncers.has(type)) {
        this.debouncers.set(type, {
          timer: null,
          buffer: [],
          lastSent: 0,
          config,
        });
      }

      const debouncer = this.debouncers.get(type)!;
      debouncer.buffer.push(message);

      // Check if we should flush immediately due to batch size
      if (config.batchable && config.maxBatchSize && debouncer.buffer.length >= config.maxBatchSize) {
        this.flushType(type);
        return;
      }

      // Reset the timer
      if (debouncer.timer) {
        clearTimeout(debouncer.timer);
      }

      // Set new timer
      debouncer.timer = setTimeout(() => {
        this.flushType(type);
      }, config.debounceMs);
    });
  }

  /**
   * Flush all messages for a specific type
   * @param type Message type to flush
   */
  private flushType(type: string): void {
    const debouncer = this.debouncers.get(type);
    if (!debouncer || debouncer.buffer.length === 0) {
      return;
    }

    // Clear timer
    if (debouncer.timer) {
      clearTimeout(debouncer.timer);
      debouncer.timer = null;
    }

    const messages = [...debouncer.buffer];
    debouncer.buffer = [];
    debouncer.lastSent = Date.now();

    try {
      if (debouncer.config.batchable && messages.length > 1) {
        // For batchable messages, combine the data
        this.sendBatchedMessages(type, messages);
      } else {
        // For non-batchable messages, send individually
        messages.forEach((msg) => {
          this.sendHandler(msg.type, msg.data);
          msg.onSent?.();
        });
      }

      this.logger.debug('MessageDebouncer', `Flushed ${messages.length} ${type} messages`);
    } catch (error) {
      this.logger.error('MessageDebouncer', `Error flushing ${type} messages`, error as Error);
      // Still resolve promises to avoid hanging
      messages.forEach((msg) => msg.onSent?.());
    }
  }

  /**
   * Send batched messages as a single combined message
   * @param type Message type
   * @param messages Array of buffered messages to batch
   */
  private sendBatchedMessages(type: string, messages: BufferedMessage[]): void {
    // Special handling for different message types
    switch (type) {
      case 'message/thinking': {
        // Combine thinking content
        const combinedContent = messages
          .map((msg) => msg.data.content || '')
          .filter((content) => content)
          .join('');
        
        if (combinedContent) {
          // Use the latest message's metadata but combined content
          const latestMsg = messages[messages.length - 1];
          this.sendHandler(type, {
            ...latestMsg.data,
            content: combinedContent,
            isBatched: true,
            batchCount: messages.length,
          });
        }
        break;
      }

      default: {
        // Generic batching - send as array
        const batchData = messages.map((msg) => msg.data);
        this.sendHandler(`${type}/batch`, {
          messages: batchData,
          batchCount: messages.length,
          startTime: messages[0].timestamp,
          endTime: messages[messages.length - 1].timestamp,
        });
      }
    }

    // Notify all messages that they've been sent
    messages.forEach((msg) => msg.onSent?.());
  }

  /**
   * Flush all pending messages immediately
   */
  flushAll(): void {
    const types = Array.from(this.debouncers.keys());
    types.forEach((type) => this.flushType(type));
  }

  /**
   * Flush pending messages for specific types
   * @param types Array of message types to flush
   */
  flushTypes(types: string[]): void {
    types.forEach((type) => this.flushType(type));
  }

  /**
   * Clear all pending messages without sending
   */
  clear(): void {
    this.debouncers.forEach((debouncer) => {
      if (debouncer.timer) {
        clearTimeout(debouncer.timer);
      }
      // Resolve all pending promises
      debouncer.buffer.forEach((msg) => msg.onSent?.());
      debouncer.buffer = [];
    });
    this.debouncers.clear();
  }

  /**
   * Shutdown the debouncer, flushing all pending messages
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.flushAll();
    this.clear();
  }

  /**
   * Get statistics about pending messages
   */
  getStats(): {
    pendingTypes: string[];
    totalPending: number;
    typeStats: Record<string, { pending: number; lastSent: number }>;
  } {
    const pendingTypes: string[] = [];
    let totalPending = 0;
    const typeStats: Record<string, { pending: number; lastSent: number }> = {};

    this.debouncers.forEach((debouncer, type) => {
      const pending = debouncer.buffer.length;
      if (pending > 0) {
        pendingTypes.push(type);
        totalPending += pending;
      }
      typeStats[type] = {
        pending,
        lastSent: debouncer.lastSent,
      };
    });

    return { pendingTypes, totalPending, typeStats };
  }

  /**
   * Update configuration for a message type
   * @param type Message type
   * @param config New configuration
   */
  updateConfig(type: string, config: Partial<DebounceConfig>): void {
    const existing = this.messageConfigs[type] || this.defaultConfig;
    this.messageConfigs[type] = { ...existing, ...config };
    
    // Update existing debouncer if present
    const debouncer = this.debouncers.get(type);
    if (debouncer) {
      debouncer.config = this.messageConfigs[type];
    }
  }

  /**
   * Check if a message type should be debounced
   * @param type Message type to check
   * @returns Whether the message type has debouncing configured
   */
  shouldDebounce(type: string): boolean {
    const config = this.messageConfigs[type];
    return config ? config.debounceMs > 0 : false;
  }
}