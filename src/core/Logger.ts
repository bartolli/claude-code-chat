/**
 * Centralized logging service for the extension
 */

import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  /**
   * Severity level of the log entry
   */
  level: LogLevel;
  /**
   * Category to group related log entries
   */
  category: string;
  /**
   * Log message content
   */
  message: string;
  /**
   * When the log entry was created
   */
  timestamp: Date;
  /**
   * Optional additional data associated with the log entry
   */
  data?: unknown;
  /**
   * Optional error object if this is an error log
   */
  error?: Error;
}

/**
 * Singleton logger class that provides centralized logging for the extension
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;
  private listeners: ((entry: LogEntry) => void)[] = [];

  /**
   * Private constructor to enforce singleton pattern
   * @param outputChannel - VS Code output channel for log output
   */
  private constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Claude Code GUI');
  }

  /**
   * Gets the singleton Logger instance
   * @param outputChannel - Optional VS Code output channel
   * @returns The Logger singleton instance
   */
  public static getInstance(outputChannel?: vscode.OutputChannel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(outputChannel);
    }
    return Logger.instance;
  }

  /**
   * Sets a new output channel for logging
   * @param outputChannel - VS Code output channel to use
   */
  public setOutputChannel(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  /**
   * Sets the minimum log level for output
   * @param level - Minimum log level to display
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Adds a listener for log events
   * @param listener - Function called when a log entry is created
   * @returns Function to remove the listener
   */
  public addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Core logging method that handles all log levels
   * @param level - Log severity level
   * @param category - Category for grouping logs
   * @param message - Log message
   * @param data - Optional additional data
   * @param error - Optional error object
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      category,
      message,
      timestamp: new Date(),
      ...(data !== undefined && { data }),
      ...(error !== undefined && { error }),
    };

    // Format log message
    const levelStr = LogLevel[level];
    const timestamp = entry.timestamp.toISOString();
    const formattedMessage = `[${timestamp}] [${levelStr}] [${category}] ${message}`;

    // Write to output channel
    this.outputChannel.appendLine(formattedMessage);

    if (data) {
      this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }

    if (error) {
      this.outputChannel.appendLine(`  Error: ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`  Stack: ${error.stack}`);
      }
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        // Can't use this.error here as it would notify listeners again
        // Write directly to output channel to avoid infinite recursion
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.outputChannel.appendLine(`[ERROR] [Logger] Error in log listener: ${errorMessage}`);
      }
    });

    // Show output channel for errors
    if (level === LogLevel.ERROR) {
      this.outputChannel.show(true);
    }
  }

  /**
   * Logs a debug-level message
   * @param category - Category for grouping logs
   * @param message - Debug message
   * @param data - Optional additional data
   */
  public debug(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Logs an info-level message
   * @param category - Category for grouping logs
   * @param message - Info message
   * @param data - Optional additional data
   */
  public info(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Logs a warning-level message
   * @param category - Category for grouping logs
   * @param message - Warning message
   * @param data - Optional additional data
   */
  public warn(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Logs an error-level message
   * @param category - Category for grouping logs
   * @param message - Error message
   * @param error - Optional error object
   * @param data - Optional additional data
   */
  public error(category: string, message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * Shows the output channel in VS Code
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Disposes of the logger and its output channel
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}

// Helper function for easy access
/**
 * Gets the singleton Logger instance
 * @param outputChannel - Optional VS Code output channel
 * @returns The Logger singleton instance
 */
export function getLogger(outputChannel?: vscode.OutputChannel): Logger {
  return Logger.getInstance(outputChannel);
}
