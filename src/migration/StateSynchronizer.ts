import { Logger } from '../core/Logger';
import * as vscode from 'vscode';

/**
 * Metadata attached to sync operations to track source and prevent loops
 */
export interface SyncMetadata {
  /** Source of the state change */
  source: 'webview' | 'redux' | 'external';
  /** Unique operation ID to track circular updates */
  operationId: string;
  /** Timestamp of the operation */
  timestamp: number;
  /** Flag to skip sync for this operation */
  skipSync?: boolean;
}

/**
 * Context for sync operations to track direction and state
 */
export interface SyncContext {
  /** Unique ID for this sync operation */
  operationId: string;
  /** Direction of sync */
  direction: 'toWebview' | 'fromWebview';
  /** Start time for performance tracking */
  startTime: number;
  /** Message type being synced */
  messageType: string;
  /** Source that triggered this sync */
  source: SyncMetadata['source'];
}

/**
 * Represents a chain of related sync operations
 */
interface OperationChain {
  /** Chain ID */
  chainId: string;
  /** Operations in this chain */
  operations: string[];
  /** Message types involved */
  messageTypes: string[];
  /** Creation time */
  createdAt: number;
  /** Last update time */
  updatedAt: number;
}

/**
 * Tracks patterns that might indicate loops
 */
interface LoopPattern {
  /** Pattern identifier */
  id: string;
  /** Message types that form the pattern */
  messageTypes: string[];
  /** How many times we've seen this pattern */
  occurrences: number;
  /** Time window for pattern detection (ms) */
  timeWindow: number;
  /** Last occurrence timestamp */
  lastSeen?: number;
}

/**
 * Handles bidirectional state synchronization between Redux and Webview
 * Prevents infinite loops and tracks sync operations
 */
export class StateSynchronizer {
  private syncingToWebview = false;
  private syncingFromWebview = false;
  private activeSyncOperations = new Map<string, SyncContext>();
  private recentOperations = new Set<string>();
  private operationChains = new Map<string, OperationChain>();
  private contentHashes = new Map<string, number>();
  private loopPatterns = new Map<string, LoopPattern>();
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;
  
  // Known loop-prone message sequences
  private readonly KNOWN_LOOP_PATTERNS: LoopPattern[] = [
    {
      id: 'update-cycle',
      messageTypes: ['message/update', 'session/messageUpdated', 'message/update'],
      occurrences: 0,
      timeWindow: 1000, // 1 second
    },
    {
      id: 'thinking-cycle',
      messageTypes: ['message/thinking', 'session/thinkingUpdated', 'message/thinking'],
      occurrences: 0,
      timeWindow: 500, // 500ms for rapid thinking updates
    },
    {
      id: 'status-cycle',
      messageTypes: ['status/processing', 'claude/setProcessing', 'status/processing'],
      occurrences: 0,
      timeWindow: 2000,
    },
  ];

