/**
 * Simple logger for webview context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Configuration for the webview logger
 */
interface LoggerConfig {
  /**
   * Minimum log level to output
   */
  level: LogLevel;
  /**
   * Whether to include timestamps in log output
   */
  includeTimestamp: boolean;
  /**
   * Prefix for all log messages
   */
  prefix: string;
}

/**
 * Simple logger for webview-side code
 */
export class WebviewLogger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    includeTimestamp: true,
    prefix: 'IdeMessenger',
  };

  /**
   * Configure the logger
   * @param config - Partial configuration to merge with existing config
   */
  static configure(config: Partial<LoggerConfig>) {
    WebviewLogger.config = { ...WebviewLogger.config, ...config };
  }

  /**
   * Format a log message with optional timestamp and prefix
   * @param level - Log level string (e.g., '[DEBUG]')
   * @param message - The message to format
   * @returns Formatted log message string
   */
  private static format(level: string, message: string): string {
    const parts: string[] = [];

    if (WebviewLogger.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (WebviewLogger.config.prefix) {
      parts.push(`${WebviewLogger.config.prefix}:`);
    }

    parts.push(level);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Log a debug message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  static debug(message: string, ...args: any[]) {
    if (WebviewLogger.config.level <= LogLevel.DEBUG) {
       
      console.log(WebviewLogger.format('[DEBUG]', message), ...args);
    }
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  static info(message: string, ...args: any[]) {
    if (WebviewLogger.config.level <= LogLevel.INFO) {
       
      console.log(WebviewLogger.format('[INFO]', message), ...args);
    }
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  static warn(message: string, ...args: any[]) {
    if (WebviewLogger.config.level <= LogLevel.WARN) {
       
      console.warn(WebviewLogger.format('[WARN]', message), ...args);
    }
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  static error(message: string, ...args: any[]) {
    if (WebviewLogger.config.level <= LogLevel.ERROR) {
       
      console.error(WebviewLogger.format('[ERROR]', message), ...args);
    }
  }
}

// Export a convenience instance
export const logger = WebviewLogger;
