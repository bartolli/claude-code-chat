import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSyncMiddleware, withSyncMetadata, hasSyncMetadata, getSyncMetadata, withSkipSync } from '../../../src/migration/syncMiddleware';
import { Logger } from '../../../src/core/Logger';
import { configureStore } from '@reduxjs/toolkit';

describe('syncMiddleware', () => {
  let mockLogger: Logger;
  let store: any;
  let next: any;
  let middleware: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    } as any;

    next = vi.fn((action: any) => action);
    
    // Create a mock store
    store = {
      getState: vi.fn(() => ({})),
      dispatch: vi.fn(),
    };

    // Create the middleware
    const syncMiddleware = createSyncMiddleware(mockLogger);
    middleware = syncMiddleware(store)(next);
  });

  describe('createSyncMiddleware', () => {
    it('should pass through actions without sync metadata', () => {
      const action = { type: 'TEST_ACTION', payload: { data: 'test' } };
      
      const result = middleware(action);
      
      expect(next).toHaveBeenCalledWith(action);
      expect(result).toBe(action);
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        'SyncMiddleware',
        expect.stringContaining('Processing sync-aware action')
      );
    });

    it('should log sync-aware actions', () => {
      const action = withSyncMetadata(
        { type: 'TEST_ACTION', payload: { data: 'test' } },
        { source: 'webview', operationId: 'test-op-123' }
      );
      
      middleware(action);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'SyncMiddleware',
        'Processing sync-aware action: TEST_ACTION',
        expect.objectContaining({
          source: 'webview',
          operationId: 'test-op-123',
        })
      );
    });

    it('should identify actions eligible for sync', () => {
      const action = withSyncMetadata(
        { type: 'TEST_ACTION', payload: { data: 'test' } },
        { source: 'redux' }
      );
      
      middleware(action);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'SyncMiddleware',
        'Action TEST_ACTION eligible for sync'
      );
    });

    it('should not sync actions with skipSync flag', () => {
      const action = withSkipSync(
        { type: 'TEST_ACTION', payload: { data: 'test' } },
        'webview'
      );
      
      middleware(action);
      
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        'SyncMiddleware',
        'Action TEST_ACTION eligible for sync'
      );
    });
  });

  describe('withSyncMetadata', () => {
    it('should add complete sync metadata to action', () => {
      const action = { type: 'TEST_ACTION', payload: { data: 'test' } };
      const syncMetadata = {
        source: 'redux' as const,
        operationId: 'op-123',
        timestamp: 1234567890,
      };
      
      const result = withSyncMetadata(action, syncMetadata);
      
      expect(result).toEqual({
        type: 'TEST_ACTION',
        payload: { data: 'test' },
        meta: {
          sync: {
            source: 'redux',
            operationId: 'op-123',
            timestamp: 1234567890,
            skipSync: undefined,
          },
        },
      });
    });

    it('should generate operationId if not provided', () => {
      const action = { type: 'TEST_ACTION' };
      
      const result = withSyncMetadata(action, { source: 'webview' });
      
      expect(result.meta.sync.operationId).toMatch(/^op_\d+_[a-z0-9]+$/);
    });

    it('should use current timestamp if not provided', () => {
      const action = { type: 'TEST_ACTION' };
      const beforeTime = Date.now();
      
      const result = withSyncMetadata(action, { source: 'webview' });
      
      const afterTime = Date.now();
      expect(result.meta.sync.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.meta.sync.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve existing meta properties', () => {
      const action = {
        type: 'TEST_ACTION',
        meta: { existingProp: 'value' },
      };
      
      const result = withSyncMetadata(action, { source: 'webview' });
      
      expect(result.meta.existingProp).toBe('value');
      expect(result.meta.sync).toBeDefined();
    });
  });

  describe('hasSyncMetadata', () => {
    it('should return true for actions with sync metadata', () => {
      const action = withSyncMetadata(
        { type: 'TEST_ACTION' },
        { source: 'webview' }
      );
      
      expect(hasSyncMetadata(action)).toBe(true);
    });

    it('should return false for actions without sync metadata', () => {
      const action = { type: 'TEST_ACTION', payload: {} };
      
      expect(hasSyncMetadata(action)).toBe(false);
    });

    it('should return false for actions with meta but no sync', () => {
      const action = {
        type: 'TEST_ACTION',
        meta: { otherProp: 'value' },
      };
      
      expect(hasSyncMetadata(action)).toBe(false);
    });
  });

  describe('getSyncMetadata', () => {
    it('should extract sync metadata from action', () => {
      const syncMetadata = {
        source: 'webview' as const,
        operationId: 'op-123',
        timestamp: 1234567890,
      };
      const action = withSyncMetadata(
        { type: 'TEST_ACTION' },
        syncMetadata
      );
      
      const result = getSyncMetadata(action);
      
      expect(result).toEqual({
        source: 'webview',
        operationId: 'op-123',
        timestamp: 1234567890,
        skipSync: undefined,
      });
    });

    it('should return undefined for actions without sync metadata', () => {
      const action = { type: 'TEST_ACTION' };
      
      const result = getSyncMetadata(action as any);
      
      expect(result).toBeUndefined();
    });
  });

  describe('withSkipSync', () => {
    it('should create action with skipSync flag', () => {
      const action = { type: 'TEST_ACTION', payload: { data: 'test' } };
      
      const result = withSkipSync(action, 'webview');
      
      expect(result.meta.sync.skipSync).toBe(true);
      expect(result.meta.sync.source).toBe('webview');
    });

    it('should use external source by default', () => {
      const action = { type: 'TEST_ACTION' };
      
      const result = withSkipSync(action);
      
      expect(result.meta.sync.source).toBe('external');
      expect(result.meta.sync.skipSync).toBe(true);
    });
  });

  describe('Integration with Redux store', () => {
    it('should work with real Redux store', () => {
      const testReducer = (state = { count: 0 }, action: any) => {
        if (action.type === 'INCREMENT') {
          return { count: state.count + 1 };
        }
        return state;
      };

      const realStore = configureStore({
        reducer: testReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(createSyncMiddleware(mockLogger)),
      });

      // Dispatch normal action
      realStore.dispatch({ type: 'INCREMENT' });
      expect(realStore.getState()).toEqual({ count: 1 });

      // Dispatch sync-aware action
      const syncAction = withSyncMetadata(
        { type: 'INCREMENT' },
        { source: 'webview', operationId: 'test-123' }
      );
      realStore.dispatch(syncAction);
      
      expect(realStore.getState()).toEqual({ count: 2 });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'SyncMiddleware',
        'Processing sync-aware action: INCREMENT',
        expect.any(Object)
      );
    });
  });
});