  constructor(logger: Logger) {
    this.logger = logger;
    this.outputChannel = vscode.window.createOutputChannel('Claude Code - State Sync');
    
    // Initialize known patterns
    this.KNOWN_LOOP_PATTERNS.forEach(pattern => {
      this.loopPatterns.set(pattern.id, { ...pattern });
    });
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if we should skip sync based on current state
   */
  private shouldSkipSync(metadata: SyncMetadata, direction: 'toWebview' | 'fromWebview'): boolean {
    // Skip if explicitly flagged
    if (metadata.skipSync) {
      this.logger.debug('StateSynchronizer', 'Skipping sync due to skipSync flag');
      return true;
    }

    // Skip if we're already syncing in the opposite direction
    if (direction === 'toWebview' && this.syncingFromWebview) {
      this.logger.debug('StateSynchronizer', 'Skipping toWebview sync - already syncing from webview');
      return true;
    }
    if (direction === 'fromWebview' && this.syncingToWebview) {
      this.logger.debug('StateSynchronizer', 'Skipping fromWebview sync - already syncing to webview');
      return true;
    }

    // Check for circular updates using operation ID
    if (this.recentOperations.has(metadata.operationId)) {
      this.logger.warn('StateSynchronizer', `Circular update detected for operation ${metadata.operationId}`);
      return true;
    }

    return false;
  }

  /**
   * Track a sync operation
   */
  private trackOperation(operationId: string): void {
    this.recentOperations.add(operationId);
    
    // Clean up old operations after 5 seconds
    setTimeout(() => {
      this.recentOperations.delete(operationId);
    }, 5000);
  }

  /**
   * Begin a sync operation to webview
   */
  beginSyncToWebview(messageType: string, metadata?: Partial<SyncMetadata>, payload?: any): SyncContext | null {
    const fullMetadata: SyncMetadata = {
      source: metadata?.source || 'redux',
      operationId: metadata?.operationId || this.generateOperationId(),
      timestamp: Date.now(),
      skipSync: metadata?.skipSync,
    };

    if (this.shouldSkipSyncEnhanced(fullMetadata, 'toWebview', messageType, payload)) {
      return null;
    }

    const context: SyncContext = {
      operationId: fullMetadata.operationId,
      direction: 'toWebview',
      startTime: performance.now(),
      messageType,
      source: fullMetadata.source,
    };

    this.syncingToWebview = true;
    this.activeSyncOperations.set(context.operationId, context);
    this.trackOperation(context.operationId);

    this.logger.debug('StateSynchronizer', `Beginning sync to webview: ${messageType}`, {
      operationId: context.operationId,
      source: context.source,
    });

    return context;
  }

  /**
   * Complete a sync operation to webview
   */
  completeSyncToWebview(context: SyncContext): void {
    this.syncingToWebview = false;
    this.activeSyncOperations.delete(context.operationId);

    const duration = performance.now() - context.startTime;
    this.logger.debug('StateSynchronizer', `Completed sync to webview: ${context.messageType}`, {
      operationId: context.operationId,
      duration: `${duration.toFixed(2)}ms`,
    });

    if (duration > 10) {
      this.logger.warn('StateSynchronizer', `Slow sync detected: ${context.messageType} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Begin a sync operation from webview
   */
  beginSyncFromWebview(messageType: string, metadata?: Partial<SyncMetadata>, payload?: any): SyncContext | null {
    const fullMetadata: SyncMetadata = {
      source: metadata?.source || 'webview',
      operationId: metadata?.operationId || this.generateOperationId(),
      timestamp: Date.now(),
      skipSync: metadata?.skipSync,
    };

    if (this.shouldSkipSyncEnhanced(fullMetadata, 'fromWebview', messageType, payload)) {
      return null;
    }

    const context: SyncContext = {
      operationId: fullMetadata.operationId,
      direction: 'fromWebview',
      startTime: performance.now(),
      messageType,
      source: fullMetadata.source,
    };

    this.syncingFromWebview = true;
    this.activeSyncOperations.set(context.operationId, context);
    this.trackOperation(context.operationId);

    this.logger.debug('StateSynchronizer', `Beginning sync from webview: ${messageType}`, {
      operationId: context.operationId,
      source: context.source,
    });

    return context;
  }

  /**
   * Complete a sync operation from webview
   */
  completeSyncFromWebview(context: SyncContext): void {
    this.syncingFromWebview = false;
    this.activeSyncOperations.delete(context.operationId);

    const duration = performance.now() - context.startTime;
    this.logger.debug('StateSynchronizer', `Completed sync from webview: ${context.messageType}`, {
      operationId: context.operationId,
      duration: `${duration.toFixed(2)}ms`,
    });
  }

  /**
   * Check if currently syncing in any direction
   */
  isSyncing(): boolean {
    return this.syncingToWebview || this.syncingFromWebview;
  }

  /**
   * Check if syncing in a specific direction
   */
  isSyncingDirection(direction: 'toWebview' | 'fromWebview'): boolean {
    return direction === 'toWebview' ? this.syncingToWebview : this.syncingFromWebview;
  }

  /**
   * Get active sync operations for debugging
   */
  getActiveSyncOperations(): SyncContext[] {
    return Array.from(this.activeSyncOperations.values());
  }

  /**
   * Create metadata for a new sync operation
   */
  createSyncMetadata(source: SyncMetadata['source'], skipSync = false): SyncMetadata {
    return {
      source,
      operationId: this.generateOperationId(),
      timestamp: Date.now(),
      skipSync,
    };
  }

  /**
   * Log sync statistics for debugging
   */
  logSyncStats(): void {
    const stats = {
      activeSyncOperations: this.activeSyncOperations.size,
      recentOperationCount: this.recentOperations.size,
      syncingToWebview: this.syncingToWebview,
      syncingFromWebview: this.syncingFromWebview,
    };

    this.outputChannel.appendLine(`[SYNC STATS] ${JSON.stringify(stats, null, 2)}`);
  }

  /**
   * Generate content hash for duplicate detection
   */
  private generateContentHash(messageType: string, payload: any): string {
    // Create a stable string representation of the content
    const contentString = `${messageType}:${JSON.stringify(payload)}`;
    
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `${messageType}_${hash}`;
  }

  /**
   * Check if content is duplicate within recent time window
   */
  private isDuplicateContent(hash: string, timeWindow = 500): boolean {
    const lastSeen = this.contentHashes.get(hash);
    if (!lastSeen) {
      return false;
    }
    
    const timeSinceLastSeen = Date.now() - lastSeen;
    return timeSinceLastSeen < timeWindow;
  }

  /**
   * Track content hash with timestamp
   */
  private trackContentHash(hash: string): void {
    this.contentHashes.set(hash, Date.now());
    
    // Clean up old hashes periodically
    if (this.contentHashes.size > 1000) {
      const cutoffTime = Date.now() - 60000; // 1 minute
      for (const [h, timestamp] of this.contentHashes.entries()) {
        if (timestamp < cutoffTime) {
          this.contentHashes.delete(h);
        }
      }
    }
  }

  /**
   * Track operation chain for dependency analysis
   */
  private trackOperationChain(operationId: string, messageType: string): void {
    const now = Date.now();
    
    // Find or create chain for recent operations
    let chain: OperationChain | undefined;
    
    // Look for the most recent chain within time window
    let mostRecentChain: OperationChain | undefined;
    let mostRecentTime = 0;
    
    for (const [chainId, c] of this.operationChains.entries()) {
      const timeSinceUpdate = now - c.updatedAt;
      if (timeSinceUpdate < 5000 && c.updatedAt > mostRecentTime) {
        mostRecentChain = c;
        mostRecentTime = c.updatedAt;
      }
    }
    
    chain = mostRecentChain;
    
    if (!chain) {
      // Create new chain
      chain = {
        chainId: `chain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        operations: [operationId],
        messageTypes: [messageType],
        createdAt: now,
        updatedAt: now,
      };
      this.operationChains.set(chain.chainId, chain);
    } else {
      // Update existing chain - always add the message type to track repetitions
      chain.operations.push(operationId);
      chain.messageTypes.push(messageType); // Don't check for duplicates, we want to count them
      chain.updatedAt = now;
    }
    
    // Clean up old chains
    if (this.operationChains.size > 50) {
      const cutoffTime = now - 60000; // 1 minute
      for (const [chainId, c] of this.operationChains.entries()) {
        if (c.updatedAt < cutoffTime) {
          this.operationChains.delete(chainId);
        }
      }
    }
  }

  /**
   * Detect known loop patterns
   */
  private detectLoopPattern(messageType: string): LoopPattern | null {
    const now = Date.now();
    
    for (const pattern of this.loopPatterns.values()) {
      // Check if this message type is part of a known pattern
      const messageIndex = pattern.messageTypes.indexOf(messageType);
      if (messageIndex === -1) continue;
      
      // Check if we've seen other parts of this pattern recently
      if (pattern.lastSeen && (now - pattern.lastSeen) < pattern.timeWindow) {
        pattern.occurrences++;
        pattern.lastSeen = now;
        
        if (pattern.occurrences >= 3) {
          this.logger.warn('StateSynchronizer', `Loop pattern detected: ${pattern.id}`, {
            occurrences: pattern.occurrences,
            messageTypes: pattern.messageTypes,
          });
          return pattern;
        }
      } else {
        // Reset if too much time has passed
        pattern.occurrences = 1;
        pattern.lastSeen = now;
      }
    }
    
    return null;
  }

  /**
   * Analyze operation chains for potential loops
   */
  private analyzeOperationChains(): { hasLoop: boolean; pattern?: string } {
    const now = Date.now();
    const recentThreshold = 5000; // 5 seconds
    
    for (const chain of this.operationChains.values()) {
      if ((now - chain.updatedAt) > recentThreshold) continue;
      
      // Check for repeating message types in chain
      const messageTypeCount = new Map<string, number>();
      for (const msgType of chain.messageTypes) {
        messageTypeCount.set(msgType, (messageTypeCount.get(msgType) || 0) + 1);
      }
      
      // If any message type appears more than twice, might be a loop
      for (const [msgType, count] of messageTypeCount.entries()) {
        if (count > 2) {
          const pattern = `Repeated ${msgType} (${count} times in chain)`;
          this.logger.warn('StateSynchronizer', 'Potential loop detected in operation chain', {
            chainId: chain.chainId,
            pattern,
            messageTypes: chain.messageTypes,
          });
          return { hasLoop: true, pattern };
        }
      }
      
      // Check if chain matches known patterns
      for (const knownPattern of this.KNOWN_LOOP_PATTERNS) {
        if (this.matchesPattern(chain.messageTypes, knownPattern.messageTypes)) {
          return { hasLoop: true, pattern: knownPattern.id };
        }
      }
    }
    
    return { hasLoop: false };
  }

  /**
   * Check if message sequence matches a pattern
   */
  private matchesPattern(sequence: string[], pattern: string[]): boolean {
    if (sequence.length < pattern.length) return false;
    
    // Check if pattern appears anywhere in sequence
    for (let i = 0; i <= sequence.length - pattern.length; i++) {
      let matches = true;
      for (let j = 0; j < pattern.length; j++) {
        if (sequence[i + j] !== pattern[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    
    return false;
  }

  /**
   * Enhanced shouldSkipSync with advanced loop detection
   */
  private shouldSkipSyncEnhanced(metadata: SyncMetadata, direction: 'toWebview' | 'fromWebview', messageType: string, payload?: any): boolean {
    // First do basic checks
    if (this.shouldSkipSync(metadata, direction)) {
      return true;
    }
    
    // Check for duplicate content
    if (payload) {
      const contentHash = this.generateContentHash(messageType, payload);
      if (this.isDuplicateContent(contentHash)) {
        this.logger.debug('StateSynchronizer', `Skipping duplicate content for ${messageType}`);
        return true;
      }
      this.trackContentHash(contentHash);
    }
    
    // Check for known loop patterns
    const loopPattern = this.detectLoopPattern(messageType);
    if (loopPattern && loopPattern.occurrences >= 3) {
      this.logger.warn('StateSynchronizer', `Blocking sync due to loop pattern: ${loopPattern.id}`);
      return true;
    }
    
    // Track this operation in chains
    this.trackOperationChain(metadata.operationId, messageType);
    
    // Analyze chains for loops
    const chainAnalysis = this.analyzeOperationChains();
    if (chainAnalysis.hasLoop) {
      this.logger.warn('StateSynchronizer', `Blocking sync due to detected loop: ${chainAnalysis.pattern}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get loop detection statistics for debugging
   */
  getLoopDetectionStats(): {
    contentHashes: number;
    operationChains: number;
    detectedPatterns: Array<{ id: string; occurrences: number }>;
    recentLoops: number;
  } {
    const detectedPatterns = Array.from(this.loopPatterns.values())
      .filter(p => p.occurrences > 0)
      .map(p => ({ id: p.id, occurrences: p.occurrences }));
    
    const recentLoops = Array.from(this.loopPatterns.values())
      .filter(p => p.lastSeen && (Date.now() - p.lastSeen) < 60000)
      .length;
    
    return {
      contentHashes: this.contentHashes.size,
      operationChains: this.operationChains.size,
      detectedPatterns,
      recentLoops,
    };
  }

  /**
   * Reset loop detection state (for testing or recovery)
   */
  resetLoopDetection(): void {
    this.contentHashes.clear();
    this.operationChains.clear();
    
    // Reset pattern occurrences but keep pattern definitions
    for (const pattern of this.loopPatterns.values()) {
      pattern.occurrences = 0;
      pattern.lastSeen = undefined;
    }
    
    this.logger.info('StateSynchronizer', 'Loop detection state reset');
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.outputChannel.dispose();
    this.contentHashes.clear();
    this.operationChains.clear();
    this.loopPatterns.clear();
  }
}