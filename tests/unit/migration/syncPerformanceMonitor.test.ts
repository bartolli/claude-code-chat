import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncPerformanceMonitor } from '../../../src/migration/SyncPerformanceMonitor';
import { Logger } from '../../../src/core/Logger';

// Mock logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
} as any);

describe('SyncPerformanceMonitor', () => {
  let monitor: SyncPerformanceMonitor;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    monitor = new SyncPerformanceMonitor(mockLogger);
  });

  describe('basic metrics tracking', () => {
    it('should track sync operations', () => {
      monitor.recordSync('message/update', 'toWebview', 5);
      monitor.recordSync('message/thinking', 'toWebview', 3);
      
      const stats = monitor.getStats();
      expect(stats.totalSyncs).toBe(2);
      expect(stats.averageDuration).toBe(4);
      expect(stats.maxDuration).toBe(5);
      expect(stats.errorCount).toBe(0);
    });

    it('should track error operations', () => {
      monitor.recordSync('message/update', 'toWebview', 5, true);
      monitor.recordSync('message/thinking', 'toWebview', 3);
      
      const stats = monitor.getStats();
      expect(stats.errorCount).toBe(1);
      expect(stats.totalSyncs).toBe(2);
    });

    it('should track message type counts', () => {
      monitor.recordSync('message/update', 'toWebview', 5);
      monitor.recordSync('message/update', 'toWebview', 3);
      monitor.recordSync('message/thinking', 'toWebview', 4);
      
      const stats = monitor.getStats();
      expect(stats.messageTypeCounts['message/update']).toBe(2);
      expect(stats.messageTypeCounts['message/thinking']).toBe(1);
    });
  });

  describe('sampling behavior', () => {
    it('should always store errors regardless of sampling', () => {
      // Record 100 errors
      for (let i = 0; i < 100; i++) {
        monitor.recordSync('error/test', 'toWebview', 2, true);
      }
      
      const detailed = monitor.getDetailedMetrics(100);
      const errorMetrics = detailed.filter(m => m.error);
      
      // All errors should be stored (up to buffer limit)
      expect(errorMetrics.length).toBeGreaterThan(90);
    });

    it('should always store slow operations', () => {
      // Record some slow operations
      monitor.recordSync('slow/op1', 'toWebview', 15);
      monitor.recordSync('slow/op2', 'toWebview', 20);
      monitor.recordSync('slow/op3', 'toWebview', 50);
      
      const detailed = monitor.getDetailedMetrics(10);
      const slowMetrics = detailed.filter(m => m.duration > 10);
      
      expect(slowMetrics.length).toBe(3);
    });

    it('should sample normal operations at ~10% rate', () => {
      // Record 1000 normal operations
      for (let i = 0; i < 1000; i++) {
        monitor.recordSync('normal/op', 'toWebview', 2);
      }
      
      const detailed = monitor.getDetailedMetrics(1000);
      const normalMetrics = detailed.filter(m => !m.error && m.duration <= 10);
      
      // Should be roughly 10% of 1000, but not more than buffer size
      expect(normalMetrics.length).toBeGreaterThan(50);
      expect(normalMetrics.length).toBeLessThan(200);
    });
  });

  describe('circular buffer behavior', () => {
    it('should overwrite old entries when buffer is full', () => {
      // Fill buffer with more than MAX_METRICS
      for (let i = 0; i < 1500; i++) {
        monitor.recordSync(`message/test${i}`, 'toWebview', 15); // All slow to ensure storage
      }
      
      const detailed = monitor.getDetailedMetrics(1500);
      expect(detailed.length).toBe(1000); // MAX_METRICS
      
      // Most recent entries should be present
      const lastEntry = detailed[detailed.length - 1];
      expect(lastEntry.messageType).toContain('test149'); // Last ~1000 entries
    });
  });

  describe('health checks', () => {
    it('should report healthy when metrics are good', () => {
      monitor.recordSync('message/update', 'toWebview', 2);
      monitor.recordSync('message/thinking', 'toWebview', 3);
      
      const health = monitor.isHealthy();
      expect(health.healthy).toBe(true);
      expect(health.reason).toBeUndefined();
    });

    it('should report unhealthy when error rate is high', () => {
      // 2 errors out of 10 = 20% error rate
      for (let i = 0; i < 8; i++) {
        monitor.recordSync('message/update', 'toWebview', 2);
      }
      monitor.recordSync('message/error', 'toWebview', 2, true);
      monitor.recordSync('message/error', 'toWebview', 2, true);
      
      const health = monitor.isHealthy();
      expect(health.healthy).toBe(false);
      expect(health.reason).toContain('Error rate too high');
    });

    it('should report unhealthy when average duration is high', () => {
      monitor.recordSync('message/slow1', 'toWebview', 10);
      monitor.recordSync('message/slow2', 'toWebview', 15);
      monitor.recordSync('message/slow3', 'toWebview', 20);
      
      const health = monitor.isHealthy();
      expect(health.healthy).toBe(false);
      expect(health.reason).toContain('Average sync too slow');
    });

    it('should report unhealthy when max duration exceeds limit', () => {
      monitor.recordSync('message/normal', 'toWebview', 2);
      monitor.recordSync('message/spike', 'toWebview', 150);
      
      const health = monitor.isHealthy();
      expect(health.healthy).toBe(false);
      expect(health.reason).toContain('Max sync too slow');
    });
  });

  describe('reset functionality', () => {
    it('should clear all metrics', () => {
      monitor.recordSync('message/update', 'toWebview', 5);
      monitor.recordSync('message/thinking', 'toWebview', 3, true);
      
      monitor.reset();
      
      const stats = monitor.getStats();
      expect(stats.totalSyncs).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.maxDuration).toBe(0);
      expect(Object.keys(stats.messageTypeCounts)).toHaveLength(0);
    });
  });

  describe('export functionality', () => {
    it('should export comprehensive metrics', () => {
      // Use slow operations to ensure they're all stored
      monitor.recordSync('message/update', 'toWebview', 15);
      monitor.recordSync('message/thinking', 'toWebview', 12);
      monitor.recordSync('message/error', 'toWebview', 11, true);
      
      const exported = monitor.exportMetrics();
      
      expect(exported.stats.totalSyncs).toBe(3);
      expect(exported.stats.errorCount).toBe(1);
      expect(exported.recentMetrics).toHaveLength(3);
      expect(exported.health.healthy).toBe(false); // Should be unhealthy due to high average
    });
  });

  describe('performance characteristics', () => {
    it('should handle high-frequency operations efficiently', () => {
      const start = performance.now();
      
      // Record 10,000 operations
      for (let i = 0; i < 10000; i++) {
        monitor.recordSync('message/test', 'toWebview', 2);
      }
      
      const duration = performance.now() - start;
      
      // Should complete very quickly (< 50ms for 10k operations)
      expect(duration).toBeLessThan(50);
      
      // Stats should still be accurate
      const stats = monitor.getStats();
      expect(stats.totalSyncs).toBe(10000);
      expect(stats.averageDuration).toBe(2);
    });

    it('should have minimal memory footprint', () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const baseMemory = process.memoryUsage().heapUsed;
      
      // Record many operations with limited unique message types
      for (let i = 0; i < 100000; i++) {
        monitor.recordSync(`type${i % 10}`, 'toWebview', i % 10);
      }
      
      const memoryGrowth = process.memoryUsage().heapUsed - baseMemory;
      
      // Memory growth should be minimal (< 10MB for 100k operations)
      // Circular buffer + 10 message type counters should be very small
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});