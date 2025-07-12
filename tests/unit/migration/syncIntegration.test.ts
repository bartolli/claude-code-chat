import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateSynchronizer } from '../../../src/migration/StateSynchronizer';
import { ActionMapper } from '../../../src/migration/ActionMapper';
import { createSyncMiddleware, withSyncMetadata } from '../../../src/migration/syncMiddleware';
import { Logger } from '../../../src/core/Logger';
import * as vscode from 'vscode';

// Mock vscode
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key, defaultValue) => defaultValue),
    })),
  },
  env: {
    machineId: 'test-machine',
    sessionId: 'test-session',
  },
}));

// Mock FeatureFlagManager
vi.mock('../../../src/migration/FeatureFlags', () => ({
  FeatureFlagManager: {
    getInstance: vi.fn(() => ({
      isEnabled: vi.fn(() => true),
      getFlags: vi.fn(() => ({ enableActionMapping: true })),
    })),
  },
}));

describe('Sync Integration', () => {
  let mockLogger: Logger;
  let synchronizer: StateSynchronizer;
  let actionMapper: ActionMapper;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    } as any;

    mockContext = {
      workspaceState: {
        get: vi.fn((key, defaultValue) => {
          // Return enabled feature flags for testing
          if (key === 'migrationFlags') {
            return { enableActionMapping: true };
          }
          return defaultValue;
        }),
        update: vi.fn(),
      },
      globalState: {
        get: vi.fn((key, defaultValue) => defaultValue),
        update: vi.fn(),
      },
    };

    synchronizer = new StateSynchronizer(mockLogger);
    actionMapper = new ActionMapper(mockContext);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Redux to Webview sync', () => {
    it('should attach sync metadata when mapping actions', () => {
      // Use an action with direct Redux mapping
      const webviewAction = {
        type: 'claude/setProcessing',
        payload: { processing: true },
      };

      const syncMetadata = {
        source: 'redux' as const,
        operationId: 'test-op-123',
      };

      const result = actionMapper.mapAction(webviewAction, syncMetadata);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toBeDefined();
      expect(result.mappedAction?.meta?.sync).toMatchObject({
        source: 'redux',
        operationId: 'test-op-123',
      });
    });

    it('should prevent loops using StateSynchronizer', () => {
      // Start a sync operation
      const context1 = synchronizer.beginSyncToWebview('message/update', {
        source: 'redux',
      }, { content: 'test' });

      expect(context1).toBeTruthy();

      // Try to sync same content immediately - should be blocked
      const context2 = synchronizer.beginSyncToWebview('message/update', {
        source: 'redux',
      }, { content: 'test' });

      expect(context2).toBeNull();
    });
  });

  describe('Webview to Redux sync', () => {
    it('should handle webview actions with sync context', () => {
      const context = synchronizer.beginSyncFromWebview('settings/update', {
        source: 'webview',
      }, { selectedModel: 'opus' });

      expect(context).toBeTruthy();
      expect(context?.direction).toBe('fromWebview');

      // Map action with sync context - use a simple Redux action
      const result = actionMapper.mapAction(
        { type: 'ui/setReady', payload: { ready: true } },
        { source: 'webview', operationId: context!.operationId }
      );

      expect(result.success).toBe(true);
      expect(result.mappedAction?.meta?.sync?.source).toBe('webview');

      // Complete sync
      synchronizer.completeSyncFromWebview(context!);
    });
  });

  describe('Middleware integration', () => {
    it('should process sync-aware actions', () => {
      const store = { getState: vi.fn(), dispatch: vi.fn() };
      const next = vi.fn();
      const middleware = createSyncMiddleware(mockLogger);
      const dispatch = middleware(store)(next);

      const action = withSyncMetadata(
        { type: 'TEST_ACTION', payload: 'test' },
        { source: 'redux', operationId: 'test-123' }
      );

      dispatch(action);

      expect(next).toHaveBeenCalledWith(action);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'SyncMiddleware',
        'Processing sync-aware action: TEST_ACTION',
        expect.any(Object)
      );
    });
  });

  describe('Loop detection scenarios', () => {
    it('should detect update-cycle pattern', () => {
      const messages = [
        'message/update',
        'session/messageUpdated',
        'message/update',
      ];

      // Process pattern 3 times to trigger detection
      for (let i = 0; i < 3; i++) {
        for (const msgType of messages) {
          const context = synchronizer.beginSyncToWebview(msgType, {}, { data: `cycle${i}` });
          if (context) {
            synchronizer.completeSyncToWebview(context);
          }
        }
      }

      // Next update should be blocked
      const blockedContext = synchronizer.beginSyncToWebview('message/update', {}, { data: 'blocked' });
      expect(blockedContext).toBeNull();
    });

    it('should allow different content after time window', () => {
      const context1 = synchronizer.beginSyncToWebview('message/update', {}, { content: 'first' });
      expect(context1).toBeTruthy();
      if (context1) synchronizer.completeSyncToWebview(context1);

      // Wait for duplicate window to pass
      vi.advanceTimersByTime(600);

      const context2 = synchronizer.beginSyncToWebview('message/update', {}, { content: 'first' });
      expect(context2).toBeTruthy();
    });
  });
});