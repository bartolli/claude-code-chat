import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageDebouncer, DEFAULT_DEBOUNCE_CONFIG } from '../../../src/migration/MessageDebouncer';
import { Logger } from '../../../src/core/Logger';

// Mock logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
} as any);

describe('MessageDebouncer', () => {
  let mockLogger: Logger;
  let sendHandler: any;
  let debouncer: MessageDebouncer;

  beforeEach(() => {
    vi.useFakeTimers();
    mockLogger = createMockLogger();
    sendHandler = vi.fn();
    debouncer = new MessageDebouncer(sendHandler, mockLogger);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should send immediate messages without delay', async () => {
      await debouncer.queueMessage('test/message', { data: 'immediate' }, true);

      expect(sendHandler).toHaveBeenCalledWith('test/message', { data: 'immediate' });
      expect(sendHandler).toHaveBeenCalledTimes(1);
    });

    it('should debounce messages with default config', async () => {
      const promise = debouncer.queueMessage('test/message', { data: 'debounced' });

      // Message should not be sent immediately
      expect(sendHandler).not.toHaveBeenCalled();

      // Advance time to trigger debounce
      vi.advanceTimersByTime(100);

      await promise;
      expect(sendHandler).toHaveBeenCalledWith('test/message', { data: 'debounced' });
      expect(sendHandler).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on multiple rapid messages', async () => {
      debouncer.queueMessage('test/message', { data: 'first' });
      
      vi.advanceTimersByTime(50);
      expect(sendHandler).not.toHaveBeenCalled();

      debouncer.queueMessage('test/message', { data: 'second' });
      
      vi.advanceTimersByTime(50);
      expect(sendHandler).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(sendHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('message batching', () => {
    it('should batch thinking messages', async () => {
      // Queue multiple thinking messages
      const promises = [
        debouncer.queueMessage('message/thinking', { content: 'Hello ', messageId: '123' }),
        debouncer.queueMessage('message/thinking', { content: 'world', messageId: '123' }),
        debouncer.queueMessage('message/thinking', { content: '!', messageId: '123' }),
      ];

      // Advance time to trigger flush
      vi.advanceTimersByTime(100);

      await Promise.all(promises);

      expect(sendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledWith('message/thinking', {
        content: 'Hello world!',
        messageId: '123',
        isBatched: true,
        batchCount: 3,
      });
    });

    it('should not batch non-batchable messages', async () => {
      const promises = [
        debouncer.queueMessage('message/tokenUsage', { tokens: 100 }),
        debouncer.queueMessage('message/tokenUsage', { tokens: 200 }),
      ];

      vi.advanceTimersByTime(200);

      await Promise.all(promises);

      expect(sendHandler).toHaveBeenCalledTimes(2);
      expect(sendHandler).toHaveBeenCalledWith('message/tokenUsage', { tokens: 100 });
      expect(sendHandler).toHaveBeenCalledWith('message/tokenUsage', { tokens: 200 });
    });

    it('should respect maxBatchSize', async () => {
      // Queue more messages than maxBatchSize
      for (let i = 0; i < 15; i++) {
        debouncer.queueMessage('message/thinking', { content: `chunk${i}` });
      }

      // Should flush at 10 messages (maxBatchSize)
      expect(sendHandler).toHaveBeenCalledTimes(1);
      
      // Advance time to flush remaining messages
      vi.advanceTimersByTime(100);
      
      expect(sendHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush operations', () => {
    it('should flush all pending messages', async () => {
      debouncer.queueMessage('message/thinking', { content: 'thinking' });
      debouncer.queueMessage('message/update', { content: 'update' });
      debouncer.queueMessage('message/tokenUsage', { tokens: 100 });

      debouncer.flushAll();

      expect(sendHandler).toHaveBeenCalledTimes(3);
    });

    it('should flush specific message types', async () => {
      debouncer.queueMessage('message/thinking', { content: 'thinking' });
      debouncer.queueMessage('message/update', { content: 'update' });
      debouncer.queueMessage('message/tokenUsage', { tokens: 100 });

      debouncer.flushTypes(['message/thinking', 'message/update']);

      expect(sendHandler).toHaveBeenCalledTimes(2);
      expect(sendHandler).toHaveBeenCalledWith('message/thinking', expect.any(Object));
      expect(sendHandler).toHaveBeenCalledWith('message/update', { content: 'update' });
    });

    it('should clear without sending', () => {
      debouncer.queueMessage('message/thinking', { content: 'thinking' });
      debouncer.queueMessage('message/update', { content: 'update' });

      debouncer.clear();

      vi.advanceTimersByTime(1000);
      expect(sendHandler).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use custom configurations', async () => {
      const customDebouncer = new MessageDebouncer(sendHandler, mockLogger, {
        'custom/message': { debounceMs: 300, batchable: true },
      });

      customDebouncer.queueMessage('custom/message', { data: 'test' });
      
      vi.advanceTimersByTime(200);
      expect(sendHandler).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(sendHandler).toHaveBeenCalledWith('custom/message', expect.any(Object));
    });

    it('should update configuration dynamically', async () => {
      debouncer.updateConfig('test/message', { debounceMs: 50, batchable: false });

      debouncer.queueMessage('test/message', { data: 'test' });
      
      vi.advanceTimersByTime(50);
      expect(sendHandler).toHaveBeenCalledWith('test/message', { data: 'test' });
    });

    it('should check if message should be debounced', () => {
      expect(debouncer.shouldDebounce('message/thinking')).toBe(true);
      expect(debouncer.shouldDebounce('unknown/message')).toBe(false);
      
      debouncer.updateConfig('unknown/message', { debounceMs: 0 });
      expect(debouncer.shouldDebounce('unknown/message')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle send errors gracefully', async () => {
      sendHandler.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const promise = debouncer.queueMessage('message/thinking', { content: 'test' });
      
      vi.advanceTimersByTime(100);
      
      // Should not throw, promise should resolve
      await expect(promise).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should reject messages during shutdown', async () => {
      await debouncer.shutdown();

      await debouncer.queueMessage('test/message', { data: 'late' });
      
      expect(sendHandler).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'MessageDebouncer',
        'Rejecting message during shutdown',
        { type: 'test/message' }
      );
    });
  });

  describe('statistics', () => {
    it('should track pending messages', () => {
      debouncer.queueMessage('message/thinking', { content: 'test1' });
      debouncer.queueMessage('message/thinking', { content: 'test2' });
      debouncer.queueMessage('message/update', { content: 'update' });

      const stats = debouncer.getStats();
      
      expect(stats.totalPending).toBe(3);
      expect(stats.pendingTypes).toContain('message/thinking');
      expect(stats.pendingTypes).toContain('message/update');
      expect(stats.typeStats['message/thinking'].pending).toBe(2);
      expect(stats.typeStats['message/update'].pending).toBe(1);
    });

    it('should track last sent timestamp', async () => {
      const promise = debouncer.queueMessage('message/thinking', { content: 'test' });
      
      vi.advanceTimersByTime(100);
      await promise;

      const stats = debouncer.getStats();
      expect(stats.typeStats['message/thinking'].lastSent).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content in thinking messages', async () => {
      const promises = [
        debouncer.queueMessage('message/thinking', { content: 'Hello' }),
        debouncer.queueMessage('message/thinking', { content: '' }),
        debouncer.queueMessage('message/thinking', { content: 'World' }),
      ];

      vi.advanceTimersByTime(100);
      await Promise.all(promises);

      expect(sendHandler).toHaveBeenCalledWith('message/thinking', {
        content: 'HelloWorld',
        isBatched: true,
        batchCount: 3,
      });
    });

    it('should handle generic batching for unknown types', async () => {
      debouncer.updateConfig('custom/batch', { debounceMs: 50, batchable: true });

      const promises = [
        debouncer.queueMessage('custom/batch', { id: 1 }),
        debouncer.queueMessage('custom/batch', { id: 2 }),
      ];

      vi.advanceTimersByTime(50);
      await Promise.all(promises);

      expect(sendHandler).toHaveBeenCalledWith('custom/batch/batch', {
        messages: [{ id: 1 }, { id: 2 }],
        batchCount: 2,
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });
    });
  });
});