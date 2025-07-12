import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StateSynchronizer, SyncMetadata } from '../../../src/migration/StateSynchronizer';
import { Logger } from '../../../src/core/Logger';
import * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    })),
  },
}));

describe('StateSynchronizer', () => {
  let synchronizer: StateSynchronizer;
  let mockLogger: Logger;
  let mockOutputChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    } as any;

    // Create mock output channel
    mockOutputChannel = {
      appendLine: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.window.createOutputChannel).mockReturnValue(mockOutputChannel);

    synchronizer = new StateSynchronizer(mockLogger);
  });

  afterEach(() => {
    vi.useRealTimers();
    synchronizer.dispose();
  });

  describe('Basic sync operations', () => {
    it('should begin sync to webview successfully', () => {
      const context = synchronizer.beginSyncToWebview('message/update');

      expect(context).toBeTruthy();
      expect(context?.direction).toBe('toWebview');
      expect(context?.messageType).toBe('message/update');
      expect(context?.source).toBe('redux');
      expect(synchronizer.isSyncing()).toBe(true);
      expect(synchronizer.isSyncingDirection('toWebview')).toBe(true);
    });

    it('should begin sync from webview successfully', () => {
      const context = synchronizer.beginSyncFromWebview('chat/sendMessage');

      expect(context).toBeTruthy();
      expect(context?.direction).toBe('fromWebview');
      expect(context?.messageType).toBe('chat/sendMessage');
      expect(context?.source).toBe('webview');
      expect(synchronizer.isSyncing()).toBe(true);
      expect(synchronizer.isSyncingDirection('fromWebview')).toBe(true);
    });

    it('should complete sync operations correctly', () => {
      const context = synchronizer.beginSyncToWebview('message/update');
      expect(synchronizer.isSyncing()).toBe(true);

      if (context) {
        synchronizer.completeSyncToWebview(context);
      }

      expect(synchronizer.isSyncing()).toBe(false);
      expect(synchronizer.getActiveSyncOperations()).toHaveLength(0);
    });
  });

  describe('Loop prevention', () => {
    it('should prevent sync when already syncing in opposite direction', () => {
      // Start sync from webview
      const fromContext = synchronizer.beginSyncFromWebview('chat/sendMessage');
      expect(fromContext).toBeTruthy();

      // Try to sync to webview - should be blocked
      const toContext = synchronizer.beginSyncToWebview('message/update');
      expect(toContext).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Skipping toWebview sync - already syncing from webview'
      );
    });

    it('should prevent circular updates using operation ID', () => {
      const metadata: SyncMetadata = {
        source: 'webview',
        operationId: 'test-op-123',
        timestamp: Date.now(),
      };

      // First sync should succeed
      const context1 = synchronizer.beginSyncFromWebview('chat/sendMessage', metadata);
      expect(context1).toBeTruthy();
      
      if (context1) {
        synchronizer.completeSyncFromWebview(context1);
      }

      // Same operation ID should be blocked
      const context2 = synchronizer.beginSyncFromWebview('chat/sendMessage', metadata);
      expect(context2).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'StateSynchronizer',
        `Circular update detected for operation ${metadata.operationId}`
      );
    });

    it('should respect skipSync flag', () => {
      const metadata: SyncMetadata = {
        source: 'external',
        operationId: 'skip-test',
        timestamp: Date.now(),
        skipSync: true,
      };

      const context = synchronizer.beginSyncToWebview('message/update', metadata);
      expect(context).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Skipping sync due to skipSync flag'
      );
    });

    it('should clean up old operations after timeout', () => {
      const context = synchronizer.beginSyncFromWebview('chat/sendMessage');
      expect(context).toBeTruthy();

      if (context) {
        synchronizer.completeSyncFromWebview(context);
      }

      // Operation should be tracked
      const context2 = synchronizer.beginSyncFromWebview('chat/sendMessage', {
        operationId: context?.operationId,
      });
      expect(context2).toBeNull();

      // Fast forward 5 seconds
      vi.advanceTimersByTime(5000);

      // Same operation should now be allowed
      const context3 = synchronizer.beginSyncFromWebview('chat/sendMessage', {
        operationId: context?.operationId,
      });
      expect(context3).toBeTruthy();
    });
  });

  describe('Performance tracking', () => {
    it('should track sync duration', () => {
      const context = synchronizer.beginSyncToWebview('message/update');
      expect(context).toBeTruthy();

      // Simulate some work
      vi.advanceTimersByTime(5);

      if (context) {
        synchronizer.completeSyncToWebview(context);
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Completed sync to webview: message/update',
        expect.objectContaining({
          operationId: context?.operationId,
          duration: expect.stringMatching(/^\d+\.\d{2}ms$/),
        })
      );
    });

    it('should warn about slow sync operations', () => {
      const context = synchronizer.beginSyncToWebview('message/update');
      expect(context).toBeTruthy();

      // Simulate slow operation (>10ms)
      vi.advanceTimersByTime(15);

      if (context) {
        synchronizer.completeSyncToWebview(context);
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'StateSynchronizer',
        expect.stringContaining('Slow sync detected')
      );
    });
  });

  describe('Utility methods', () => {
    it('should create sync metadata correctly', () => {
      const metadata = synchronizer.createSyncMetadata('external', true);

      expect(metadata.source).toBe('external');
      expect(metadata.skipSync).toBe(true);
      expect(metadata.operationId).toMatch(/^sync_\d+_[a-z0-9]+$/);
      expect(metadata.timestamp).toBeGreaterThan(0);
    });

    it('should track active sync operations', () => {
      // Start first sync and complete it
      const context1 = synchronizer.beginSyncToWebview('message/update');
      expect(synchronizer.getActiveSyncOperations()).toHaveLength(1);
      
      if (context1) {
        synchronizer.completeSyncToWebview(context1);
      }
      
      // Now we can start sync from webview
      const context2 = synchronizer.beginSyncFromWebview('chat/sendMessage');
      expect(synchronizer.getActiveSyncOperations()).toHaveLength(1);
      
      // Start another sync to webview after completing first
      const context3 = synchronizer.beginSyncToWebview('message/thinking');
      
      // Should have 2 active operations now (fromWebview blocks toWebview)
      const activeOps = synchronizer.getActiveSyncOperations();
      expect(activeOps).toHaveLength(1); // Only fromWebview is active
      expect(activeOps).toContainEqual(expect.objectContaining({
        messageType: 'chat/sendMessage',
        direction: 'fromWebview',
      }));

      if (context2) synchronizer.completeSyncFromWebview(context2);
      expect(synchronizer.getActiveSyncOperations()).toHaveLength(0);
    });

    it('should log sync statistics', () => {
      synchronizer.beginSyncToWebview('message/update');
      synchronizer.logSyncStats();

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC STATS]')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('"activeSyncOperations": 1')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('"syncingToWebview": true')
      );
    });
  });

  describe('Multiple concurrent operations', () => {
    it('should handle multiple operations with different IDs', () => {
      const context1 = synchronizer.beginSyncToWebview('message/update', {
        operationId: 'op1',
      });
      
      // Complete first operation
      if (context1) {
        synchronizer.completeSyncToWebview(context1);
      }

      // Different operation ID should work
      const context2 = synchronizer.beginSyncToWebview('message/thinking', {
        operationId: 'op2',
      });
      
      expect(context2).toBeTruthy();
      expect(context2?.operationId).toBe('op2');
    });

    it('should allow same direction syncs with different operations', () => {
      const context1 = synchronizer.beginSyncToWebview('message/update');
      
      // Complete first
      if (context1) {
        synchronizer.completeSyncToWebview(context1);
      }

      // Same direction, different operation should work
      const context2 = synchronizer.beginSyncToWebview('message/thinking');
      expect(context2).toBeTruthy();
      expect(context2?.operationId).not.toBe(context1?.operationId);
    });
  });

  describe('Enhanced loop detection', () => {
    it('should detect duplicate content within time window', () => {
      const payload = { content: 'Hello world', messageId: '123' };
      
      // First sync should succeed
      const context1 = synchronizer.beginSyncToWebview('message/update', {}, payload);
      expect(context1).toBeTruthy();
      if (context1) {
        synchronizer.completeSyncToWebview(context1);
      }

      // Immediate duplicate should be blocked
      const context2 = synchronizer.beginSyncToWebview('message/update', {}, payload);
      expect(context2).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Skipping duplicate content for message/update'
      );
    });

    it('should allow duplicate content after time window', () => {
      const payload = { content: 'Hello world', messageId: '123' };
      
      // First sync
      const context1 = synchronizer.beginSyncToWebview('message/update', {}, payload);
      expect(context1).toBeTruthy();
      if (context1) {
        synchronizer.completeSyncToWebview(context1);
      }

      // Advance time beyond duplicate window (500ms)
      vi.advanceTimersByTime(600);

      // Should now be allowed
      const context2 = synchronizer.beginSyncToWebview('message/update', {}, payload);
      expect(context2).toBeTruthy();
    });

    it('should detect known loop patterns', () => {
      // Simulate a thinking update cycle
      const messages = [
        { type: 'message/thinking', payload: { content: 'thinking...' } },
        { type: 'session/thinkingUpdated', payload: { isThinking: true } },
        { type: 'message/thinking', payload: { content: 'thinking...' } },
      ];

      // Process messages within time window
      for (let i = 0; i < 3; i++) {
        for (const msg of messages) {
          const context = synchronizer.beginSyncToWebview(msg.type, {}, msg.payload);
          if (context) {
            synchronizer.completeSyncToWebview(context);
          }
          vi.advanceTimersByTime(100); // Small delay between messages
        }
      }

      // Next attempt should be blocked due to pattern detection
      const blockedContext = synchronizer.beginSyncToWebview('message/thinking', {}, { content: 'thinking...' });
      expect(blockedContext).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'StateSynchronizer',
        expect.stringContaining('Blocking sync due to loop pattern')
      );
    });

    it('should track operation chains', () => {
      // Create a chain that includes a known pattern
      const ops = [
        { type: 'message/update', payload: { content: 'first' } },
        { type: 'session/messageUpdated', payload: { messageId: '123' } },
        { type: 'message/update', payload: { content: 'second' } },
      ];

      // Process the pattern multiple times to trigger detection
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const op of ops) {
          const context = synchronizer.beginSyncToWebview(op.type, {}, op.payload);
          if (context) {
            synchronizer.completeSyncToWebview(context);
          }
          vi.advanceTimersByTime(50);
        }
      }

      // Should detect the known update-cycle pattern
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Loop pattern detected: update-cycle',
        expect.objectContaining({
          messageTypes: expect.arrayContaining(['message/update', 'session/messageUpdated']),
          occurrences: expect.any(Number)
        })
      );
    });

    it('should provide loop detection statistics', () => {
      // Generate some activity
      const payload1 = { content: 'test1' };
      const payload2 = { content: 'test2' };
      
      synchronizer.beginSyncToWebview('message/update', {}, payload1);
      synchronizer.beginSyncToWebview('message/thinking', {}, payload2);
      
      const stats = synchronizer.getLoopDetectionStats();
      expect(stats).toMatchObject({
        contentHashes: 2,
        operationChains: expect.any(Number),
        detectedPatterns: expect.any(Array),
        recentLoops: expect.any(Number),
      });
    });

    it('should reset loop detection state', () => {
      // Generate some activity
      synchronizer.beginSyncToWebview('message/update', {}, { content: 'test' });
      
      // Verify state exists
      let stats = synchronizer.getLoopDetectionStats();
      expect(stats.contentHashes).toBeGreaterThan(0);
      
      // Reset
      synchronizer.resetLoopDetection();
      
      // Verify state cleared
      stats = synchronizer.getLoopDetectionStats();
      expect(stats.contentHashes).toBe(0);
      expect(stats.operationChains).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Loop detection state reset'
      );
    });

    it('should handle pattern matching correctly', () => {
      // Test the update-cycle pattern
      const updateCycle = [
        'message/update',
        'session/messageUpdated', 
        'message/update',
      ];

      // Process the pattern
      for (const msgType of updateCycle) {
        const context = synchronizer.beginSyncToWebview(msgType, {}, { data: 'test' });
        if (context) {
          synchronizer.completeSyncToWebview(context);
        }
        vi.advanceTimersByTime(100);
      }

      // Process it twice more to trigger detection
      for (let i = 0; i < 2; i++) {
        for (const msgType of updateCycle) {
          const context = synchronizer.beginSyncToWebview(msgType, {}, { data: `test${i}` });
          if (context) {
            synchronizer.completeSyncToWebview(context);
          }
          vi.advanceTimersByTime(100);
        }
      }

      // Should have detected the pattern
      const stats = synchronizer.getLoopDetectionStats();
      const updatePattern = stats.detectedPatterns.find(p => p.id === 'update-cycle');
      expect(updatePattern).toBeTruthy();
      expect(updatePattern?.occurrences).toBeGreaterThanOrEqual(3);
    });

    it('should detect repeated message types in operation chains', () => {
      // Need to clear previous mock calls to isolate this test
      vi.clearAllMocks();
      
      // Create a new synchronizer to ensure clean state
      const freshSynchronizer = new StateSynchronizer(mockLogger);
      
      // Create a sequence with many repeated calls of a type not in known patterns
      const ops = [
        { type: 'file/read', payload: { path: '/file1' } },
        { type: 'file/write', payload: { path: '/file1', content: 'a' } },
        { type: 'file/write', payload: { path: '/file1', content: 'b' } },
        { type: 'file/write', payload: { path: '/file1', content: 'c' } },
        { type: 'file/write', payload: { path: '/file1', content: 'd' } }, // 4th should trigger
      ];

      // Process operations close together to form a chain
      let lastContext = null;
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const context = freshSynchronizer.beginSyncToWebview(op.type, {}, op.payload);
        
        // Log if operation was blocked
        if (!context && i === ops.length - 1) {
          console.log('Last operation was blocked as expected');
        }
        
        if (context) {
          freshSynchronizer.completeSyncToWebview(context);
          lastContext = context;
        }
        vi.advanceTimersByTime(50); // Small delay to keep in same chain
      }

      // The repeated file/write operations should be detected
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'StateSynchronizer',
        'Potential loop detected in operation chain',
        expect.objectContaining({
          pattern: expect.stringContaining('Repeated file/write')
        })
      );
      
      freshSynchronizer.dispose();
    });
  });
});