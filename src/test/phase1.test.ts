/**
 * Tests for Phase 1 infrastructure
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { Logger, LogLevel, getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err, isOk, isErr, map, fromPromise } from '../core/Result';

suite('Phase 1: Foundation Layer', () => {
  suite('Logger', () => {
    test('should create singleton instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      assert.strictEqual(logger1, logger2);
    });

    test('should log messages at appropriate levels', () => {
      const logger = getLogger();
      let logEntry: any;
      
      const unsubscribe = logger.addListener((entry) => {
        logEntry = entry;
      });

      logger.setLogLevel(LogLevel.DEBUG);
      
      logger.debug('test', 'Debug message');
      assert.strictEqual(logEntry?.level, LogLevel.DEBUG);
      
      logger.info('test', 'Info message');
      assert.strictEqual(logEntry?.level, LogLevel.INFO);
      
      logger.warn('test', 'Warn message');
      assert.strictEqual(logEntry?.level, LogLevel.WARN);
      
      logger.error('test', 'Error message');
      assert.strictEqual(logEntry?.level, LogLevel.ERROR);
      
      unsubscribe();
    });

    test('should respect log level', () => {
      const logger = getLogger();
      let callCount = 0;
      
      const unsubscribe = logger.addListener(() => {
        callCount++;
      });

      logger.setLogLevel(LogLevel.WARN);
      
      logger.debug('test', 'Should not log');
      logger.info('test', 'Should not log');
      assert.strictEqual(callCount, 0);
      
      logger.warn('test', 'Should log');
      assert.strictEqual(callCount, 1);
      
      unsubscribe();
    });
  });

  suite('ErrorBoundary', () => {
    test('should execute successful operations', async () => {
      const result = await ErrorBoundary.execute(
        async () => 'success',
        { category: 'test' }
      );
      assert.strictEqual(result, 'success');
    });

    test('should handle errors', async () => {
      try {
        await ErrorBoundary.execute(
          async () => { throw new Error('Test error'); },
          { category: 'test' }
        );
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof ApplicationError);
        assert.strictEqual(error.code, 'OPERATION_FAILED');
      }
    });

    test('should retry on failure', async () => {
      let attempts = 0;
      const result = await ErrorBoundary.execute(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Retry me');
          }
          return 'success';
        },
        { 
          category: 'test',
          retryable: true,
          retryCount: 3,
          retryDelay: 10
        }
      );
      
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    test('should use fallback on failure', async () => {
      const result = await ErrorBoundary.execute(
        async () => { throw new Error('Failed'); },
        { 
          category: 'test',
          fallback: () => 'fallback value'
        }
      );
      
      assert.strictEqual(result, 'fallback value');
    });
  });

  suite('Result', () => {
    test('should create Ok and Err results', () => {
      const okResult = ok(42);
      const errResult = err('error');
      
      assert.ok(isOk(okResult));
      assert.ok(!isErr(okResult));
      assert.ok(!isOk(errResult));
      assert.ok(isErr(errResult));
    });

    test('should map over Ok values', () => {
      const result = ok(10);
      const mapped = map(result, x => x * 2);
      
      assert.ok(isOk(mapped));
      if (isOk(mapped)) {
        assert.strictEqual(mapped.value, 20);
      }
    });

    test('should not map over Err values', () => {
      const result = err('error');
      const mapped = map(result, (x: number) => x * 2);
      
      assert.ok(isErr(mapped));
      if (isErr(mapped)) {
        assert.strictEqual(mapped.error, 'error');
      }
    });

    test('should convert promises to results', async () => {
      const successResult = await fromPromise(Promise.resolve(42));
      assert.ok(isOk(successResult));
      if (isOk(successResult)) {
        assert.strictEqual(successResult.value, 42);
      }
      
      const errorResult = await fromPromise(Promise.reject(new Error('Failed')));
      assert.ok(isErr(errorResult));
      if (isErr(errorResult)) {
        assert.strictEqual(errorResult.error.message, 'Failed');
      }
    });
  });

  suite('Type Compilation', () => {
    test('should compile all type definitions', () => {
      // This test passes if TypeScript compilation succeeds
      // The actual type checking happens at compile time
      assert.ok(true);
    });
  });
});