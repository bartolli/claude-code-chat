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
  level: LogLevel;
  category: string;
  message: string;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;
  private listeners: ((entry: LogEntry) => void)[] = [];

  private constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Claude Code GUI');
  }

  public static getInstance(outputChannel?: vscode.OutputChannel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(outputChannel);
    }
    return Logger.instance;
  }
  
  public setOutputChannel(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown, error?: Error): void {
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
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error in log listener:', err);
      }
    });

    // Show output channel for errors
    if (level === LogLevel.ERROR) {
      this.outputChannel.show(true);
    }
  }

  public debug(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  public info(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  public warn(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  public error(category: string, message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  public show(): void {
    this.outputChannel.show();
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}

// Helper function for easy access
export function getLogger(outputChannel?: vscode.OutputChannel): Logger {
  return Logger.getInstance(outputChannel);
}