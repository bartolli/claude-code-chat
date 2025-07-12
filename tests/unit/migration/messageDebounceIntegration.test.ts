import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageDebouncer } from '../../../src/migration/MessageDebouncer';
import { StateSynchronizer } from '../../../src/migration/StateSynchronizer';
import { Logger } from '../../../src/core/Logger';

// Mock logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
} as any);

describe('MessageDebouncer Integration', () => {
  let mockLogger: Logger;
  let synchronizer: StateSynchronizer;
  let debouncer: MessageDebouncer;
  let sentMessages: Array<{ type: string; data: any; timestamp: number }>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = createMockLogger();
    synchronizer = new StateSynchronizer(mockLogger);
    sentMessages = [];

    // Create debouncer with capture handler
    debouncer = new MessageDebouncer(
      (type: string, data: any) => {
        sentMessages.push({ type, data, timestamp: Date.now() });
      },
      mockLogger
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    sentMessages = [];
  });

  describe('Streaming optimization', () => {
    it('should batch multiple thinking updates during streaming', async () => {
      // Simulate rapid thinking updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          debouncer.queueMessage('message/thinking', {
            content: `Line ${i}\n`,
            messageId: 'msg123',
            isActive: true,
            isIncremental: true,
          })
        );
        // Small delay between updates to simulate streaming
        vi.advanceTimersByTime(10);
      }

      // Wait for debounce
      vi.advanceTimersByTime(100);
      await Promise.all(promises);

      // Should batch all updates into one
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].type).toBe('message/thinking');
      expect(sentMessages[0].data.isBatched).toBe(true);
      expect(sentMessages[0].data.batchCount).toBe(10);
      expect(sentMessages[0].data.content).toContain('Line 0');
      expect(sentMessages[0].data.content).toContain('Line 9');
    });

    it('should flush thinking updates when streaming completes', async () => {
      // Queue some thinking updates
      debouncer.queueMessage('message/thinking', {
        content: 'Partial update',
        messageId: 'msg123',
        isActive: true,
      });

      // Simulate completion by flushing
      debouncer.flushTypes(['message/thinking']);

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].data.content).toBe('Partial update');
    });

    it('should handle mixed message types during streaming', async () => {
      // Queue different message types
      const promises = [
        debouncer.queueMessage('message/thinking', {
          content: 'Thinking...',
          messageId: 'msg123',
        }),
        debouncer.queueMessage('message/tokenUsage', {
          inputTokens: 100,
          outputTokens: 50,
        }),
        debouncer.queueMessage('message/update', {
          content: 'Updated content',
          messageId: 'msg123',
        }),
      ];

      // Advance timers for each message type's debounce
      vi.advanceTimersByTime(50); // message/update fires
      vi.advanceTimersByTime(50); // message/thinking fires
      vi.advanceTimersByTime(100); // message/tokenUsage fires

      await Promise.all(promises);

      // Each message type should be sent separately
      expect(sentMessages).toHaveLength(3);
      
      // Verify order based on debounce timings
      const updateMsg = sentMessages.find(m => m.type === 'message/update');
      const thinkingMsg = sentMessages.find(m => m.type === 'message/thinking');
      const tokenMsg = sentMessages.find(m => m.type === 'message/tokenUsage');

      expect(updateMsg).toBeDefined();
      expect(thinkingMsg).toBeDefined();
      expect(tokenMsg).toBeDefined();
    });
  });

  describe('Loop prevention integration', () => {
    it('should respect synchronizer blocking during debouncing', async () => {
      // Create debouncer with synchronizer-aware handler
      const syncAwareDebouncer = new MessageDebouncer(
        (type: string, data: any) => {
          const context = synchronizer.beginSyncToWebview(type, { source: 'redux' }, data);
          if (context) {
            sentMessages.push({ type, data, timestamp: Date.now() });
            synchronizer.completeSyncToWebview(context);
          }
        },
        mockLogger
      );

      // Send same content rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          syncAwareDebouncer.queueMessage('message/update', {
            content: 'Same content',
            messageId: 'msg123',
          })
        );
      }

      vi.advanceTimersByTime(50);
      await Promise.all(promises);

      // Only first message should go through due to duplicate detection
      expect(sentMessages).toHaveLength(1);
    });
  });

  describe('Performance scenarios', () => {
    it('should handle high-frequency updates without memory issues', async () => {
      const startHeap = process.memoryUsage().heapUsed;
      
      // Queue 100 messages rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          debouncer.queueMessage('message/thinking', {
            content: `Update ${i}`,
            messageId: 'msg123',
          })
        );
      }

      // Should batch due to maxBatchSize (10)
      await Promise.all(promises);

      const endHeap = process.memoryUsage().heapUsed;
      const heapGrowth = endHeap - startHeap;

      // With maxBatchSize of 10, we should have approximately 10 batches
      expect(sentMessages.length).toBe(10);
      
      // Each batch should contain 10 messages
      expect(sentMessages[0].data.batchCount).toBe(10);
      
      // Verify memory didn't grow excessively (< 10MB)
      expect(heapGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should maintain message order within batches', async () => {
      const messages = [];
      for (let i = 0; i < 5; i++) {
        messages.push({
          content: `Part ${i}`,
          order: i,
        });
      }

      // Queue messages
      const promises = messages.map(msg =>
        debouncer.queueMessage('message/thinking', msg)
      );

      vi.advanceTimersByTime(100);
      await Promise.all(promises);

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].data.content).toBe('Part 0Part 1Part 2Part 3Part 4');
    });
  });

  describe('Error recovery', () => {
    it('should continue processing after send errors', async () => {
      let errorCount = 0;
      const errorDebouncer = new MessageDebouncer(
        (type: string, data: any) => {
          if (errorCount++ < 2) {
            throw new Error('Send failed');
          }
          sentMessages.push({ type, data, timestamp: Date.now() });
        },
        mockLogger
      );

      // Queue messages that will fail then succeed
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          errorDebouncer.queueMessage('message/update', {
            content: `Message ${i}`,
          })
        );
        vi.advanceTimersByTime(60);
      }

      await Promise.all(promises);

      // First two should fail, third should succeed
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].data.content).toBe('Message 2');
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should handle shutdown gracefully', async () => {
      // Queue some messages
      debouncer.queueMessage('message/thinking', { content: 'Pre-shutdown' });
      
      // Shutdown before flush
      await debouncer.shutdown();

      // These should be rejected
      await debouncer.queueMessage('message/thinking', { content: 'Post-shutdown' });

      vi.advanceTimersByTime(1000);

      // Only pre-shutdown message should be sent
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].data.content).toBe('Pre-shutdown');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'MessageDebouncer',
        'Rejecting message during shutdown',
        { type: 'message/thinking' }
      );
    });
  });
});