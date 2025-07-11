import { Logger } from '../core/Logger';
import * as vscode from 'vscode';

/**
 * Represents a tool execution session
 */
export interface ToolExecution {
  /** Unique tool execution ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool input parameters */
  input: any;
  /** When the tool started executing */
  startTime: Date;
  /** When the tool completed (if completed) */
  endTime?: Date;
  /** Tool execution result */
  result?: any;
  /** Whether the execution resulted in an error */
  isError: boolean;
  /** Current execution status */
  status: 'calling' | 'complete' | 'timeout' | 'error';
  /** Parent tool use ID for nested tools */
  parentToolUseId?: string;
  /** Session ID this tool belongs to */
  sessionId?: string;
  /** Message ID this tool is associated with */
  messageId?: string;
}

/**
 * Tool usage statistics
 */
export interface ToolUsageStats {
  /** Tool name */
  toolName: string;
  /** Total number of times used */
  totalUses: number;
  /** Total successful executions */
  successfulUses: number;
  /** Total failed executions */
  failedUses: number;
  /** Total timeout occurrences */
  timeoutUses: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Minimum execution time in milliseconds */
  minExecutionTime: number;
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;
  /** Most recent execution time */
  lastUsed: Date;
  /** Success rate percentage */
  successRate: number;
}

/**
 * Tool tracking session summary
 */
export interface ToolSession {
  /** Session ID */
  sessionId: string;
  /** Tools used in this session */
  toolsUsed: string[];
  /** Total tool executions */
  totalExecutions: number;
  /** Session start time */
  startTime: Date;
  /** Session end time (if completed) */
  endTime?: Date;
  /** Session duration in milliseconds */
  duration?: number;
  /** Whether session is currently active */
  isActive: boolean;
}

/**
 * Comprehensive tool tracking and analytics system
 */
export class ToolTracker {
  private activeExecutions: Map<string, ToolExecution> = new Map();
  private completedExecutions: Array<ToolExecution> = [];
  private toolStats: Map<string, ToolUsageStats> = new Map();
  private activeSessions: Map<string, ToolSession> = new Map();
  private completedSessions: Array<ToolSession> = [];
  private logger: Logger;
  private outputChannel: vscode.OutputChannel;

  /**
   * Creates a new ToolTracker instance
   * @param logger - Logger instance for output
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.outputChannel = vscode.window.createOutputChannel('Claude Code - Tool Tracker');
  }

  /**
   * Start tracking a new tool execution
   * @param toolId - Unique tool execution ID
   * @param toolName - Name of the tool
   * @param input - Tool input parameters
   * @param sessionId - Session ID (optional)
   * @param messageId - Message ID (optional)
   * @param parentToolUseId - Parent tool ID for nested tools (optional)
   */
  startToolExecution(
    toolId: string,
    toolName: string,
    input: any,
    sessionId?: string,
    messageId?: string,
    parentToolUseId?: string
  ): void {
    const execution: ToolExecution = {
      id: toolId,
      name: toolName,
      input: input,
      startTime: new Date(),
      isError: false,
      status: 'calling',
      parentToolUseId,
      sessionId,
      messageId,
    };

    this.activeExecutions.set(toolId, execution);
    
    // Track session if provided
    if (sessionId) {
      this.trackSessionToolUse(sessionId, toolName);
    }

    this.logger.debug('ToolTracker', `Started tracking tool execution: ${toolName} (${toolId})`);
    this.outputChannel.appendLine(
      `[TOOL START] ${toolName} (${toolId}) at ${execution.startTime.toISOString()}`
    );
  }

