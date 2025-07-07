/**
 * Tests for StateManager
 */

import * as assert from 'assert';
import { StateManager } from '../../state/StateManager';
import store from '../../state/store';
import { ClaudeResultMessage } from '../../types/claude';
import { resetAllState } from '../../state/actions';

suite('StateManager Test Suite', () => {
  let stateManager: StateManager;
  let mockContext: any;

  setup(() => {
    // Reset store before each test
    store.dispatch(resetAllState());

    stateManager = StateManager.getInstance();
    // Create a mock context for testing
    mockContext = {
      workspaceState: {
        get: (_key: string, defaultValue?: any) => defaultValue,
        update: (_key: string, _value: any) => Promise.resolve(),
      },
    };
    stateManager.initialize(mockContext);
  });

  teardown(() => {
    // Reset store state after each test
    const state = store.getState();
    if (state.session.currentSessionId) {
      // Reset state through Redux action
      stateManager.dispatch({ type: 'session/setCurrentSession', payload: undefined });
    }
  });

  test('should be a singleton', () => {
    const instance1 = StateManager.getInstance();
    const instance2 = StateManager.getInstance();
    assert.strictEqual(instance1, instance2);
  });

  suite('Session Management', () => {
    test('should create a new session', () => {
      const sessionId = 'test-session-123';
      const title = 'Test Session';

      stateManager.createOrResumeSession(sessionId, title);

      const currentId = stateManager.getCurrentSessionId();
      assert.strictEqual(currentId, sessionId);

      const state = stateManager.getState();
      assert.ok(state.session.sessions[sessionId]);
      assert.strictEqual(state.session.sessions[sessionId].title, title);
    });

    test('should resume existing session', () => {
      const sessionId = 'existing-session';

      // Create session first
      stateManager.createOrResumeSession(sessionId, 'Original Title');

      // Change current session
      stateManager.dispatch({ type: 'session/setCurrentSession', payload: undefined });
      assert.strictEqual(stateManager.getCurrentSessionId(), undefined);

      // Resume the session
      stateManager.createOrResumeSession(sessionId);
      assert.strictEqual(stateManager.getCurrentSessionId(), sessionId);
    });

    test('should update session from Claude result', () => {
      const sessionId = 'result-session';
      const result: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: sessionId,
        input_tokens: 100,
        output_tokens: 200,
        cost: 0.05,
      };

      stateManager.updateSessionFromResult(result);

      const state = stateManager.getState();
      const session = state.session.sessions[sessionId];

      assert.ok(session);
      assert.strictEqual(session.totalInputTokens, 100);
      assert.strictEqual(session.totalOutputTokens, 200);
      assert.strictEqual(session.totalCost, 0.05);
    });
  });

  suite('Model Management', () => {
    test('should get default model', () => {
      const model = stateManager.getSelectedModel();
      assert.strictEqual(model, 'default');
    });

    test('should set valid model', () => {
      const result = stateManager.setSelectedModel('opus');
      assert.strictEqual(result, true);
      assert.strictEqual(stateManager.getSelectedModel(), 'opus');
    });

    test('should reject invalid model', () => {
      const result = stateManager.setSelectedModel('invalid-model');
      assert.strictEqual(result, false);
      // Model should remain unchanged
      assert.notStrictEqual(stateManager.getSelectedModel(), 'invalid-model');
    });

    test('should validate all supported models', () => {
      const validModels = ['opus', 'sonnet', 'default'];

      for (const model of validModels) {
        const result = stateManager.setSelectedModel(model);
        assert.strictEqual(result, true);
        assert.strictEqual(stateManager.getSelectedModel(), model);
      }
    });
  });

  suite('UI State Management', () => {
    test('should set Claude running state', () => {
      stateManager.setClaudeRunning(true);
      assert.strictEqual(stateManager.getState().ui.isClaudeRunning, true);

      stateManager.setClaudeRunning(false);
      assert.strictEqual(stateManager.getState().ui.isClaudeRunning, false);
    });

    test('should set webview ready state', () => {
      stateManager.setWebviewReady(true);
      assert.strictEqual(stateManager.getState().ui.isWebviewReady, true);

      stateManager.setWebviewReady(false);
      assert.strictEqual(stateManager.getState().ui.isWebviewReady, false);
    });
  });

  suite('Process Management', () => {
    test('should track process', () => {
      const sessionId = 'process-session';
      const pid = 12345;

      stateManager.trackProcess(sessionId, pid);

      const state = stateManager.getState();
      assert.ok(state.processes.activeProcesses[sessionId]);
      assert.strictEqual(state.processes.activeProcesses[sessionId].pid, pid);
    });

    test('should untrack process', () => {
      const sessionId = 'process-session-2';
      const pid = 54321;

      stateManager.trackProcess(sessionId, pid);
      assert.ok(stateManager.getState().processes.activeProcesses[sessionId]);

      stateManager.untrackProcess(sessionId);
      assert.strictEqual(stateManager.getState().processes.activeProcesses[sessionId], undefined);
    });
  });

  suite('Cost and Token Tracking', () => {
    test('should calculate total cost across sessions', () => {
      // Create multiple sessions with costs
      const result1: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'cost-session-1',
        input_tokens: 100,
        output_tokens: 200,
        cost: 0.05,
      };

      const result2: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'cost-session-2',
        input_tokens: 150,
        output_tokens: 300,
        cost: 0.08,
      };

      stateManager.updateSessionFromResult(result1);
      stateManager.updateSessionFromResult(result2);

      const totalCost = stateManager.getTotalCost();
      assert.strictEqual(totalCost, 0.13);
    });

    test('should calculate total tokens across sessions', () => {
      // Create multiple sessions with tokens
      const result1: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'token-session-1',
        input_tokens: 100,
        output_tokens: 200,
        cost: 0.05,
      };

      const result2: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'token-session-2',
        input_tokens: 150,
        output_tokens: 300,
        cost: 0.08,
      };

      stateManager.updateSessionFromResult(result1);
      stateManager.updateSessionFromResult(result2);

      const totals = stateManager.getTotalTokens();
      assert.strictEqual(totals.input, 250);
      assert.strictEqual(totals.output, 500);
    });
  });

  suite('State Subscription', () => {
    test('should allow subscribing to state changes', (done) => {
      let callCount = 0;

      const unsubscribe = stateManager.subscribe(() => {
        callCount++;
        if (callCount === 1) {
          // First call from model change
          assert.strictEqual(stateManager.getSelectedModel(), 'sonnet');
          unsubscribe();
          done();
        }
      });

      // Trigger a state change
      stateManager.setSelectedModel('sonnet');
    });
  });
});
