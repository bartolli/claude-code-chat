/**
 * Error boundary and error handling utilities
 */

import { getLogger } from './Logger';

export interface ErrorOptions {
  category: string;
  retryable?: boolean;
  retryCount?: number;
  retryDelay?: number;
  fallback?: () => unknown;
  onError?: (error: Error) => void;
}

export interface ErrorContext {
  code: string;
  message: string;
  category: string;
  originalError: Error;
  retryable: boolean;
  retryCount: number;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly retryable: boolean;
  public readonly context?: unknown;

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

export class AbortError extends ApplicationError {
  constructor(message = 'Operation aborted by user') {
    super(message, ErrorCodes.USER_ABORTED, 'Abort', false);
    this.name = 'AbortError';
  }
}

export class ErrorBoundary {
  private static readonly logger = getLogger();

  public static async execute<T>(
    operation: () => Promise<T>,
    options: ErrorOptions
  ): Promise<T> {
    const { category, retryable = false, retryCount = 3, retryDelay = 1000, fallback, onError } = options;
    
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

  public static wrap<T extends (...args: any[]) => any>(
    fn: T,
    options: ErrorOptions
  ): T {
    return (async (...args: Parameters<T>) => {
      return ErrorBoundary.execute(() => fn(...args), options);
    }) as T;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];