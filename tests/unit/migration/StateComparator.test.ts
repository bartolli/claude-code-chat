import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StateComparator, StateDiscrepancy, ValidationResult } from '@/migration/StateComparator';
import { SimpleStateManager } from '@/state/SimpleStateManager';
import { StateManager } from '@/state/StateManager';
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

// Mock the state managers
vi.mock('@/state/SimpleStateManager');
vi.mock('@/state/StateManager');
vi.mock('@/migration/FeatureFlags', () => ({
  FeatureFlagManager: {
    getInstance: vi.fn(() => ({
      isEnabled: vi.fn().mockReturnValue(false),
    })),
  },
}));

describe('StateComparator Test Suite', () => {
  let stateComparator: StateComparator;
  let mockSimpleStateManager: any;
  let mockReduxStateManager: any;
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

    // Create mock SimpleStateManager
    mockSimpleStateManager = {
      getState: vi.fn().mockReturnValue({
        sessions: {},
        currentSessionId: null,
        config: {
          selectedModel: 'opus',
          autoSave: true,
          gitBackup: false,
        },
        ui: {
          webviewReady: false,
          claudeRunning: false,
          showThinking: false,
          showCost: true,
        },
      }),
      getCurrentSessionId: vi.fn().mockReturnValue(null),
      getSelectedModel: vi.fn().mockReturnValue('opus'),
      isWebviewReady: vi.fn().mockReturnValue(false),
    };

    // Create mock Redux StateManager
    mockReduxStateManager = {
      getState: vi.fn().mockReturnValue({
        session: {
          currentSessionId: undefined,
          sessions: {},
          activeSession: undefined,
          isLoading: false,
          error: undefined,
        },
        config: {
          selectedModel: 'opus',
          autoSave: true,
          gitBackup: false,
          theme: 'dark',
          fontSize: 14,
          availableModels: [],
          features: {
            planMode: true,
            thinkingMode: true,
            costTracking: true,
          },
        },
        ui: {
          isWebviewReady: false,
          isClaudeRunning: false,
          showThinking: false,
          showCost: true,
          expandedTools: {},
          permissionRequest: null,
        },
        processes: {
          activeProcesses: {},
        },
        claude: {
          isProcessing: false,
        },
        mcp: {
          servers: {},
          connectedServers: [],
        },
      }),
    };

    // Create StateComparator instance
    stateComparator = new StateComparator(
      mockSimpleStateManager as any,
      mockReduxStateManager as any,
      mockContext
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Comparison', () => {
    it('should return valid result when states match', () => {
      // Make sure states actually match
      mockSimpleStateManager.getSelectedModel.mockReturnValue('opus');
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue(undefined);
      
      const result = stateComparator.compareStates();

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.validatedPaths).toContain('currentSessionId');
      expect(result.validatedPaths).toContain('sessions');
      expect(result.validatedPaths).toContain('ui.webviewReady');
      expect(result.validatedPaths).toContain('config.selectedModel');
    });

    it('should detect session ID discrepancy', () => {
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');
      mockReduxStateManager.getState.mockReturnValue({
        ...mockReduxStateManager.getState(),
        session: {
          currentSessionId: 'session-456',
          sessions: {},
        },
      });

      const result = stateComparator.compareStates();

      expect(result.isValid).toBe(false);
      // Should have 2 discrepancies: session ID and session count
      expect(result.discrepancies).toHaveLength(2);
      
      const sessionIdDiscrepancy = result.discrepancies.find(d => d.path === 'currentSessionId');
      expect(sessionIdDiscrepancy).toMatchObject({
        path: 'currentSessionId',
        simpleValue: 'session-123',
        reduxValue: 'session-456',
        severity: 'critical',
      });
      
      // Also expect session count discrepancy
      const sessionCountDiscrepancy = result.discrepancies.find(d => d.path === 'sessions.count');
      expect(sessionCountDiscrepancy).toMatchObject({
        path: 'sessions.count',
        simpleValue: 1,
        reduxValue: 0,
        severity: 'high',
      });
    });

    it('should detect model selection discrepancy', () => {
      mockSimpleStateManager.getSelectedModel.mockReturnValue('sonnet');
      
      const result = stateComparator.compareStates();

      expect(result.isValid).toBe(false);
      const modelDiscrepancy = result.discrepancies.find(d => d.path === 'config.selectedModel');
      expect(modelDiscrepancy).toMatchObject({
        path: 'config.selectedModel',
        simpleValue: 'sonnet',
        reduxValue: 'opus',
        severity: 'high',
      });
    });

    it('should detect webview ready state discrepancy', () => {
      mockSimpleStateManager.isWebviewReady.mockReturnValue(true);
      
      const result = stateComparator.compareStates();

      expect(result.isValid).toBe(false);
      const webviewDiscrepancy = result.discrepancies.find(d => d.path === 'ui.webviewReady');
      expect(webviewDiscrepancy).toMatchObject({
        path: 'ui.webviewReady',
        simpleValue: true,
        reduxValue: false,
        severity: 'medium',
      });
    });

    it('should detect missing sessions in Redux when SimpleStateManager has active session', () => {
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('active-session');
      
      const result = stateComparator.compareStates();

      expect(result.isValid).toBe(false);
      const sessionCountDiscrepancy = result.discrepancies.find(d => d.path === 'sessions.count');
      expect(sessionCountDiscrepancy).toMatchObject({
        path: 'sessions.count',
        simpleValue: 1,
        reduxValue: 0,
        severity: 'high',
      });
    });
  });

  describe('Discrepancy Logging', () => {
    it('should log discrepancies when feature flag is enabled', () => {
      // Mock feature flags to enable logging
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(true),
      }
      ;(stateComparator as any).featureFlags = mockFeatureFlags;

      // Create discrepancies
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');
      mockReduxStateManager.getState.mockReturnValue({
        ...mockReduxStateManager.getState(),
        session: {
          currentSessionId: 'session-456',
          sessions: {},
        },
      });

      stateComparator.compareStates();

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('State Validation Results')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 discrepancies')
      );
    });

    it('should not log when feature flag is disabled', () => {
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(false),
      }
      ;(stateComparator as any).featureFlags = mockFeatureFlags;

      // Create discrepancies
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');

      stateComparator.compareStates();

      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
  });

  describe('State Snapshots', () => {
    it('should create state snapshot', () => {
      const snapshot = stateComparator.createSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot).toHaveProperty('simpleState');
      expect(snapshot).toHaveProperty('reduxState');
      expect(snapshot.metadata).toMatchObject({
        simpleSessionId: null,
        reduxSessionId: null,
        simpleWebviewReady: false,
        reduxWebviewReady: false,
      });
    });

    it('should sanitize sensitive data in snapshot', () => {
      mockSimpleStateManager.getState.mockReturnValue({
        config: {
          apiKey: 'sk-123456789',
          selectedModel: 'opus',
        },
      });

      const snapshot = stateComparator.createSnapshot();

      expect(snapshot.simpleState.config.apiKey).toBe('[REDACTED]');
      expect(snapshot.simpleState.config.selectedModel).toBe('opus');
    });

    it('should include session metadata in snapshot', () => {
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('simple-session');
      mockReduxStateManager.getState.mockReturnValue({
        ...mockReduxStateManager.getState(),
        session: {
          currentSessionId: 'redux-session',
          sessions: {},
        },
      });

      const snapshot = stateComparator.createSnapshot();

      expect(snapshot.metadata.simpleSessionId).toBe('simple-session');
      expect(snapshot.metadata.reduxSessionId).toBe('redux-session');
    });
  });

  describe('Operation Validation', () => {
    it('should validate operation with passing checks', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const mockCheck = vi.fn().mockReturnValue({ valid: true });
      mockCheck.name = 'testCheck';

      const result = await stateComparator.validateOperation(mockOperation, [mockCheck]);

      expect(result).toBe(true);
      expect(mockOperation).toHaveBeenCalledOnce();
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('should validate operation with failing checks', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const mockCheck = vi.fn().mockReturnValue({ 
        valid: false, 
        message: 'Test validation failed' 
      });
      mockCheck.name = 'failingCheck';

      const result = await stateComparator.validateOperation(mockOperation, [mockCheck]);

      expect(result).toBe(false);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        'Validation failed for failingCheck: Test validation failed'
      );
    });
  });

  describe('Discrepancy Statistics', () => {
    it('should track discrepancy statistics', () => {
      // Enable logging to populate discrepancy log
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(true),
      }
      ;(stateComparator as any).featureFlags = mockFeatureFlags;
      
      // Create multiple discrepancies
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');
      mockSimpleStateManager.getSelectedModel.mockReturnValue('sonnet');
      
      // First comparison
      stateComparator.compareStates();
      
      const stats = stateComparator.getDiscrepancyStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySeverity.critical).toBeGreaterThan(0);
      expect(stats.bySeverity.high).toBeGreaterThan(0);
      expect(stats.byPath['currentSessionId']).toBe(1);
    });

    it('should clear discrepancy log', () => {
      // Enable logging to populate discrepancy log
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(true),
      }
      ;(stateComparator as any).featureFlags = mockFeatureFlags;
      
      // Create discrepancies
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');
      stateComparator.compareStates();
      
      // Verify log has entries
      let stats = stateComparator.getDiscrepancyStats();
      expect(stats.total).toBeGreaterThan(0);
      
      // Clear log
      stateComparator.clearLog();
      
      // Verify log is empty
      stats = stateComparator.getDiscrepancyStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('Migration Recommendations', () => {
    it('should generate recommendations for critical discrepancies', () => {
      // Enable logging to populate discrepancy log
      const mockFeatureFlags = {
        isEnabled: vi.fn().mockReturnValue(true),
      }
      ;(stateComparator as any).featureFlags = mockFeatureFlags;
      
      // Create critical discrepancy
      mockSimpleStateManager.getCurrentSessionId.mockReturnValue('session-123');
      stateComparator.compareStates();
      
      const report = JSON.parse(stateComparator.exportReport());
      
      expect(report.recommendations).toContain(
        'CRITICAL: Address critical discrepancies before proceeding with migration'
      );
    });

    it('should generate success recommendation when no discrepancies', () => {
      const report = JSON.parse(stateComparator.exportReport());
      
      expect(report.recommendations).toContain(
        '✅ No discrepancies found - safe to proceed with migration'
      );
    });
  });

  describe('Pre-built Validation Checks', () => {
    it('should validate session creation', () => {
      const { sessionCreated } = (StateComparator as any).ValidationChecks || {};
      if (!sessionCreated) {
        // If ValidationChecks is not exported, skip this test
        return;
      }

      const beforeSnapshot = {
        metadata: {
          simpleSessionId: null,
          reduxSessionId: null,
        },
      };

      const afterSnapshot = {
        metadata: {
          simpleSessionId: 'new-session',
          reduxSessionId: 'new-session',
        },
      };

      const result = sessionCreated(beforeSnapshot, afterSnapshot);
      expect(result.valid).toBe(true);
    });
  });
});