  /**
   * Complete a tool execution
   * @param toolId - Tool execution ID
   * @param result - Tool execution result
   * @param isError - Whether the execution resulted in an error
   * @param status - Final execution status
   */
  completeToolExecution(
    toolId: string,
    result: any,
    isError: boolean = false,
    status: 'complete' | 'timeout' | 'error' = 'complete'
  ): void {
    const execution = this.activeExecutions.get(toolId);
    if (!execution) {
      this.logger.warn('ToolTracker', `Attempted to complete unknown tool execution: ${toolId}`);
      return;
    }

    execution.endTime = new Date();
    execution.result = result;
    execution.isError = isError;
    execution.status = status;

    // Move to completed executions
    this.activeExecutions.delete(toolId);
    this.completedExecutions.push(execution);

    // Update statistics
    this.updateToolStats(execution);

    // Keep completed executions manageable (last 1000)
    if (this.completedExecutions.length > 1000) {
      this.completedExecutions = this.completedExecutions.slice(-500);
    }

    const duration = execution.endTime.getTime() - execution.startTime.getTime();
    this.logger.debug(
      'ToolTracker',
      `Completed tool execution: ${execution.name} (${toolId}) in ${duration}ms`
    );
    this.outputChannel.appendLine(
      `[TOOL COMPLETE] ${execution.name} (${toolId}) - ${status} in ${duration}ms - Error: ${isError}`
    );
  }

  /**
   * Handle timeout for a tool execution
   * @param toolId - Tool execution ID
   */
  timeoutToolExecution(toolId: string): void {
    this.completeToolExecution(toolId, '(No response received)', true, 'timeout');
  }

  /**
   * Start tracking a new session
   * @param sessionId - Session identifier
   */
  startSession(sessionId: string): void {
    if (this.activeSessions.has(sessionId)) {
      this.logger.warn('ToolTracker', `Session ${sessionId} is already being tracked`);
      return;
    }

    const session: ToolSession = {
      sessionId,
      toolsUsed: [],
      totalExecutions: 0,
      startTime: new Date(),
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);
    this.logger.debug('ToolTracker', `Started tracking session: ${sessionId}`);
  }

  /**
   * End tracking for a session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn('ToolTracker', `Attempted to end unknown session: ${sessionId}`);
      return;
    }

    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.isActive = false;

    // Move to completed sessions
    this.activeSessions.delete(sessionId);
    this.completedSessions.push(session);

    // Keep completed sessions manageable (last 100)
    if (this.completedSessions.length > 100) {
      this.completedSessions = this.completedSessions.slice(-50);
    }

    this.logger.debug(
      'ToolTracker',
      `Ended session: ${sessionId} - Duration: ${session.duration}ms - Tools used: ${session.toolsUsed.length}`
    );
  }

  /**
   * Track tool use within a session
   * @param sessionId - Session identifier
   * @param toolName - Name of the tool used
   * @returns Nothing
   */
  private trackSessionToolUse(sessionId: string, toolName: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      // Auto-create session if it doesn't exist
      this.startSession(sessionId);
      return this.trackSessionToolUse(sessionId, toolName);
    }

