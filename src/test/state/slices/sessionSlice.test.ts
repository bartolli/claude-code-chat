/**
 * Tests for session slice
 */

import * as assert from 'assert';
import sessionReducer, {
  createSession,
  setCurrentSession,
  updateSessionTitle,
  addMessage,
  updateTokenUsage,
  setLoading,
  setError,
  clearSession,
  deleteSession,
  loadSessions,
} from '../../../state/slices/sessionSlice';
import { SessionState } from '../../../types/state';
import { ClaudeMessage } from '../../../types/claude';

suite('Session Slice Test Suite', () => {
  const initialState: SessionState = {
    currentSessionId: undefined,
    sessions: {},
    activeSession: undefined,
    isLoading: false,
    error: undefined,
  };

  test('should handle initial state', () => {
    const state = sessionReducer(undefined, { type: 'unknown' });
    assert.deepStrictEqual(state, initialState);
  });

  suite('Session Management', () => {
    test('should create a new session', () => {
      const sessionId = 'test-123';
      const title = 'Test Session';

      const state = sessionReducer(initialState, createSession({ sessionId, title }));

      assert.ok(state.sessions[sessionId]);
      assert.strictEqual(state.sessions[sessionId].id, sessionId);
      assert.strictEqual(state.sessions[sessionId].title, title);
      assert.strictEqual(state.currentSessionId, sessionId);
      assert.deepStrictEqual(state.activeSession, state.sessions[sessionId]);
    });

    test('should create session with default title', () => {
      const sessionId = 'test-456';

      const state = sessionReducer(initialState, createSession({ sessionId }));

      assert.strictEqual(state.sessions[sessionId].title, 'New Conversation');
    });

    test('should set current session', () => {
      // Create a session first
      let state = sessionReducer(initialState, createSession({ sessionId: 'session-1' }));
      state = sessionReducer(state, createSession({ sessionId: 'session-2' }));

      // Set session-1 as current
      state = sessionReducer(state, setCurrentSession('session-1'));

      assert.strictEqual(state.currentSessionId, 'session-1');
      assert.deepStrictEqual(state.activeSession, state.sessions['session-1']);
    });

    test('should handle setting undefined session', () => {
      let state = sessionReducer(initialState, createSession({ sessionId: 'session-1' }));
      state = sessionReducer(state, setCurrentSession(undefined));

      assert.strictEqual(state.currentSessionId, undefined);
      assert.strictEqual(state.activeSession, undefined);
    });

    test('should update session title', () => {
      const sessionId = 'update-title-session';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      const newTitle = 'Updated Title';
      const beforeUpdate = state.sessions[sessionId].updatedAt;

      // Wait a bit to ensure updatedAt changes
      setTimeout(() => {
        state = sessionReducer(state, updateSessionTitle({ sessionId, title: newTitle }));

        assert.strictEqual(state.sessions[sessionId].title, newTitle);
        assert.ok(state.sessions[sessionId].updatedAt > beforeUpdate);
        assert.strictEqual(state.activeSession?.title, newTitle);
      }, 10);
    });
  });

  suite('Message Management', () => {
    test('should add message to session', () => {
      const sessionId = 'message-session';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      const message: ClaudeMessage = {
        role: 'user',
        content: 'Hello, Claude!',
        timestamp: Date.now(),
      };

      state = sessionReducer(state, addMessage({ sessionId, message }));

      assert.strictEqual(state.sessions[sessionId].messages.length, 1);
      assert.deepStrictEqual(state.sessions[sessionId].messages[0], message);
      assert.strictEqual(state.activeSession?.messages.length, 1);
    });

    test('should not add message to non-existent session', () => {
      const message: ClaudeMessage = {
        role: 'user',
        content: 'Hello!',
      };

      const state = sessionReducer(
        initialState,
        addMessage({
          sessionId: 'non-existent',
          message,
        })
      );

      assert.deepStrictEqual(state, initialState);
    });
  });

  suite('Token and Cost Tracking', () => {
    test('should update token usage', () => {
      const sessionId = 'token-session';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      );

      assert.strictEqual(state.sessions[sessionId].totalInputTokens, 100);
      assert.strictEqual(state.sessions[sessionId].totalOutputTokens, 200);
      assert.strictEqual(state.sessions[sessionId].totalCost, 0.05);
    });

    test('should accumulate token usage', () => {
      const sessionId = 'token-accumulate';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      // First update
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      );

      // Second update
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 50,
          outputTokens: 150,
          cost: 0.03,
        })
      );

      assert.strictEqual(state.sessions[sessionId].totalInputTokens, 150);
      assert.strictEqual(state.sessions[sessionId].totalOutputTokens, 350);
      assert.strictEqual(state.sessions[sessionId].totalCost, 0.08);
    });
  });

  suite('Loading and Error States', () => {
    test('should set loading state', () => {
      let state = sessionReducer(initialState, setLoading(true));
      assert.strictEqual(state.isLoading, true);

      state = sessionReducer(state, setLoading(false));
      assert.strictEqual(state.isLoading, false);
    });

    test('should set error state', () => {
      const errorMessage = 'Test error';
      let state = sessionReducer(initialState, setError(errorMessage));
      assert.strictEqual(state.error, errorMessage);

      state = sessionReducer(state, setError(undefined));
      assert.strictEqual(state.error, undefined);
    });
  });

  suite('Session Operations', () => {
    test('should clear session', () => {
      const sessionId = 'clear-session';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      // Add some data
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      );

      state = sessionReducer(
        state,
        addMessage({
          sessionId,
          message: { role: 'user', content: 'Test' },
        })
      );

      // Clear the session
      state = sessionReducer(state, clearSession(sessionId));

      assert.strictEqual(state.sessions[sessionId].messages.length, 0);
      assert.strictEqual(state.sessions[sessionId].totalInputTokens, 0);
      assert.strictEqual(state.sessions[sessionId].totalOutputTokens, 0);
      assert.strictEqual(state.sessions[sessionId].totalCost, 0);
    });

    test('should delete session', () => {
      const sessionId = 'delete-session';
      let state = sessionReducer(initialState, createSession({ sessionId }));

      assert.ok(state.sessions[sessionId]);
      assert.strictEqual(state.currentSessionId, sessionId);

      state = sessionReducer(state, deleteSession(sessionId));

      assert.strictEqual(state.sessions[sessionId], undefined);
      assert.strictEqual(state.currentSessionId, undefined);
      assert.strictEqual(state.activeSession, undefined);
    });

    test('should load sessions from storage', () => {
      const sessions = {
        'session-1': {
          id: 'session-1',
          title: 'Session 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: 'default' as const,
          messages: [],
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
        },
        'session-2': {
          id: 'session-2',
          title: 'Session 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: 'opus' as const,
          messages: [],
          totalInputTokens: 100,
          totalOutputTokens: 200,
          totalCost: 0.05,
        },
      };

      const state = sessionReducer(initialState, loadSessions(sessions));

      assert.deepStrictEqual(state.sessions, sessions);
      assert.strictEqual(Object.keys(state.sessions).length, 2);
    });
  });
});
