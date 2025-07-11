import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionMapper, WebviewAction } from '../../../src/migration/ActionMapper';
import * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  ExtensionContext: vi.fn(),
}));

// Mock FeatureFlagManager
vi.mock('../../../src/migration/FeatureFlags', () => ({
  FeatureFlagManager: {
    getInstance: vi.fn(() => ({
      isEnabled: vi.fn((flag: string) => {
        // Enable action mapping by default for tests
        if (flag === 'enableActionMapping') {return true;}
        if (flag === 'logStateTransitions') {return false;}
        if (flag === 'logUnmappedActions') {return false;}
        return false;
      }),
    })),
  },
}));

// Mock Redux action creators
vi.mock('../../../src/state/slices/sessionSlice', () => ({
  messageAdded: vi.fn((payload) => ({ type: 'session/messageAdded', payload })),
  messageUpdated: vi.fn((payload) => ({ type: 'session/messageUpdated', payload })),
  messageCompleted: vi.fn(() => ({ type: 'session/messageCompleted' })),
  thinkingUpdated: vi.fn((payload) => ({ type: 'session/thinkingUpdated', payload })),
  toolUseAdded: vi.fn((payload) => ({ type: 'session/toolUseAdded', payload })),
  toolResultAdded: vi.fn((payload) => ({ type: 'session/toolResultAdded', payload })),
  tokenUsageUpdated: vi.fn((payload) => ({ type: 'session/tokenUsageUpdated', payload })),
  setCurrentSession: vi.fn((payload) => ({ type: 'session/setCurrentSession', payload })),
  clearSession: vi.fn((payload) => ({ type: 'session/clearSession', payload })),
  updateTokenUsage: vi.fn((payload) => ({ type: 'session/updateTokenUsage', payload })),
}));

vi.mock('../../../src/state/slices/uiSlice', () => ({
  setWebviewReady: vi.fn((payload) => ({ type: 'ui/setWebviewReady', payload })),
  setClaudeRunning: vi.fn((payload) => ({ type: 'ui/setClaudeRunning', payload })),
  showPermissionRequest: vi.fn((payload) => ({ type: 'ui/showPermissionRequest', payload })),
}));

vi.mock('../../../src/state/slices/claudeSlice', () => ({
  setProcessing: vi.fn((payload) => ({ type: 'claude/setProcessing', payload })),
  setError: vi.fn((payload) => ({ type: 'claude/setError', payload })),
}));

vi.mock('../../../src/state/slices/configSlice', () => ({
  setSelectedModel: vi.fn((payload) => ({ type: 'config/setSelectedModel', payload })),
}));

