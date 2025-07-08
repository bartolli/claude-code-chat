/**
 * Factory for creating appropriate loggers based on execution context
 */

import { Logger as ExtensionLogger } from '../core/Logger';
import { logger as webviewLogger } from './webview-logger';

// Global type augmentation for acquireVsCodeApi
declare global {
  var acquireVsCodeApi: (() => any) | undefined;
}

/**
 * Logger interface that works in both extension and webview contexts
 */
export interface ILogger {
  /**
   * Log debug information
   */
  debug(message: string, ...args: any[]): void;
  /**
   * Log general information
   */
  info(message: string, ...args: any[]): void;
  /**
   * Log warnings
   */
  warn(message: string, ...args: any[]): void;
  /**
   * Log errors
   */
  error(message: string, ...args: any[]): void;
}

/**
 * Extension context logger adapter
 */
class ExtensionLoggerAdapter implements ILogger {
  /**
   * Creates an adapter for the extension logger
   * @param category - The logging category
   */
  constructor(private category: string) {}

  debug(message: string, ...args: any[]): void {
    ExtensionLogger.getInstance().debug(this.category, message, args.length > 0 ? args : undefined);
  }

  info(message: string, ...args: any[]): void {
    ExtensionLogger.getInstance().info(this.category, message, args.length > 0 ? args : undefined);
  }

  warn(message: string, ...args: any[]): void {
    ExtensionLogger.getInstance().warn(this.category, message, args.length > 0 ? args : undefined);
  }

  error(message: string, ...args: any[]): void {
    const error = args.find((arg) => arg instanceof Error) as Error | undefined;
    const data = args.filter((arg) => !(arg instanceof Error));
    ExtensionLogger.getInstance().error(
      this.category,
      message,
      error,
      data.length > 0 ? data : undefined
    );
  }
}

/**
 * Webview context logger adapter
 */
class WebviewLoggerAdapter implements ILogger {
  debug(message: string, ...args: any[]): void {
    webviewLogger.debug(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    webviewLogger.info(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    webviewLogger.warn(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    webviewLogger.error(message, ...args);
  }
}

/**
 * Creates an appropriate logger based on the current context
 * @param category - Optional category for the logger
 * @returns A logger instance appropriate for the current context
 */
export function createLogger(category?: string): ILogger {
  // Check if we're in VS Code extension context
  // In webview context, acquireVsCodeApi is defined as a global
  if (typeof globalThis.acquireVsCodeApi === 'undefined' && typeof require !== 'undefined') {
    // We're in extension context
    return new ExtensionLoggerAdapter(category || 'General');
  } else {
    // We're in webview context
    return new WebviewLoggerAdapter();
  }
}

/**
 * No-op logger for example/demo code
 */
export class NoOpLogger implements ILogger {
  debug(_message: string, ..._args: any[]): void {
    // No-op
  }

  info(_message: string, ..._args: any[]): void {
    // No-op
  }

  warn(_message: string, ..._args: any[]): void {
    // No-op
  }

  error(_message: string, ..._args: any[]): void {
    // No-op
  }
}

/**
 * Example logger that stores messages for documentation
 */
export class ExampleLogger implements ILogger {
  private logs: Array<{
    /** Log level */
    level: string;
    /** Log message */
    message: string;
    /** Additional arguments */
    args: any[];
  }> = [];

  debug(message: string, ...args: any[]): void {
    this.logs.push({ level: 'debug', message, args });
  }

  info(message: string, ...args: any[]): void {
    this.logs.push({ level: 'info', message, args });
  }

  warn(message: string, ...args: any[]): void {
    this.logs.push({ level: 'warn', message, args });
  }

  error(message: string, ...args: any[]): void {
    this.logs.push({ level: 'error', message, args });
  }

  /**
   * Get all logged messages for documentation
   * @returns Array of logged messages
   */
  getLogs(): Array<{
    /** Log level */
    level: string;
    /** Log message */
    message: string;
    /** Additional arguments */
    args: any[];
  }> {
    return this.logs;
  }
}
