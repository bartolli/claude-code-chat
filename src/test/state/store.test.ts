/**
 * Tests for Redux store configuration
 */

import * as assert from 'assert';
import store from '../../state/store';
import { resetAllState } from '../../state/actions';
import { createSession, setCurrentSession } from '../../state/slices/sessionSlice';
import { setSelectedModel } from '../../state/slices/configSlice';
import { setWebviewReady, setClaudeRunning } from '../../state/slices/uiSlice';
import { addProcess, removeProcess } from '../../state/slices/processesSlice';

suite('Redux Store Test Suite', () => {
  setup(() => {
    // Reset store to initial state before each test
    store.dispatch(resetAllState());
  });

  test('should have correct initial state structure', () => {
    const state = store.getState();

    assert.ok(state.session);
    assert.ok(state.config);
    assert.ok(state.ui);
    assert.ok(state.processes);

    // Check initial values
    assert.strictEqual(state.session.currentSessionId, undefined);
    assert.strictEqual(state.config.selectedModel, 'default');
    assert.strictEqual(state.ui.isWebviewReady, false);
    assert.deepStrictEqual(state.processes.activeProcesses, {});
  });

  test('should handle cross-slice interactions', () => {
    const initialState = store.getState();

    // Create a session
    store.dispatch(
      createSession({
        sessionId: 'test-session',
        title: 'Test Session',
      })
    );

    // Set UI state
    store.dispatch(setWebviewReady(true));
    store.dispatch(setClaudeRunning(true));

    // Add a process
    store.dispatch(
      addProcess({
        id: 'test-session',
        pid: 12345,
        sessionId: 'test-session',
      })
    );

    const state = store.getState();

    // Verify all state changes
    assert.strictEqual(state.session.currentSessionId, 'test-session');
    assert.ok(state.session.sessions['test-session']);
    assert.strictEqual(state.ui.isWebviewReady, true);
    assert.strictEqual(state.ui.isClaudeRunning, true);
    assert.ok(state.processes.activeProcesses['test-session']);
  });

  test('should maintain state isolation between slices', () => {
    // Change config
    store.dispatch(setSelectedModel('opus'));

    let state = store.getState();
    assert.strictEqual(state.config.selectedModel, 'opus');

    // Session state should be unaffected
    assert.strictEqual(state.session.isLoading, false);
    assert.strictEqual(state.session.error, undefined);

    // UI state should be unaffected
    assert.strictEqual(state.ui.showCost, true);
    assert.strictEqual(state.ui.showThinking, false);
  });

  test('should handle rapid state updates', () => {
    const updates = 100;
    const sessionIds: string[] = [];

    // Rapidly create sessions
    for (let i = 0; i < updates; i++) {
      const sessionId = `rapid-session-${i}`;
      sessionIds.push(sessionId);
      store.dispatch(createSession({ sessionId }));
    }

    const state = store.getState();

    // All sessions should be created
    assert.strictEqual(Object.keys(state.session.sessions).length, updates);

    // Last session should be current
    assert.strictEqual(state.session.currentSessionId, sessionIds[updates - 1]);
  });

  test('should handle subscription correctly', () => {
    let callCount = 0;
    let lastState = store.getState();

    const unsubscribe = store.subscribe(() => {
      callCount++;
      const newState = store.getState();
      assert.notDeepStrictEqual(newState, lastState);
      lastState = newState;
    });

    // Trigger state changes
    store.dispatch(setSelectedModel('sonnet'));
    store.dispatch(setWebviewReady(true));
    store.dispatch(createSession({ sessionId: 'sub-test' }));

    assert.strictEqual(callCount, 3);

    unsubscribe();

    // No more calls after unsubscribe
    store.dispatch(setSelectedModel('default'));
    assert.strictEqual(callCount, 3);
  });

  test('should handle process lifecycle with UI state', () => {
    const sessionId = 'process-ui-test';

    // Start a Claude process
    store.dispatch(setClaudeRunning(true));
    store.dispatch(
      addProcess({
        id: sessionId,
        pid: 99999,
        sessionId,
      })
    );

    let state = store.getState();
    assert.strictEqual(state.ui.isClaudeRunning, true);
    assert.ok(state.processes.activeProcesses[sessionId]);

    // End the process
    store.dispatch(removeProcess(sessionId));
    store.dispatch(setClaudeRunning(false));

    state = store.getState();
    assert.strictEqual(state.ui.isClaudeRunning, false);
    assert.strictEqual(state.processes.activeProcesses[sessionId], undefined);
  });

  test('should preserve state shape after multiple operations', () => {
    const expectedKeys = ['session', 'config', 'ui', 'processes'];

    // Perform various operations
    store.dispatch(createSession({ sessionId: 'shape-test' }));
    store.dispatch(setSelectedModel('opus'));
    store.dispatch(setWebviewReady(true));
    store.dispatch(addProcess({ id: 'p1', pid: 111, sessionId: 'shape-test' }));

    const state = store.getState();
    const stateKeys = Object.keys(state);

    assert.deepStrictEqual(stateKeys.sort(), expectedKeys.sort());
  });
});