describe('ActionMapper Test Suite', () => {
  let actionMapper: ActionMapper;
  let mockContext: any;
  let mockOutputChannel: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock context
    mockContext = {
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    };

    // Create mock output channel
    mockOutputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.window.createOutputChannel).mockReturnValue(mockOutputChannel);

    // Create ActionMapper instance
    actionMapper = new ActionMapper(mockContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Simple Redux Actions', () => {
    it('should map session/messageAdded correctly', () => {
      const action: WebviewAction = {
        type: 'session/messageAdded',
        payload: { message: 'test' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageAdded',
        payload: { message: 'test' },
      });
    });

    it('should map session/messageUpdated correctly', () => {
      const action: WebviewAction = {
        type: 'session/messageUpdated',
        payload: { id: '123', content: 'updated' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageUpdated',
        payload: { id: '123', content: 'updated' },
      });
    });

    it('should map session/messageCompleted with no payload', () => {
      const action: WebviewAction = {
        type: 'session/messageCompleted',
        payload: { someData: 'ignored' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageCompleted',
      });
    });
  });

  describe('Payload Transformation', () => {
    it('should transform token payload correctly', () => {
      const action: WebviewAction = {
        type: 'session/tokensUpdated',
        payload: { input: 100, output: 200 },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/updateTokenUsage',
        payload: { inputTokens: 100, outputTokens: 200 },
      });
    });

    it('should transform session resumed payload', () => {
      const action: WebviewAction = {
        type: 'session/resumed',
        payload: { sessionId: 'session-123' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/setCurrentSession',
        payload: 'session-123',
      });
    });

    it('should handle missing sessionId in resumed action', () => {
      const action: WebviewAction = {
        type: 'session/resumed',
        payload: {},
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/setCurrentSession',
        payload: null,
      });
    });

    it('should transform webview ready state', () => {
      const action: WebviewAction = {
        type: 'ui/setReady',
        payload: { ready: true },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'ui/setWebviewReady',
        payload: true,
      });
    });

    it('should handle processing state transformation', () => {
      const action: WebviewAction = {
        type: 'claude/setProcessing',
        payload: { processing: true },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'claude/setProcessing',
        payload: true,
      });
    });

    it('should map status/processing to setProcessing', () => {
      const action: WebviewAction = {
        type: 'status/processing',
        payload: true,
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'claude/setProcessing',
        payload: true,
      });
    });

    it('should map chat/messageComplete correctly', () => {
      const action: WebviewAction = {
        type: 'chat/messageComplete',
        payload: {
          sessionId: 'session-123',
          totalCost: 0.05,
          duration: 1500,
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageCompleted',
        payload: undefined, // messageCompleted takes no payload
      });
    });

    it('should map error/show to setError', () => {
      const action: WebviewAction = {
        type: 'error/show',
        payload: { message: 'Test error' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'claude/setError',
        payload: 'Test error',
      });
    });

    it('should map message/tokenUsage correctly', () => {
      const action: WebviewAction = {
        type: 'message/tokenUsage',
        payload: {
          inputTokens: 100,
          outputTokens: 200,
          cacheTokens: 50,
          thinkingTokens: 25,
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/updateTokenUsage',
        payload: {
          inputTokens: 100,
          outputTokens: 200,
          cacheTokens: 50,
          thinkingTokens: 25,
        },
      });
    });
  });

  describe('Custom Handlers', () => {
    it('should handle messageAppended with custom handler', () => {
      const action: WebviewAction = {
        type: 'session/messageAppended',
        payload: { messageId: 'msg-123', content: 'appended content' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageUpdated',
        payload: {
          role: 'assistant',
          content: 'appended content',
          messageId: 'msg-123',
        },
      });
    });

    it('should handle message/update for streaming', () => {
      const action: WebviewAction = {
        type: 'message/update',
        payload: { messageId: 'msg-123', role: 'assistant', content: 'updated content' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/messageUpdated',
        payload: {
          role: 'assistant',
          content: 'updated content',
          messageId: 'msg-123',
        },
      });
    });

    it('should handle message/thinking for thinking blocks', () => {
      const action: WebviewAction = {
        type: 'message/thinking',
        payload: {
          content: 'I need to think about this...',
          isActive: true,
          messageId: 'thinking-msg-456',
          currentLine: 42,
          isIncremental: true,
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/thinkingUpdated',
        payload: {
          content: 'I need to think about this...',
          isActive: true,
          messageId: 'thinking-msg-456',
          currentLine: "42",  // Now converted to string
          duration: undefined,
          isIncremental: true,
        },
      });
    });

    it('should handle message/thinking without optional fields', () => {
      const action: WebviewAction = {
        type: 'message/thinking',
        payload: {
          content: 'Simple thinking',
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/thinkingUpdated',
        payload: {
          content: 'Simple thinking',
          isActive: true,
          messageId: undefined,
          currentLine: undefined,
          duration: undefined,
          isIncremental: undefined,
        },
      });
    });

    it('should handle message/toolUse correctly', () => {
      const action: WebviewAction = {
        type: 'message/toolUse',
        payload: {
          toolName: 'bash',
          toolId: 'tool-123',
          input: { command: 'ls -la' },
          status: 'calling',
          parentToolUseId: 'parent-456',
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/toolUseAdded',
        payload: {
          toolName: 'bash',  // Updated property name
          toolId: 'tool-123',  // Updated property name
          input: { command: 'ls -la' },
          status: 'calling',
          parentToolUseId: 'parent-456',
        },
      });
    });

    it('should handle message/toolResult correctly', () => {
      const action: WebviewAction = {
        type: 'message/toolResult',
        payload: {
          toolId: 'tool-123',
          result: 'total 0\ndrwxr-xr-x  3 user  staff  96 Jan  1 12:00 .',
          isError: false,
          status: 'complete',
          parentToolUseId: 'parent-456',
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/toolResultAdded',
        payload: {
          toolId: 'tool-123',
          result: 'total 0\ndrwxr-xr-x  3 user  staff  96 Jan  1 12:00 .',  // Updated property name
          isError: false,
          status: 'complete',
          parentToolUseId: 'parent-456',
        },
      });
    });

    it('should handle message/toolUse without optional fields', () => {
      const action: WebviewAction = {
        type: 'message/toolUse',
        payload: {
          toolName: 'echo',
          toolId: 'tool-789',
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/toolUseAdded',
        payload: {
          toolName: 'echo',  // Updated property name
          toolId: 'tool-789',  // Updated property name
          input: undefined,
          status: 'calling',  // Now has default value
          parentToolUseId: undefined,
        },
      });
    });

    it('should handle message/toolResult without optional fields', () => {
      const action: WebviewAction = {
        type: 'message/toolResult',
        payload: {
          toolId: 'tool-789',
          result: 'Hello World',
        },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'session/toolResultAdded',
        payload: {
          toolId: 'tool-789',
          result: 'Hello World',  // Updated property name
          isError: false,
          status: 'complete',  // Now has default value
          parentToolUseId: undefined,
        },
      });
    });

    it('should handle messageAppended without required fields', () => {
      const action: WebviewAction = {
        type: 'session/messageAppended',
        payload: { content: 'appended' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(false);
      expect(result.mappedAction).toBeUndefined();
    });

    it('should handle modelSelected with custom handler', () => {
      const action: WebviewAction = {
        type: 'session/modelSelected',
        payload: { model: 'opus' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'config/setSelectedModel',
        payload: 'opus',
      });
    });

    it('should handle showError with custom handler', () => {
      const action: WebviewAction = {
        type: 'ui/showError',
        payload: { error: 'Something went wrong' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(true);
      expect(result.mappedAction).toEqual({
        type: 'claude/setError',
        payload: 'Something went wrong',
      });
    });

    it('should handle showNotification with custom handler', () => {
      const action: WebviewAction = {
        type: 'ui/showNotification',
        payload: { message: 'Info message', type: 'info' },
      };

      const result = actionMapper.mapAction(action);

      // Notifications bypass Redux
      expect(result.success).toBe(false);
      expect(result.mappedAction).toBeUndefined();
    });

    it('should handle streamMessage with custom handler', () => {
      const action: WebviewAction = {
        type: 'stream/messageReceived',
        payload: { chunk: {}, messageId: 'msg-123' },
      };

      const result = actionMapper.mapAction(action);

      // Stream messages need special handling in Phase 2
      expect(result.success).toBe(false);
      expect(result.mappedAction).toBeUndefined();
    });

    it('should handle terminal/opened with custom handler', () => {
      const action: WebviewAction = {
        type: 'terminal/opened',
        payload: { 
          message: 'Executing git status command in terminal. Check the terminal output and return when ready.' 
        },
      };

      const result = actionMapper.mapAction(action);

      // Terminal notifications are handled by custom handler (logging only)
      expect(result.success).toBe(false);
      expect(result.mappedAction).toBeUndefined();
    });
  });

  describe('Unmapped Actions', () => {
    it('should handle unmapped actions gracefully', () => {
      const action: WebviewAction = {
        type: 'unknown/action',
        payload: { data: 'test' },
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(false);
      expect(result.unmapped).toBe(true);
      expect(result.mappedAction).toBeUndefined();
    });

    it('should track unmapped actions', () => {
      // Enable logging for this test
      const mockFeatureFlags = {
        isEnabled: vi.fn((flag: string) => {
          if (flag === 'enableActionMapping') {return true;}
          if (flag === 'logUnmappedActions') {return true;}
          return false;
        }),
      }
      ;(actionMapper as any).featureFlags = mockFeatureFlags;

      const action: WebviewAction = {
        type: 'new/unmappedAction',
        payload: {},
      };

      actionMapper.mapAction(action);

      // Check that it was logged
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        '[UNMAPPED] First occurrence of unmapped action: new/unmappedAction'
      );

      // Second occurrence should not log
      mockOutputChannel.appendLine.mockClear();
      actionMapper.mapAction(action);
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
  });

  describe('Feature Flag Control', () => {
    it('should return error when action mapping is disabled', () => {
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(false),
      }
      ;(actionMapper as any).featureFlags = mockFeatureFlags;

      const action: WebviewAction = {
        type: 'session/messageAdded',
        payload: {},
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action mapping disabled');
    });
  });

  describe('Action Validation', () => {
    it('should validate action with type', () => {
      const action: WebviewAction = {
        type: 'session/messageAdded',
        payload: { message: 'test' },
      };

      const result = actionMapper.validateAction(action);

      expect(result.isValid).toBe(true);
      expect(result.transformedPayload).toEqual({ message: 'test' });
    });

    it('should fail validation for action without type', () => {
      const action = { payload: {} } as any;

      const result = actionMapper.validateAction(action);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Action type is required');
    });

    it('should validate unknown actions as valid but unmapped', () => {
      const action: WebviewAction = {
        type: 'unknown/action',
        payload: {},
      };

      const result = actionMapper.validateAction(action);

      expect(result.isValid).toBe(true);
    });

    it('should transform payload during validation', () => {
      const action: WebviewAction = {
        type: 'session/tokensUpdated',
        payload: { input: 50, output: 100 },
      };

      const result = actionMapper.validateAction(action);

      expect(result.isValid).toBe(true);
      expect(result.transformedPayload).toEqual({
        inputTokens: 50,
        outputTokens: 100,
      });
    });
  });

  describe('Statistics and Logging', () => {
    it('should track action statistics', () => {
      // Enable logging to track actions
      const mockFeatureFlags = {
        isEnabled: vi.fn((flag: string) => {
          if (flag === 'enableActionMapping') {return true;}
          if (flag === 'logStateTransitions') {return true;}
          return false;
        }),
      }
      ;(actionMapper as any).featureFlags = mockFeatureFlags;

      // Map some successful actions
      actionMapper.mapAction({ type: 'session/messageAdded', payload: {} });
      actionMapper.mapAction({ type: 'session/messageUpdated', payload: {} });

      // Map some failed actions (unmapped actions are not logged in actionLog)
      actionMapper.mapAction({ type: 'unknown/action1', payload: {} });
      actionMapper.mapAction({ type: 'unknown/action2', payload: {} });

      const stats = actionMapper.getStatistics();

      // Only successful actions are tracked in actionLog
      expect(stats.totalActions).toBe(2);
      expect(stats.successfulActions).toBe(2);
      expect(stats.failedActions).toBe(0);
      expect(stats.unmappedActionTypes).toContain('unknown/action1');
      expect(stats.unmappedActionTypes).toContain('unknown/action2');
      expect(stats.successRate).toBe(100);
    });

    it('should export action log', () => {
      actionMapper.mapAction({ type: 'session/messageAdded', payload: {} });
      actionMapper.mapAction({ type: 'unknown/action', payload: {} });

      const report = JSON.parse(actionMapper.exportActionLog());

      expect(report).toHaveProperty('generated');
      expect(report).toHaveProperty('statistics');
      expect(report).toHaveProperty('unmappedActions');
      expect(report).toHaveProperty('sampleFailures');
      // Only successful action is logged
      expect(report.statistics.totalActions).toBe(1);
      expect(report.unmappedActions).toContain('unknown/action');
    });

    it('should clear action log', () => {
      actionMapper.mapAction({ type: 'session/messageAdded', payload: {} });
      actionMapper.mapAction({ type: 'unknown/action', payload: {} });

      let stats = actionMapper.getStatistics();
      // Only successful action is logged
      expect(stats.totalActions).toBe(1);
      expect(stats.unmappedActionTypes).toContain('unknown/action');

      actionMapper.clearLog();

      stats = actionMapper.getStatistics();
      expect(stats.totalActions).toBe(0);
      expect(stats.unmappedActionTypes).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in payload transformation', () => {
      // Mock a transformation that throws
      const action: WebviewAction = {
        type: 'session/tokensUpdated',
        payload: null, // This will cause an error in transformation
      };

      const result = actionMapper.mapAction(action);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot read properties of null");
    });
  });

  describe('Payload Validators', () => {
    it('should validate token payload correctly', async () => {
      const { PayloadValidators } = await import('../../../src/migration/ActionMapper');

      expect(PayloadValidators.isTokenPayload({ input: 100, output: 200 })).toBe(true);
      expect(PayloadValidators.isTokenPayload({ input: 100 })).toBe(true);
      expect(PayloadValidators.isTokenPayload({ output: 200 })).toBe(true);
      expect(PayloadValidators.isTokenPayload({})).toBe(true);
      expect(PayloadValidators.isTokenPayload({ input: 'not a number' })).toBe(false);
      expect(PayloadValidators.isTokenPayload(null)).toBe(false);
      expect(PayloadValidators.isTokenPayload('string')).toBe(false);
    });

    it('should validate session payload correctly', async () => {
      const { PayloadValidators } = await import('../../../src/migration/ActionMapper');

      expect(PayloadValidators.isSessionPayload({ sessionId: 'test' })).toBe(true);
      expect(PayloadValidators.isSessionPayload({})).toBe(true);
      expect(PayloadValidators.isSessionPayload({ sessionId: 123 })).toBe(false);
      expect(PayloadValidators.isSessionPayload(null)).toBe(false);
    });

    it('should validate ready payload correctly', async () => {
      const { PayloadValidators } = await import('../../../src/migration/ActionMapper');

      expect(PayloadValidators.isReadyPayload({ ready: true })).toBe(true);
      expect(PayloadValidators.isReadyPayload({ ready: false })).toBe(true);
      expect(PayloadValidators.isReadyPayload({})).toBe(true);
      expect(PayloadValidators.isReadyPayload({ ready: 'not boolean' })).toBe(false);
      expect(PayloadValidators.isReadyPayload(null)).toBe(false);
    });
  });
});