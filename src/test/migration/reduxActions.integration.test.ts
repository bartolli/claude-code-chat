import * as assert from 'assert';
import * as vscode from 'vscode';
import { ActionMapper, WebviewAction } from '../../migration/ActionMapper';
import { FeatureFlagManager } from '../../migration/FeatureFlags';
import { store } from '../../state/store';
import { RootState } from '../../state/store';

/**
 * Comprehensive integration tests for all Redux actions used in the webview
 * Based on StateManager_Comparison_Analysis.md
 */
suite('Redux Actions Integration Test Suite', () => {
  let actionMapper: ActionMapper;
  let context: vscode.ExtensionContext;
  let featureFlags: FeatureFlagManager;
  let initialState: RootState;

  setup(async () => {
    // Create mock context
    context = createMockContext();

    // Initialize feature flags and enable action mapping
    featureFlags = FeatureFlagManager.getInstance(context);
    await featureFlags.setFlag('enableActionMapping', true);

    // Create ActionMapper
    actionMapper = new ActionMapper(context);

    // Capture initial state
    initialState = store.getState();
  });

  teardown(async () => {
    // Reset feature flags
    await featureFlags.resetFlags();
    actionMapper.clearLog();
  });

  suite('Session Actions (Currently Dispatched)', () => {
    test('session/messageAdded - Adds new message', () => {
      const action: WebviewAction = {
        type: 'session/messageAdded',
        payload: {
          sessionId: 'test-session',
          message: {
            role: 'user',
            content: 'Test message',
            messageId: 'msg-1',
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/messageAdded');

      // Verify the action structure
      const mappedPayload = result.mappedAction.payload;
      assert.strictEqual(mappedPayload.role, 'user');
      assert.strictEqual(mappedPayload.content, 'Test message');
    });

    test('session/messageUpdated - Updates existing message', () => {
      const action: WebviewAction = {
        type: 'session/messageUpdated',
        payload: {
          sessionId: 'test-session',
          messageId: 'msg-1',
          updates: {
            content: 'Updated content',
            isThinkingActive: false,
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/messageUpdated');
    });

    test('session/messageCompleted - Marks message as complete', () => {
      const action: WebviewAction = {
        type: 'session/messageCompleted',
        payload: {
          sessionId: 'test-session',
          messageId: 'msg-1',
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/messageCompleted');
      // Should have undefined payload based on our transform
      assert.strictEqual(result.mappedAction.payload, undefined);
    });

    test('session/thinkingUpdated - Critical for thinking blocks', () => {
      const action: WebviewAction = {
        type: 'session/thinkingUpdated',
        payload: {
          sessionId: 'test-session',
          messageId: 'msg-1',
          thinking: {
            content: 'Analyzing the request...',
            isActive: true,
            duration: 1000,
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/thinkingUpdated');
    });

    test('session/toolUseAdded - For tool management', () => {
      const action: WebviewAction = {
        type: 'session/toolUseAdded',
        payload: {
          sessionId: 'test-session',
          messageId: 'msg-1',
          toolUse: {
            toolName: 'read_file',
            toolId: 'tool-1',
            input: { path: '/test/file.js' },
            status: 'pending',
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/toolUseAdded');
    });

    test('session/toolResultAdded - For tool results', () => {
      const action: WebviewAction = {
        type: 'session/toolResultAdded',
        payload: {
          sessionId: 'test-session',
          messageId: 'msg-1',
          toolUseId: 'tool-1',
          result: {
            toolId: 'tool-1',
            result: 'File contents here',
            status: 'success',
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/toolResultAdded');
    });

    test('session/tokenUsageUpdated - For token tracking', () => {
      const action: WebviewAction = {
        type: 'session/tokenUsageUpdated',
        payload: {
          sessionId: 'test-session',
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            thinkingTokens: 25,
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/tokenUsageUpdated');
    });

    test('session/tokensUpdated - Legacy token update', () => {
      const action: WebviewAction = {
        type: 'session/tokensUpdated',
        payload: { input: 100, output: 50 },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/updateTokenUsage');

      // Verify payload transformation
      const transformed = result.mappedAction.payload;
      assert.strictEqual(transformed.inputTokens, 100);
      assert.strictEqual(transformed.outputTokens, 50);
    });

    test('session/resumed - Resumes a session', () => {
      const action: WebviewAction = {
        type: 'session/resumed',
        payload: { sessionId: 'test-session-123' },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/setCurrentSession');
      assert.strictEqual(result.mappedAction.payload, 'test-session-123');
    });

    test('session/cleared - Clears session', () => {
      const action: WebviewAction = {
        type: 'session/cleared',
        payload: { sessionId: 'test-session' },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'session/clearSession');
      assert.strictEqual(result.mappedAction.payload, 'test-session');
    });

    test('session/messageAppended - Needs custom handler', () => {
      const action: WebviewAction = {
        type: 'session/messageAppended',
        payload: {
          messageId: 'msg-1',
          content: ' appended content',
        },
      };

      const result = actionMapper.mapAction(action);
      // Custom handler returns null, so this should fail
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    });

    test('session/modelSelected - Needs custom handler', () => {
      const action: WebviewAction = {
        type: 'session/modelSelected',
        payload: { model: 'claude-3-opus' },
      };

      const result = actionMapper.mapAction(action);
      // Custom handler returns null, so this should fail
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    });
  });

  suite('UI Actions (Currently Dispatched)', () => {
    test('ui/setReady - Sets webview ready state', () => {
      const action: WebviewAction = {
        type: 'ui/setReady',
        payload: { ready: true },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'ui/setWebviewReady');
      assert.strictEqual(result.mappedAction.payload, true);
    });

    test('ui/showPermissionRequest - Shows permission dialog', () => {
      const action: WebviewAction = {
        type: 'ui/showPermissionRequest',
        payload: {
          toolName: 'execute_command',
          toolId: 'cmd-1',
          toolInput: { command: 'npm install' },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'ui/showPermissionRequest');
    });

    test('ui/showError - Needs custom handler', () => {
      const action: WebviewAction = {
        type: 'ui/showError',
        payload: { message: 'Test error', details: 'Error details' },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    });

    test('ui/showNotification - Needs custom handler', () => {
      const action: WebviewAction = {
        type: 'ui/showNotification',
        payload: { message: 'Test notification', type: 'info' },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    });

    test('ui/showPlanProposal - Not mapped yet', () => {
      const action: WebviewAction = {
        type: 'ui/showPlanProposal',
        payload: { plan: { steps: ['Step 1', 'Step 2'] } },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.unmapped, true);
    });
  });

  suite('Claude Actions (Currently Dispatched)', () => {
    test('claude/setProcessing - Sets processing state', () => {
      const action: WebviewAction = {
        type: 'claude/setProcessing',
        payload: { processing: true },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, true);
      assert.ok(result.mappedAction);
      assert.strictEqual(result.mappedAction.type, 'claude/setProcessing');
      assert.strictEqual(result.mappedAction.payload, true);
    });
  });

  suite('Other Actions (Currently Dispatched)', () => {
    test('stream/messageReceived - Needs custom handler', () => {
      const action: WebviewAction = {
        type: 'stream/messageReceived',
        payload: {
          chunk: {
            type: 'content_block_delta',
            delta: { text: 'Hello' },
          },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    });

    test('config/initializeConfig - Not mapped yet', () => {
      const action: WebviewAction = {
        type: 'config/initializeConfig',
        payload: { config: { theme: 'dark' } },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.unmapped, true);
    });

    test('mcp/updateConnectedServers - Not mapped yet', () => {
      const action: WebviewAction = {
        type: 'mcp/updateConnectedServers',
        payload: { servers: [{ name: 'server1', status: 'connected' }] },
      };

      const result = actionMapper.mapAction(action);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.unmapped, true);
    });
  });

  suite('Action Mapping Statistics', () => {
    test('should track all action mapping attempts', () => {
      // Clear previous stats
      actionMapper.clearLog();

      // Run a series of actions
      const testActions: WebviewAction[] = [
        { type: 'session/messageAdded', payload: { role: 'user', content: 'test' } },
        { type: 'session/messageUpdated', payload: { content: 'updated' } },
        { type: 'ui/setReady', payload: { ready: true } },
        { type: 'claude/setProcessing', payload: { processing: false } },
        { type: 'unknown/action1', payload: {} },
        { type: 'unknown/action2', payload: {} },
        { type: 'ui/showError', payload: { message: 'error' } }, // Custom handler returns null
      ];

      testActions.forEach((action) => actionMapper.mapAction(action));

      const stats = actionMapper.getStatistics();
      assert.strictEqual(stats.totalActions, 7);
      assert.strictEqual(stats.successfulActions, 4);
      assert.strictEqual(stats.failedActions, 3);
      assert.strictEqual(stats.successRate, (4 / 7) * 100);
      assert.strictEqual(stats.unmappedActionTypes.length, 2);
      assert.ok(stats.unmappedActionTypes.includes('unknown/action1'));
      assert.ok(stats.unmappedActionTypes.includes('unknown/action2'));
    });
  });
});

/**
 * Create a mock VS Code extension context for testing
 * @returns {vscode.ExtensionContext} Mock extension context with in-memory state storage
 */
function createMockContext(): vscode.ExtensionContext {
  const workspaceState = new Map<string, unknown>();
  const globalState = new Map<string, unknown>();

  return {
    workspaceState: {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        return (workspaceState.get(key) as T) ?? defaultValue;
      },
      update: (key: string, value: unknown): Thenable<void> => {
        workspaceState.set(key, value);
        return Promise.resolve();
      },
      keys: (): readonly string[] => {
        return Array.from(workspaceState.keys());
      },
    },
    globalState: {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        return (globalState.get(key) as T) ?? defaultValue;
      },
      update: (key: string, value: unknown): Thenable<void> => {
        globalState.set(key, value);
        return Promise.resolve();
      },
      keys: (): readonly string[] => {
        return Array.from(globalState.keys());
      },
      setKeysForSync: (keys: readonly string[]): void => {
        // Mock implementation
      },
    },
    subscriptions: [],
    extensionPath: '/mock/extension/path',
    extensionUri: vscode.Uri.file('/mock/extension/path'),
    environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
    storagePath: '/mock/storage/path',
    globalStoragePath: '/mock/global/storage/path',
    logPath: '/mock/log/path',
    extensionMode: vscode.ExtensionMode.Test,
    extension: {} as vscode.Extension<unknown>,
    secrets: {} as vscode.SecretStorage,
    storageUri: vscode.Uri.file('/mock/storage/uri'),
    globalStorageUri: vscode.Uri.file('/mock/global/storage/uri'),
    logUri: vscode.Uri.file('/mock/log/uri'),
    asAbsolutePath: (relativePath: string): string => {
      return `/mock/extension/path/${relativePath}`;
    },
  } as vscode.ExtensionContext;
}
