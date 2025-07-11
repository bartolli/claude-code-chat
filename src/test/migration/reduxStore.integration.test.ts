import * as assert from 'assert';
import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from '../../state/slices/sessionSlice';
import uiReducer from '../../state/slices/uiSlice';
import claudeReducer from '../../state/slices/claudeSlice';
import configReducer from '../../state/slices/configSlice';
import processesReducer from '../../state/slices/processesSlice';
import mcpReducer from '../../state/slices/mcpSlice';
import { ActionMapper } from '../../migration/ActionMapper';
import { FeatureFlagManager } from '../../migration/FeatureFlags';
import * as vscode from 'vscode';

/**
 * Test that mapped actions actually work with Redux store
 */
suite('Redux Store Integration Test Suite', () => {
  let store: ReturnType<typeof configureStore>;
  let actionMapper: ActionMapper;
  let context: vscode.ExtensionContext;
  let featureFlags: FeatureFlagManager;

  setup(async () => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        session: sessionReducer,
        config: configReducer,
        ui: uiReducer,
        processes: processesReducer,
        claude: claudeReducer,
        mcp: mcpReducer,
      },
    });

    // Create mock context
    context = createMockContext();

    // Enable action mapping
    featureFlags = FeatureFlagManager.getInstance(context);
    await featureFlags.setFlag('enableActionMapping', true);

    // Create ActionMapper
    actionMapper = new ActionMapper(context);
  });

  suite('Session State Updates', () => {
    test('messageAdded updates store correctly', () => {
      const initialState = store.getState();

      // First create a session
      store.dispatch({
        type: 'session/createSession',
        payload: { sessionId: 'test-session', title: 'Test' },
      });

      // Map and dispatch messageAdded
      const action = {
        type: 'session/messageAdded',
        payload: {
          role: 'user' as const,
          content: 'Hello Claude',
          messageId: 'msg-1',
        },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      assert.ok(result.mappedAction);

      // Dispatch to store
      store.dispatch(result.mappedAction);

      // Verify state was updated
      const state = store.getState();
      const session = state.session.sessions['test-session'];
      assert.ok(session, 'Session should exist');
      assert.strictEqual(session.messages.length, 1);
      assert.strictEqual(session.messages[0].content, 'Hello Claude');
      assert.strictEqual(session.messages[0].role, 'user');
    });

    test('thinkingUpdated updates store correctly', () => {
      // Create session with a message
      store.dispatch({
        type: 'session/createSession',
        payload: { sessionId: 'test-session', title: 'Test' },
      });

      store.dispatch({
        type: 'session/messageAdded',
        payload: {
          role: 'assistant' as const,
          content: '',
          messageId: 'msg-1',
        },
      });

      // Map and dispatch thinkingUpdated
      const action = {
        type: 'session/thinkingUpdated',
        payload: {
          content: 'Analyzing request...',
          isActive: true,
          messageId: 'msg-1',
        },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      store.dispatch(result.mappedAction!);

      // Verify thinking was added
      const state = store.getState();
      const session = state.session.sessions['test-session'];
      const message = session.messages.find((m) => m.messageId === 'msg-1');
      assert.ok(message?.thinking);
      assert.strictEqual(message.thinking, 'Analyzing request...');
      assert.strictEqual(message.isThinkingActive, true);
    });

    test('tokenUsageUpdated updates store correctly', () => {
      // Create session
      store.dispatch({
        type: 'session/createSession',
        payload: { sessionId: 'test-session', title: 'Test' },
      });

      // Map and dispatch tokenUsageUpdated
      const action = {
        type: 'session/tokenUsageUpdated',
        payload: {
          inputTokens: 100,
          outputTokens: 50,
          thinkingTokens: 25,
        },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      store.dispatch(result.mappedAction!);

      // Set current session first (tokenUsageUpdated requires a current session)
      store.dispatch({
        type: 'session/setCurrentSession',
        payload: 'test-session',
      });

      // Verify tokens were updated
      const state = store.getState();
      const session = state.session.sessions['test-session'];
      assert.strictEqual(session.totalInputTokens, 100);
      assert.strictEqual(session.totalOutputTokens, 50);
    });

    test('legacy tokensUpdated action transforms correctly', () => {
      // Create session
      store.dispatch({
        type: 'session/createSession',
        payload: { sessionId: 'test-session', title: 'Test' },
      });

      // Map legacy action
      const action = {
        type: 'session/tokensUpdated',
        payload: { input: 200, output: 100 },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      assert.strictEqual(result.mappedAction?.type, 'session/updateTokenUsage');

      // Verify payload was transformed
      const payload = result.mappedAction?.payload;
      assert.strictEqual(payload.inputTokens, 200);
      assert.strictEqual(payload.outputTokens, 100);
    });
  });

  suite('UI State Updates', () => {
    test('ui/setReady updates webview ready state', () => {
      const action = {
        type: 'ui/setReady',
        payload: { ready: true },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      store.dispatch(result.mappedAction!);

      const state = store.getState();
      assert.strictEqual(state.ui.isWebviewReady, true);
    });

    test('ui/showPermissionRequest updates permission state', () => {
      const action = {
        type: 'ui/showPermissionRequest',
        payload: {
          toolName: 'execute_command',
          toolId: 'cmd-1',
          toolInput: { command: 'npm test' },
        },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);
      store.dispatch(result.mappedAction!);

      const state = store.getState();
      assert.ok(state.ui.permissionRequest);
      assert.strictEqual(state.ui.permissionRequest.toolName, 'execute_command');
      assert.strictEqual(state.ui.permissionRequest.toolId, 'cmd-1');
    });
  });

  suite('Claude State Updates', () => {
    test('claude/setProcessing updates processing state', () => {
      const action = {
        type: 'claude/setProcessing',
        payload: { processing: true },
      };

      const result = actionMapper.mapAction(action);
      assert.ok(result.success);

      // The ActionMapper should transform the payload
      // We need to add a payloadTransform for this action
      store.dispatch(result.mappedAction!);

      const state = store.getState();
      assert.strictEqual(state.claude.isProcessing, true);
    });
  });

  suite('Complex Scenarios', () => {
    test('Full conversation flow with multiple actions', () => {
      // 1. Create session
      store.dispatch({
        type: 'session/createSession',
        payload: { sessionId: 'conv-1', title: 'Test Conversation' },
      });

      // Set as current session
      store.dispatch({
        type: 'session/setCurrentSession',
        payload: 'conv-1',
      });

      // 2. Add user message
      const userMsgResult = actionMapper.mapAction({
        type: 'session/messageAdded',
        payload: {
          role: 'user' as const,
          content: 'Explain quantum computing',
          messageId: 'user-msg-1',
        },
      });
      store.dispatch(userMsgResult.mappedAction!);

      // 3. Set Claude processing
      const processingResult = actionMapper.mapAction({
        type: 'claude/setProcessing',
        payload: { processing: true },
      });
      store.dispatch(processingResult.mappedAction!);

      // 4. Add assistant message
      const assistantMsgResult = actionMapper.mapAction({
        type: 'session/messageAdded',
        payload: {
          role: 'assistant' as const,
          content: '',
          messageId: 'assistant-msg-1',
        },
      });
      store.dispatch(assistantMsgResult.mappedAction!);

      // 5. Update with thinking
      const thinkingResult = actionMapper.mapAction({
        type: 'session/thinkingUpdated',
        payload: {
          content: 'Let me explain quantum computing...',
          isActive: true,
          messageId: 'assistant-msg-1',
        },
      });
      store.dispatch(thinkingResult.mappedAction!);

      // 6. Update message content
      const updateResult = actionMapper.mapAction({
        type: 'session/messageUpdated',
        payload: {
          role: 'assistant' as const,
          content: 'Quantum computing is...',
          messageId: 'assistant-msg-1',
        },
      });
      store.dispatch(updateResult.mappedAction!);

      // 7. Complete thinking
      const completeThinkingResult = actionMapper.mapAction({
        type: 'session/thinkingUpdated',
        payload: {
          content: 'Let me explain quantum computing...',
          isActive: false,
          messageId: 'assistant-msg-1',
        },
      });
      store.dispatch(completeThinkingResult.mappedAction!);

      // 8. Update tokens
      const tokenResult = actionMapper.mapAction({
        type: 'session/tokenUsageUpdated',
        payload: {
          inputTokens: 10,
          outputTokens: 150,
        },
      });
      store.dispatch(tokenResult.mappedAction!);

      // 9. Complete message
      const completeResult = actionMapper.mapAction({
        type: 'session/messageCompleted',
        payload: {},
      });
      store.dispatch(completeResult.mappedAction!);

      // 10. Stop processing
      const stopProcessingResult = actionMapper.mapAction({
        type: 'claude/setProcessing',
        payload: { processing: false },
      });
      store.dispatch(stopProcessingResult.mappedAction!);

      // Verify final state
      const finalState = store.getState();
      const session = finalState.session.sessions['conv-1'];

      assert.strictEqual(session.messages.length, 2);
      assert.strictEqual(session.messages[0].role, 'user');
      assert.strictEqual(session.messages[1].role, 'assistant');
      assert.ok(session.messages[1].content.includes('Quantum computing'));
      assert.strictEqual(session.messages[1].isThinkingActive, false);
      assert.strictEqual(session.totalInputTokens, 10);
      assert.strictEqual(session.totalOutputTokens, 150);
      assert.strictEqual(finalState.claude.isProcessing, false);
      assert.strictEqual(finalState.session.isLoading, false);
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
