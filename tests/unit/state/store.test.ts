import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from '@/state/slices/sessionSlice';
import configReducer from '@/state/slices/configSlice';
import uiReducer from '@/state/slices/uiSlice';
import processesReducer from '@/state/slices/processesSlice';
import claudeReducer from '@/state/slices/claudeSlice';
import mcpReducer from '@/state/slices/mcpSlice';
import { resetAllState } from '@/state/actions';
import { createSession, setCurrentSession } from '@/state/slices/sessionSlice';
import { setSelectedModel } from '@/state/slices/configSlice';
import { setWebviewReady, setClaudeRunning } from '@/state/slices/uiSlice';
import { addProcess, removeProcess } from '@/state/slices/processesSlice';

describe('Redux Store Test Suite', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create a fresh store for each test
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
  });

  it('should have correct initial state structure', () => {
    const state = store.getState();

    expect(state.session).toBeTruthy();
    expect(state.config).toBeTruthy();
    expect(state.ui).toBeTruthy();
    expect(state.processes).toBeTruthy();
    expect(state.claude).toBeTruthy();
    expect(state.mcp).toBeTruthy();

    // Check initial values
    expect(state.session.currentSessionId).toBeUndefined();
    expect(state.config.selectedModel).toBe('sonnet');
    expect(state.ui.isWebviewReady).toBe(false);
    expect(state.processes.activeProcesses).toEqual({});
  });

  it('should handle cross-slice interactions', () => {
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
    expect(state.session.currentSessionId).toBe('test-session');
    expect(state.session.sessions['test-session']).toBeTruthy();
    expect(state.ui.isWebviewReady).toBe(true);
    expect(state.ui.isClaudeRunning).toBe(true);
    expect(state.processes.activeProcesses['test-session']).toBeTruthy();
  });

  it('should maintain state isolation between slices', () => {
    // Change config
    store.dispatch(setSelectedModel('opus'));

    let state = store.getState();
    expect(state.config.selectedModel).toBe('opus');

    // Session state should be unaffected
    expect(state.session.isLoading).toBe(false);
    expect(state.session.error).toBeUndefined();

    // UI state should be unaffected
    expect(state.ui.showCost).toBe(true);
    expect(state.ui.showThinking).toBe(false);
  });

  it('should handle rapid state updates', () => {
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
    expect(Object.keys(state.session.sessions).length).toBe(updates);

    // Last session should be current
    expect(state.session.currentSessionId).toBe(sessionIds[updates - 1]);
  });

  it('should handle subscription correctly', () => {
    let callCount = 0;
    let lastState = store.getState();

    const unsubscribe = store.subscribe(() => {
      callCount++;
      const newState = store.getState();
      expect(newState).not.toEqual(lastState);
      lastState = newState;
    });

    // Trigger state changes
    store.dispatch(setSelectedModel('opus'));
    store.dispatch(setWebviewReady(true));
    store.dispatch(createSession({ sessionId: 'sub-test' }));

    expect(callCount).toBe(3);

    unsubscribe();

    // No more calls after unsubscribe
    store.dispatch(setSelectedModel('default'));
    expect(callCount).toBe(3);
  });

  it('should handle process lifecycle with UI state', () => {
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
    expect(state.ui.isClaudeRunning).toBe(true);
    expect(state.processes.activeProcesses[sessionId]).toBeTruthy();

    // End the process
    store.dispatch(removeProcess(sessionId));
    store.dispatch(setClaudeRunning(false));

    state = store.getState();
    expect(state.ui.isClaudeRunning).toBe(false);
    expect(state.processes.activeProcesses[sessionId]).toBeUndefined();
  });

  it('should preserve state shape after multiple operations', () => {
    const expectedKeys = ['session', 'config', 'ui', 'processes', 'claude', 'mcp'];

    // Perform various operations
    store.dispatch(createSession({ sessionId: 'shape-test' }));
    store.dispatch(setSelectedModel('opus'));
    store.dispatch(setWebviewReady(true));
    store.dispatch(addProcess({ id: 'p1', pid: 111, sessionId: 'shape-test' }));

    const state = store.getState();
    const stateKeys = Object.keys(state);

    expect(stateKeys.sort()).toEqual(expectedKeys.sort());
  });

  it('should handle resetAllState action', () => {
    // Make some changes
    store.dispatch(createSession({ sessionId: 'reset-test' }));
    store.dispatch(setSelectedModel('opus'));
    store.dispatch(setWebviewReady(true));

    // Reset all state
    store.dispatch(resetAllState());

    const state = store.getState();

    // Check that state is reset to initial
    expect(state.session.currentSessionId).toBeUndefined();
    expect(state.session.sessions).toEqual({});
    expect(state.config.selectedModel).toBe('sonnet');
    expect(state.ui.isWebviewReady).toBe(false);
  });
});