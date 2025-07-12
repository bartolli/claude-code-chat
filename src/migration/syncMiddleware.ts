import { Middleware } from '@reduxjs/toolkit';
import { SyncMetadata } from './StateSynchronizer';
import { Logger } from '../core/Logger';

/**
 * Action type with sync metadata
 */
export interface SyncAwareAction {
  type: string;
  payload?: any;
  meta?: {
    sync?: SyncMetadata;
    [key: string]: any;
  };
}

/**
 * Redux middleware for managing state synchronization context
 * Prevents infinite loops by tracking sync operations
 */
export const createSyncMiddleware = (logger: Logger): Middleware => {
  return () => (next) => (action: unknown) => {
    const syncAction = action as SyncAwareAction;
    
    // Log sync-aware actions for debugging
    if (syncAction.meta?.sync) {
      logger.debug('SyncMiddleware', `Processing sync-aware action: ${syncAction.type}`, {
        source: syncAction.meta.sync.source,
        operationId: syncAction.meta.sync.operationId,
        skipSync: syncAction.meta.sync.skipSync,
      });
    }

    // Pass the action through
    const result = next(action);

    // After state update, check if we need to sync
    if (!syncAction.meta?.sync?.skipSync) {
      // This is where we would trigger sync to webview
      // The actual sync is handled by ExtensionMessageHandler
      logger.debug('SyncMiddleware', `Action ${syncAction.type} eligible for sync`);
    }

    return result;
  };
};

/**
 * Helper to add sync metadata to an action
 */
export function withSyncMetadata<T extends { type: string; payload?: any }>(
  action: T,
  syncMetadata: Partial<SyncMetadata>
): T & { meta: { sync: SyncMetadata } } {
  return {
    ...action,
    meta: {
      ...((action as any).meta || {}),
      sync: {
        source: syncMetadata.source || 'external',
        operationId: syncMetadata.operationId || `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: syncMetadata.timestamp || Date.now(),
        skipSync: syncMetadata.skipSync,
      },
    },
  };
}

/**
 * Check if an action has sync metadata
 */
export function hasSyncMetadata(action: any): action is SyncAwareAction {
  return action?.meta?.sync !== undefined;
}

/**
 * Extract sync metadata from an action
 */
export function getSyncMetadata(action: SyncAwareAction): SyncMetadata | undefined {
  return action.meta?.sync;
}

/**
 * Create an action with skipSync flag to prevent synchronization
 */
export function withSkipSync<T extends { type: string; payload?: any }>(
  action: T,
  source: SyncMetadata['source'] = 'external'
): T & { meta: { sync: SyncMetadata } } {
  return withSyncMetadata(action, {
    source,
    skipSync: true,
  });
}