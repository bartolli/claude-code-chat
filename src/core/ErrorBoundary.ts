/**
 * Error boundary and error handling utilities
 */

import { getLogger } from './Logger';

export interface ErrorOptions {
  /**
   * Error category for grouping and handling similar errors
   */
  category: string;
  /**
   * Whether the operation can be retried after failure
   */
  retryable?: boolean;
  /**
   * Maximum number of retry attempts
   */
  retryCount?: number;
  /**
   * Base delay in milliseconds between retry attempts
   */
  retryDelay?: number;
  /**
   * Fallback function to execute if operation fails
   */
  fallback?: () => unknown;
  /**
   * Callback function invoked when an error occurs
   */
  onError?: (error: Error) => void;
}

export interface ErrorContext {
  /**
   * Error code for identifying specific error types
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Error category for grouping similar errors
   */
  category: string;
  /**
   * The original error that was caught
   */
  originalError: Error;
  /**
   * Whether the error condition can be retried
   */
  retryable: boolean;
  /**
   * Number of retry attempts made before failure
   */
  retryCount: number;
}

/**
 * Custom error class for application-specific errors with additional context
 */
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly retryable: boolean;
  public readonly context?: unknown;

  /**
   * Creates a new ApplicationError instance
   * @param message - Human-readable error message
   * @param code - Error code for identifying the error type
   * @param category - Category for grouping similar errors
   * @param retryable - Whether the error condition can be retried
   * @param context - Additional context data about the error
   */
  constructor(
    message: string,
    code: string,
    category: string,
    retryable = false,
    context?: unknown
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.context = context;
  }
}

/**
 * Error thrown when an operation is aborted by the user
 */
export class AbortError extends ApplicationError {
  /**
   * Creates a new AbortError instance
   * @param message - Error message describing the abort reason
   */
  constructor(message = 'Operation aborted by user') {
    super(message, ErrorCodes.USER_ABORTED, 'Abort', false);
    this.name = 'AbortError';
  }
}

/**
 * Utility class for handling errors with retry logic and fallback mechanisms
 */
export class ErrorBoundary {
  private static readonly logger = getLogger();

  /**
   * Executes an async operation with error handling, retry logic, and fallback support
   * @param operation - The async operation to execute
   * @param options - Error handling options including retry and fallback configuration
   * @returns The result of the operation or fallback
   */
  public static async execute<T>(operation: () => Promise<T>, options: ErrorOptions): Promise<T> {
    const {
      category,
      retryable = false,
      retryCount = 3,
      retryDelay = 1000,
      fallback,
      onError,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= (retryable ? retryCount : 0)) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        ErrorBoundary.logger.error(
          category,
          `Operation failed (attempt ${attempt + 1}/${retryCount + 1})`,
          lastError
        );

        if (onError) {
          try {
            onError(lastError);
          } catch (callbackError) {
            ErrorBoundary.logger.error(
              category,
              'Error in error callback',
              callbackError instanceof Error ? callbackError : new Error(String(callbackError))
            );
          }
        }

        if (!retryable || attempt >= retryCount) {
          break;
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        ErrorBoundary.logger.info(category, `Retrying in ${delay}ms...`);
        await ErrorBoundary.delay(delay);

        attempt++;
      }
    }

    // If we have a fallback, try it
    if (fallback) {
      try {
        ErrorBoundary.logger.info(category, 'Attempting fallback...');
        return fallback() as T;
      } catch (fallbackError) {
        ErrorBoundary.logger.error(
          category,
          'Fallback failed',
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
        );
      }
    }

    // Re-throw the last error
    throw new ApplicationError(
      lastError?.message || 'Operation failed',
      'OPERATION_FAILED',
      category,
      retryable,
      { originalError: lastError }
    );
  }

  /**
   * Wraps a function with automatic error handling
   * @param fn - The function to wrap
   * @param options - Error handling options
   * @returns The wrapped function with error handling
   */
  public static wrap<T extends (...args: any[]) => any>(fn: T, options: ErrorOptions): T {
    return (async (...args: Parameters<T>) => {
      return ErrorBoundary.execute(() => fn(...args), options);
    }) as T;
  }

  /**
   * Creates a promise that resolves after a specified delay
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after the delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Error code constants
export const ErrorCodes = {
  // General errors
  UNKNOWN: 'UNKNOWN',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',

  // Claude process errors
  CLAUDE_NOT_INSTALLED: 'CLAUDE_NOT_INSTALLED',
  CLAUDE_PROCESS_FAILED: 'CLAUDE_PROCESS_FAILED',
  CLAUDE_AUTHENTICATION_FAILED: 'CLAUDE_AUTHENTICATION_FAILED',
  CLAUDE_RATE_LIMITED: 'CLAUDE_RATE_LIMITED',

  // File system errors
  FILE_READ_FAILED: 'FILE_READ_FAILED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Git errors
  GIT_NOT_INSTALLED: 'GIT_NOT_INSTALLED',
  GIT_OPERATION_FAILED: 'GIT_OPERATION_FAILED',
  GIT_NOT_INITIALIZED: 'GIT_NOT_INITIALIZED',

  // Communication errors
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  MESSAGE_PARSE_FAILED: 'MESSAGE_PARSE_FAILED',
  WEBVIEW_NOT_READY: 'WEBVIEW_NOT_READY',
  TIMEOUT: 'TIMEOUT',

  // User actions
  USER_ABORTED: 'USER_ABORTED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
