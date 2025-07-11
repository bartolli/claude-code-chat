import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToolTracker } from '../../../src/services/ToolTracker';
import { Logger } from '../../../src/core/Logger';
import * as vscode from 'vscode';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      show: vi.fn(),
      hide: vi.fn()
    }))
  }
}));

describe('ToolTracker', () => {
  let toolTracker: ToolTracker;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    } as any;

    toolTracker = new ToolTracker(mockLogger);
  });

  afterEach(() => {
    toolTracker.dispose();
    vi.restoreAllMocks();
  });

  describe('tool execution tracking', () => {
    it('should start tool execution tracking', () => {
      const toolId = 'tool-123';
      const toolName = 'bash';
      const input = { command: 'ls -la' };

      toolTracker.startToolExecution(toolId, toolName, input);

      const activeExecutions = toolTracker.getActiveExecutions();
      expect(activeExecutions).toHaveLength(1);
      expect(activeExecutions[0]).toMatchObject({
        id: toolId,
        name: toolName,
        input: input,
        status: 'calling',
        isError: false
      });
      expect(activeExecutions[0].startTime).toBeInstanceOf(Date);
    });

    it('should complete tool execution tracking', () => {
      const toolId = 'tool-123';
      const toolName = 'bash';
      const input = { command: 'ls -la' };
      const result = 'total 0\ndrwxr-xr-x  3 user  staff  96 Jan  1 12:00 .';

      // Start tracking
      toolTracker.startToolExecution(toolId, toolName, input);
      expect(toolTracker.getActiveExecutions()).toHaveLength(1);

      // Complete tracking
      toolTracker.completeToolExecution(toolId, result, false, 'complete');

      expect(toolTracker.getActiveExecutions()).toHaveLength(0);
      const recentExecutions = toolTracker.getRecentExecutions(1);
      expect(recentExecutions).toHaveLength(1);
      expect(recentExecutions[0]).toMatchObject({
        id: toolId,
        name: toolName,
        result: result,
        status: 'complete',
        isError: false
      });
      expect(recentExecutions[0].endTime).toBeInstanceOf(Date);
    });

    it('should handle tool timeout', () => {
      const toolId = 'tool-timeout';
      const toolName = 'slow-tool';

      toolTracker.startToolExecution(toolId, toolName, {});
      toolTracker.timeoutToolExecution(toolId);

      const recentExecutions = toolTracker.getRecentExecutions(1);
      expect(recentExecutions).toHaveLength(1);
      expect(recentExecutions[0]).toMatchObject({
        id: toolId,
        status: 'timeout',
        isError: true,
        result: '(No response received)'
      });
    });

    it('should handle tool execution with session and message ID', () => {
      const toolId = 'tool-456';
      const toolName = 'grep';
      const sessionId = 'session-123';
      const messageId = 'msg-789';
      const parentToolUseId = 'parent-111';

      toolTracker.startToolExecution(
        toolId, 
        toolName, 
        { pattern: 'test' }, 
        sessionId, 
        messageId, 
        parentToolUseId
      );

      const activeExecutions = toolTracker.getActiveExecutions();
      expect(activeExecutions[0]).toMatchObject({
        sessionId: sessionId,
        messageId: messageId,
        parentToolUseId: parentToolUseId
      });
    });
  });

  describe('tool statistics', () => {
    beforeEach(() => {
      // Complete some tool executions for testing stats
      const tools = [
        { id: 'tool-1', name: 'bash', result: 'success', isError: false },
        { id: 'tool-2', name: 'bash', result: 'success', isError: false },
        { id: 'tool-3', name: 'bash', result: 'error', isError: true },
        { id: 'tool-4', name: 'grep', result: 'match found', isError: false },
      ];

      tools.forEach(tool => {
        toolTracker.startToolExecution(tool.id, tool.name, {});
        // Add small delay to differentiate execution times
        const startTime = Date.now() - Math.random() * 100;
        (toolTracker as any).activeExecutions.get(tool.id).startTime = new Date(startTime);
        
        toolTracker.completeToolExecution(
          tool.id, 
          tool.result, 
          tool.isError, 
          tool.isError ? 'error' : 'complete'
        );
      });
    });

    it('should calculate tool statistics correctly', () => {
      const bashStats = toolTracker.getToolStats('bash');
      expect(bashStats).toBeTruthy();
      expect(bashStats?.totalUses).toBe(3);
      expect(bashStats?.successfulUses).toBe(2);
      expect(bashStats?.failedUses).toBe(1);
      expect(bashStats?.successRate).toBeCloseTo(66.67, 1);

      const grepStats = toolTracker.getToolStats('grep');
      expect(grepStats).toBeTruthy();
      expect(grepStats?.totalUses).toBe(1);
      expect(grepStats?.successRate).toBe(100);
    });

    it('should return all tool statistics', () => {
      const allStats = toolTracker.getAllToolStats();
      expect(allStats).toHaveLength(2);
      
      const toolNames = allStats.map(stat => stat.toolName);
      expect(toolNames).toContain('bash');
      expect(toolNames).toContain('grep');
    });

    it('should return null for unknown tool', () => {
      const unknownStats = toolTracker.getToolStats('unknown-tool');
      expect(unknownStats).toBeNull();
    });
  });

  describe('session tracking', () => {
    it('should start and track session', () => {
      const sessionId = 'session-123';
      
      toolTracker.startSession(sessionId);
      
      const activeSessions = toolTracker.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]).toMatchObject({
        sessionId: sessionId,
        toolsUsed: [],
        totalExecutions: 0,
        isActive: true
      });
      expect(activeSessions[0].startTime).toBeInstanceOf(Date);
    });

    it('should track tool usage within session', () => {
      const sessionId = 'session-456';
      const toolId1 = 'tool-1';
      const toolId2 = 'tool-2';
      
      toolTracker.startSession(sessionId);
      toolTracker.startToolExecution(toolId1, 'bash', {}, sessionId);
      toolTracker.startToolExecution(toolId2, 'grep', {}, sessionId);
      
      const session = toolTracker.getSession(sessionId);
      expect(session?.totalExecutions).toBe(2);
      expect(session?.toolsUsed).toEqual(['bash', 'grep']);
    });

    it('should end session tracking', () => {
      const sessionId = 'session-789';
      
      toolTracker.startSession(sessionId);
      expect(toolTracker.getActiveSessions()).toHaveLength(1);
      
      toolTracker.endSession(sessionId);
      expect(toolTracker.getActiveSessions()).toHaveLength(0);
      
      const session = toolTracker.getSession(sessionId);
      expect(session?.isActive).toBe(false);
      expect(session?.endTime).toBeInstanceOf(Date);
      expect(session?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should auto-create session when tracking tool use', () => {
      const sessionId = 'auto-session';
      const toolId = 'tool-auto';
      
      // Start tool without explicitly creating session
      toolTracker.startToolExecution(toolId, 'bash', {}, sessionId);
      
      const session = toolTracker.getSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.totalExecutions).toBe(1);
    });
  });

  describe('tracking report', () => {
    beforeEach(() => {
      // Set up some test data
      toolTracker.startSession('session-1');
      toolTracker.startToolExecution('tool-1', 'bash', {}, 'session-1');
      toolTracker.completeToolExecution('tool-1', 'result', false, 'complete');
      toolTracker.startToolExecution('tool-2', 'grep', {}, 'session-1');
      // Leave tool-2 active
    });

    it('should generate comprehensive tracking report', () => {
      const report = toolTracker.getTrackingReport();
      
      expect(report).toHaveProperty('totalExecutions');
      expect(report).toHaveProperty('activeExecutions');
      expect(report).toHaveProperty('totalTools');
      expect(report).toHaveProperty('activeSessions');
      expect(report).toHaveProperty('topTools');
      expect(report).toHaveProperty('recentActivity');
      
      expect(report.totalExecutions).toBe(2);
      expect(report.activeExecutions).toBe(1);
      expect(report.activeSessions).toBe(1);
      // We have bash and grep tools from the setup
      expect(report.totalTools).toBeGreaterThanOrEqual(1);
    });

    it('should export tracking data', () => {
      const exportedData = toolTracker.exportTrackingData();
      const parsed = JSON.parse(exportedData);
      
      expect(parsed).toHaveProperty('generated');
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('toolStats');
      expect(parsed).toHaveProperty('activeSessions');
      expect(parsed).toHaveProperty('recentExecutions');
      
      expect(parsed.summary.totalExecutions).toBe(2);
      expect(parsed.activeSessions).toHaveLength(1);
    });
  });

  describe('data management', () => {
    it('should clear all tracking data', () => {
      // Add some data
      toolTracker.startSession('session-clear');
      toolTracker.startToolExecution('tool-clear', 'bash', {}, 'session-clear');
      
      expect(toolTracker.getActiveSessions()).toHaveLength(1);
      expect(toolTracker.getActiveExecutions()).toHaveLength(1);
      
      // Clear data
      toolTracker.clearTrackingData();
      
      expect(toolTracker.getActiveSessions()).toHaveLength(0);
      expect(toolTracker.getActiveExecutions()).toHaveLength(0);
      expect(toolTracker.getAllToolStats()).toHaveLength(0);
    });

    it('should limit stored completed executions', () => {
      // This test verifies the cleanup mechanism (would need more executions in real scenario)
      for (let i = 0; i < 5; i++) {
        toolTracker.startToolExecution(`tool-${i}`, 'test', {});
        toolTracker.completeToolExecution(`tool-${i}`, 'result', false, 'complete');
      }
      
      const recent = toolTracker.getRecentExecutions(10);
      expect(recent).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should handle completing unknown tool execution', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      toolTracker.completeToolExecution('unknown-tool', 'result', false, 'complete');
      
      // Should not throw, just log warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ToolTracker', 
        'Attempted to complete unknown tool execution: unknown-tool'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle ending unknown session', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      toolTracker.endSession('unknown-session');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ToolTracker', 
        'Attempted to end unknown session: unknown-session'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle starting duplicate session', () => {
      const sessionId = 'duplicate-session';
      
      toolTracker.startSession(sessionId);
      toolTracker.startSession(sessionId); // Duplicate
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ToolTracker', 
        `Session ${sessionId} is already being tracked`
      );
    });
  });
});