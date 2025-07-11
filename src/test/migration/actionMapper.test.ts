import * as assert from 'assert';
import * as vscode from 'vscode';
import { ActionMapper, WebviewAction } from '../../migration/ActionMapper';
import { FeatureFlagManager } from '../../migration/FeatureFlags';

/**
 * Test suite for ActionMapper
 * This allows us to test action mapping without affecting production
 */
suite('ActionMapper Test Suite', () => {
  let actionMapper: ActionMapper;
  let context: vscode.ExtensionContext;
  let featureFlags: FeatureFlagManager;

  setup(async () => {
    // Create mock context
    context = createMockContext();

    // Initialize feature flags and enable action mapping for tests
    featureFlags = FeatureFlagManager.getInstance(context);
    await featureFlags.setFlag('enableActionMapping', true);
    await featureFlags.setFlag('logStateTransitions', false); // Reduce noise in tests

    // Create ActionMapper
    actionMapper = new ActionMapper(context);
  });

  teardown(async () => {
    // Reset feature flags
    await featureFlags.resetFlags();
    actionMapper.clearLog();
  });

  test('Maps simple Redux actions correctly', () => {
    /**
     * Test cases for simple action mapping
     */
    const testCases: Array<{
      /** The action to test */
      action: WebviewAction;
      /** Expected mapped action type */
      expectedType: string;
    }> = [
      {
        action: { type: 'session/messageAdded', payload: { message: 'test' } },
        expectedType: 'session/messageAdded',
      },
      {
        action: { type: 'session/messageUpdated', payload: { id: '123', content: 'updated' } },
        expectedType: 'session/messageUpdated',
      },
      {
        action: { type: 'claude/setProcessing', payload: { processing: true } },
        expectedType: 'claude/setProcessing',
      },
    ];

    for (const testCase of testCases) {
      const result = actionMapper.mapAction(testCase.action);
      assert.strictEqual(result.success, true, `Failed to map ${testCase.action.type}`);
      assert.ok(result.mappedAction, 'Should have mapped action');
      assert.strictEqual(result.mappedAction?.type, testCase.expectedType);
    }
  });

  test('Transforms payloads correctly', () => {
    // Test token update transformation
    const tokenAction: WebviewAction = {
      type: 'session/tokensUpdated',
      payload: { input: 100, output: 50 },
    };

    const result = actionMapper.mapAction(tokenAction);
    assert.strictEqual(result.success, true);
    assert.ok(result.mappedAction);
    assert.deepStrictEqual(result.mappedAction.payload, {
      inputTokens: 100,
      outputTokens: 50,
    });

    // Test session resumed transformation
    const resumeAction: WebviewAction = {
      type: 'session/resumed',
      payload: { sessionId: 'session-123' },
    };

    const resumeResult = actionMapper.mapAction(resumeAction);
    assert.strictEqual(resumeResult.success, true);
    assert.strictEqual(resumeResult.mappedAction?.payload, 'session-123');
  });

  test('Handles unmapped actions gracefully', () => {
    const unmappedAction: WebviewAction = {
      type: 'unknown/action',
      payload: { data: 'test' },
    };

    const result = actionMapper.mapAction(unmappedAction);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.unmapped, true);

    // Check statistics
    const stats = actionMapper.getStatistics();
    assert.ok(stats.unmappedActionTypes.includes('unknown/action'));
  });

  test('Validates actions correctly', () => {
    // Valid action
    const validAction: WebviewAction = {
      type: 'session/messageAdded',
      payload: { message: 'test' },
    };

    const validResult = actionMapper.validateAction(validAction);
    assert.strictEqual(validResult.isValid, true);

    // Invalid action (no type)
    const invalidAction = { payload: { message: 'test' } } as WebviewAction;
    const invalidResult = actionMapper.validateAction(invalidAction);
    assert.strictEqual(invalidResult.isValid, false);
    assert.ok(invalidResult.error);
  });

  test('Custom handlers return null (need special handling)', () => {
    const customActions = [
      'session/messageAppended',
      'session/modelSelected',
      'ui/showError',
      'ui/showNotification',
      'stream/messageReceived',
    ];

    for (const actionType of customActions) {
      const result = actionMapper.mapAction({ type: actionType });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No handler produced action');
    }
  });

  test('Statistics tracking works correctly', async () => {
    // Clear log first
    actionMapper.clearLog();

    // Process some actions
    const actions: WebviewAction[] = [
      { type: 'session/messageAdded', payload: { message: 'test1' } },
      { type: 'session/messageUpdated', payload: { id: '1', content: 'test2' } },
      { type: 'unknown/action', payload: {} },
      { type: 'claude/setProcessing', payload: { processing: true } },
    ];

    for (const action of actions) {
      actionMapper.mapAction(action);
    }

    const stats = actionMapper.getStatistics();
    assert.strictEqual(stats.totalActions, 4);
    assert.strictEqual(stats.successfulActions, 3);
    assert.strictEqual(stats.failedActions, 1);
    assert.strictEqual(stats.successRate, 75);
    assert.strictEqual(stats.unmappedActionTypes.length, 1);
  });

  test('Feature flag disables mapping', async () => {
    // Disable action mapping
    await featureFlags.setFlag('enableActionMapping', false);

    const action: WebviewAction = {
      type: 'session/messageAdded',
      payload: { message: 'test' },
    };

    const result = actionMapper.mapAction(action);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Action mapping disabled');
  });
});

/**
 * Create a mock VS Code extension context for testing
 * @returns {vscode.ExtensionContext} Mock extension context
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
