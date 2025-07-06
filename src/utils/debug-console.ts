/**
 * Debug console utilities to filter extension logs
 */

import { Logger } from '../core/Logger';

export class DebugConsole {
  private static originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  private static logger: Logger | null = null;
  private static filterPatterns = [
    /^\(node:\d+\) \[DEP\d+\]/,  // Node deprecation warnings
    /TreeError \[DebugRepl\]/,     // VS Code internal tree errors
    /extensionHostProcess\.js/,     // Extension host internal logs (unless our code)
    /NODE_ENV undefined/,          // Environment variable logs
    /ChatGPT extension/,           // Other extension logs
    /Checking if catppuccin/,      // Theme checks
    /catppuccin/i                  // Theme related logs
  ];

  /**
   * Initialize filtered console logging
   */
  public static initialize(logger: Logger, enabled: boolean = true): void {
    this.logger = logger;
    
    if (!enabled) {
      return;
    }

    // Only show STEP3 logs and errors in console
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      
      // Always show our extension logs
      if (message.includes('STEP3:') || message.includes('Claude Code GUI')) {
        this.originalConsole.log(...args);
        return;
      }
      
      // Filter out known noise
      if (this.shouldFilter(message)) {
        return;
      }
      
      // Log everything else to output channel only
      if (this.logger) {
        this.logger.debug('Console', message);
      }
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out known noise
      if (this.shouldFilter(message)) {
        if (this.logger) {
          this.logger.debug('Filtered Error', message);
        }
        return;
      }
      
      // Show real errors
      this.originalConsole.error(...args);
      if (this.logger) {
        this.logger.error('Console', message);
      }
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out deprecation warnings
      if (this.shouldFilter(message)) {
        return;
      }
      
      this.originalConsole.warn(...args);
    };
  }

  /**
   * Check if a message should be filtered
   */
  private static shouldFilter(message: string): boolean {
    return this.filterPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Restore original console
   */
  public static restore(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  /**
   * Add custom filter pattern
   */
  public static addFilter(pattern: RegExp): void {
    this.filterPatterns.push(pattern);
  }
}