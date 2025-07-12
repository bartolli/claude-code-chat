import { Logger } from '../core/Logger';

/**
 * Lightweight sync metrics - only essential data
 */
export interface SyncMetrics {
  messageType: string;
  direction: 'toWebview' | 'fromWebview';
  duration: number;
  timestamp: number;
  error?: boolean;
}

/**
 * Aggregated performance stats
 */
export interface PerformanceStats {
  totalSyncs: number;
  errorCount: number;
  averageDuration: number;
  maxDuration: number;
  messageTypeCounts: Record<string, number>;
}

/**
 * Lightweight performance monitor for sync operations
 * Designed for minimal overhead - no complex calculations during sync
 */
export class SyncPerformanceMonitor {
  private static readonly MAX_METRICS = 1000; // Circular buffer size
  private static readonly SAMPLE_RATE = 0.1; // Sample 10% of normal operations
  
  private metrics: SyncMetrics[] = [];
  private nextIndex = 0;
  private totalCount = 0;
  private errorCount = 0;
  private sumDuration = 0;
  private maxDuration = 0;
  
  // Pre-allocated for zero allocation tracking
  private messageTypeCounts = new Map<string, number>();
  
  constructor(private logger: Logger) {
    // Pre-allocate circular buffer
    this.metrics = new Array(SyncPerformanceMonitor.MAX_METRICS);
  }

  /**
   * Record a sync operation - extremely lightweight
   * @param messageType - Type of message being synced
   * @param direction - Sync direction
   * @param duration - Operation duration in ms
   * @param error - Whether operation failed
   */
  recordSync(
    messageType: string,
    direction: 'toWebview' | 'fromWebview',
    duration: number,
    error = false
  ): void {
    // Always track totals (cheap operations)
    this.totalCount++;
    this.sumDuration += duration;
    
    if (error) {
      this.errorCount++;
    }
    
    if (duration > this.maxDuration) {
      this.maxDuration = duration;
    }
    
    // Update message type count
    const count = this.messageTypeCounts.get(messageType) || 0;
    this.messageTypeCounts.set(messageType, count + 1);
    
    // Only store detailed metrics for errors, slow ops, or samples
    const shouldStore = error || 
                       duration > 10 || 
                       Math.random() < SyncPerformanceMonitor.SAMPLE_RATE;
    
    if (shouldStore) {
      // Circular buffer - overwrite old entries
      this.metrics[this.nextIndex] = {
        messageType,
        direction,
        duration,
        timestamp: Date.now(),
        error
      };
      this.nextIndex = (this.nextIndex + 1) % SyncPerformanceMonitor.MAX_METRICS;
    }
  }

  /**
   * Get performance statistics - calculated on demand, not during sync
   */
  getStats(): PerformanceStats {
    const messageTypeCounts: Record<string, number> = {};
    this.messageTypeCounts.forEach((count, type) => {
      messageTypeCounts[type] = count;
    });
    
    return {
      totalSyncs: this.totalCount,
      errorCount: this.errorCount,
      averageDuration: this.totalCount > 0 ? this.sumDuration / this.totalCount : 0,
      maxDuration: this.maxDuration,
      messageTypeCounts
    };
  }

  /**
   * Get detailed metrics for analysis - only when needed
   * @param limit - Maximum number of metrics to return
   */
  getDetailedMetrics(limit = 100): SyncMetrics[] {
    const metrics: SyncMetrics[] = [];
    const startIdx = this.nextIndex;
    
    for (let i = 0; i < Math.min(limit, SyncPerformanceMonitor.MAX_METRICS); i++) {
      const idx = (startIdx - i - 1 + SyncPerformanceMonitor.MAX_METRICS) % SyncPerformanceMonitor.MAX_METRICS;
      const metric = this.metrics[idx];
      if (metric) {
        metrics.push(metric);
      }
    }
    
    return metrics.reverse();
  }

  /**
   * Check if performance is within acceptable bounds
   */
  isHealthy(): { healthy: boolean; reason?: string } {
    const stats = this.getStats();
    
    if (stats.errorCount > stats.totalSyncs * 0.01) {
      return { healthy: false, reason: `Error rate too high: ${(stats.errorCount / stats.totalSyncs * 100).toFixed(2)}%` };
    }
    
    if (this.maxDuration > 100) {
      return { healthy: false, reason: `Max sync too slow: ${this.maxDuration}ms` };
    }
    
    if (stats.averageDuration > 5) {
      return { healthy: false, reason: `Average sync too slow: ${stats.averageDuration.toFixed(2)}ms` };
    }
    
    return { healthy: true };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = new Array(SyncPerformanceMonitor.MAX_METRICS);
    this.nextIndex = 0;
    this.totalCount = 0;
    this.errorCount = 0;
    this.sumDuration = 0;
    this.maxDuration = 0;
    this.messageTypeCounts.clear();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    stats: PerformanceStats;
    recentMetrics: SyncMetrics[];
    health: { healthy: boolean; reason?: string };
  } {
    return {
      stats: this.getStats(),
      recentMetrics: this.getDetailedMetrics(100),
      health: this.isHealthy()
    };
  }
}