    session.totalExecutions++;
    if (!session.toolsUsed.includes(toolName)) {
      session.toolsUsed.push(toolName);
    }
  }

  /**
   * Update tool usage statistics
   * @param execution - Completed tool execution
   */
  private updateToolStats(execution: ToolExecution): void {
    const toolName = execution.name;
    let stats = this.toolStats.get(toolName);

    if (!stats) {
      stats = {
        toolName,
        totalUses: 0,
        successfulUses: 0,
        failedUses: 0,
        timeoutUses: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        lastUsed: execution.startTime,
        successRate: 0,
      };
      this.toolStats.set(toolName, stats);
    }

    // Update counters
    stats.totalUses++;
    stats.lastUsed = execution.endTime || execution.startTime;

    if (execution.status === 'complete' && !execution.isError) {
      stats.successfulUses++;
    } else if (execution.status === 'timeout') {
      stats.timeoutUses++;
    } else {
      stats.failedUses++;
    }

    // Update timing statistics
    if (execution.endTime) {
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      stats.minExecutionTime = Math.min(stats.minExecutionTime, duration);
      stats.maxExecutionTime = Math.max(stats.maxExecutionTime, duration);
      
      // Calculate running average
      const totalDuration = stats.averageExecutionTime * (stats.totalUses - 1) + duration;
      stats.averageExecutionTime = totalDuration / stats.totalUses;
    }

    // Update success rate
    stats.successRate = (stats.successfulUses / stats.totalUses) * 100;
  }

  /**
   * Get statistics for a specific tool
   * @param toolName - Name of the tool
   * @returns Tool usage statistics or null if not found
   */
  getToolStats(toolName: string): ToolUsageStats | null {
    return this.toolStats.get(toolName) || null;
  }

  /**
   * Get statistics for all tools
   * @returns Array of tool usage statistics
   */
  getAllToolStats(): ToolUsageStats[] {
    return Array.from(this.toolStats.values());
  }

  /**
   * Get currently active tool executions
   * @returns Array of active tool executions
   */
  getActiveExecutions(): ToolExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get recently completed tool executions
   * @param limit - Maximum number of executions to return (default: 50)
   * @returns Array of recent tool executions
   */
  getRecentExecutions(limit: number = 50): ToolExecution[] {
    return this.completedExecutions.slice(-limit);
  }

  /**
   * Get active sessions
   * @returns Array of active sessions
   */
  getActiveSessions(): ToolSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session statistics
   * @param sessionId - Session identifier
   * @returns Session information or null if not found
   */
  getSession(sessionId: string): ToolSession | null {
    return this.activeSessions.get(sessionId) || 
           this.completedSessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Get comprehensive tracking report
   * @returns Detailed tracking report
   */
  getTrackingReport(): {
    /** Total number of tool executions */
    totalExecutions: number;
    /** Number of currently active executions */
    activeExecutions: number;
    /** Total number of unique tools used */
    totalTools: number;
    /** Number of currently active sessions */
    activeSessions: number;
    /** Average number of tools used per session */
    averageToolsPerSession: number;
    /** Top 5 most used tools */
    topTools: ToolUsageStats[];
    /** Recent tool execution activity */
    recentActivity: ToolExecution[];
  } {
    const activeExecutions = this.activeExecutions.size;
    const totalExecutions = this.completedExecutions.length + activeExecutions;
    const totalTools = this.toolStats.size;
    const activeSessions = this.activeSessions.size;
    
    const completedSessionsWithTools = this.completedSessions.filter(s => s.totalExecutions > 0);
    const averageToolsPerSession = completedSessionsWithTools.length > 0
      ? completedSessionsWithTools.reduce((sum, s) => sum + s.toolsUsed.length, 0) / completedSessionsWithTools.length
      : 0;

    const topTools = this.getAllToolStats()
      .sort((a, b) => b.totalUses - a.totalUses)
      .slice(0, 5);

    const recentActivity = this.getRecentExecutions(10);

    return {
      totalExecutions,
      activeExecutions,
      totalTools,
      activeSessions,
      averageToolsPerSession,
      topTools,
      recentActivity,
    };
  }

  /**
   * Clear all tracking data
   */
  clearTrackingData(): void {
    this.activeExecutions.clear();
    this.completedExecutions = [];
    this.toolStats.clear();
    this.activeSessions.clear();
    this.completedSessions = [];
    
    this.logger.info('ToolTracker', 'Cleared all tracking data');
    this.outputChannel.appendLine('[TOOL TRACKER] Cleared all tracking data');
  }

  /**
   * Export tracking data for analysis
   * @returns JSON string with all tracking data
   */
  exportTrackingData(): string {
    const data = {
      generated: new Date().toISOString(),
      summary: this.getTrackingReport(),
      toolStats: this.getAllToolStats(),
      activeSessions: this.getActiveSessions(),
      completedSessions: this.completedSessions.slice(-20), // Last 20 sessions
      recentExecutions: this.getRecentExecutions(100), // Last 100 executions
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}