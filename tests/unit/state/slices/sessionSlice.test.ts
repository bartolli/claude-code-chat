import { describe, it, expect, beforeEach } from 'vitest'
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
} from '@/state/slices/sessionSlice'
import { SessionState } from '@/types/state'
import { ClaudeMessage } from '@/types/claude'

describe('Session Slice Test Suite', () => {
  const initialState: SessionState = {
    currentSessionId: undefined,
    sessions: {},
    activeSession: undefined,
    isLoading: false,
    error: undefined,
  }

  it('should handle initial state', () => {
    const state = sessionReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  describe('Session Management', () => {
    it('should create a new session', () => {
      const sessionId = 'test-123'
      const title = 'Test Session'

      const state = sessionReducer(initialState, createSession({ sessionId, title }))

      expect(state.sessions[sessionId]).toBeTruthy()
      expect(state.sessions[sessionId].id).toBe(sessionId)
      expect(state.sessions[sessionId].title).toBe(title)
      expect(state.currentSessionId).toBe(sessionId)
      expect(state.activeSession).toEqual(state.sessions[sessionId])
    })

    it('should create session with default title', () => {
      const sessionId = 'test-456'

      const state = sessionReducer(initialState, createSession({ sessionId }))

      expect(state.sessions[sessionId].title).toBe('New Conversation')
    })

    it('should set current session', () => {
      // Create a session first
      let state = sessionReducer(initialState, createSession({ sessionId: 'session-1' }))
      state = sessionReducer(state, createSession({ sessionId: 'session-2' }))

      // Set session-1 as current
      state = sessionReducer(state, setCurrentSession('session-1'))

      expect(state.currentSessionId).toBe('session-1')
      expect(state.activeSession).toEqual(state.sessions['session-1'])
    })

    it('should handle setting undefined session', () => {
      let state = sessionReducer(initialState, createSession({ sessionId: 'session-1' }))
      state = sessionReducer(state, setCurrentSession(undefined))

      expect(state.currentSessionId).toBeUndefined()
      expect(state.activeSession).toBeUndefined()
    })

    it('should update session title', async () => {
      const sessionId = 'update-title-session'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      const newTitle = 'Updated Title'
      const beforeUpdate = state.sessions[sessionId].updatedAt

      // Wait a bit to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 10))
      
      state = sessionReducer(state, updateSessionTitle({ sessionId, title: newTitle }))

      expect(state.sessions[sessionId].title).toBe(newTitle)
      expect(state.sessions[sessionId].updatedAt).toBeGreaterThan(beforeUpdate)
      expect(state.activeSession?.title).toBe(newTitle)
    })
  })

  describe('Message Management', () => {
    it('should add message to session', () => {
      const sessionId = 'message-session'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      const message: ClaudeMessage = {
        role: 'user',
        content: 'Hello, Claude!',
        timestamp: Date.now(),
      }

      state = sessionReducer(state, addMessage({ sessionId, message }))

      expect(state.sessions[sessionId].messages.length).toBe(1)
      expect(state.sessions[sessionId].messages[0]).toEqual(message)
      expect(state.activeSession?.messages.length).toBe(1)
    })

    it('should not add message to non-existent session', () => {
      const message: ClaudeMessage = {
        role: 'user',
        content: 'Hello!',
      }

      const state = sessionReducer(
        initialState,
        addMessage({
          sessionId: 'non-existent',
          message,
        })
      )

      expect(state).toEqual(initialState)
    })
  })

  describe('Token and Cost Tracking', () => {
    it('should update token usage', () => {
      const sessionId = 'token-session'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      )

      expect(state.sessions[sessionId].totalInputTokens).toBe(100)
      expect(state.sessions[sessionId].totalOutputTokens).toBe(200)
      expect(state.sessions[sessionId].totalCost).toBe(0.05)
    })

    it('should accumulate token usage', () => {
      const sessionId = 'token-accumulate'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      // First update
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      )

      // Second update
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 50,
          outputTokens: 150,
          cost: 0.03,
        })
      )

      expect(state.sessions[sessionId].totalInputTokens).toBe(150)
      expect(state.sessions[sessionId].totalOutputTokens).toBe(350)
      expect(state.sessions[sessionId].totalCost).toBe(0.08)
    })
  })

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      let state = sessionReducer(initialState, setLoading(true))
      expect(state.isLoading).toBe(true)

      state = sessionReducer(state, setLoading(false))
      expect(state.isLoading).toBe(false)
    })

    it('should set error state', () => {
      const errorMessage = 'Test error'
      let state = sessionReducer(initialState, setError(errorMessage))
      expect(state.error).toBe(errorMessage)

      state = sessionReducer(state, setError(undefined))
      expect(state.error).toBeUndefined()
    })
  })

  describe('Session Operations', () => {
    it('should clear session', () => {
      const sessionId = 'clear-session'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      // Add some data
      state = sessionReducer(
        state,
        updateTokenUsage({
          sessionId,
          inputTokens: 100,
          outputTokens: 200,
          cost: 0.05,
        })
      )

      state = sessionReducer(
        state,
        addMessage({
          sessionId,
          message: { role: 'user', content: 'Test' },
        })
      )

      // Clear the session
      state = sessionReducer(state, clearSession(sessionId))

      expect(state.sessions[sessionId].messages.length).toBe(0)
      expect(state.sessions[sessionId].totalInputTokens).toBe(0)
      expect(state.sessions[sessionId].totalOutputTokens).toBe(0)
      expect(state.sessions[sessionId].totalCost).toBe(0)
    })

    it('should delete session', () => {
      const sessionId = 'delete-session'
      let state = sessionReducer(initialState, createSession({ sessionId }))

      expect(state.sessions[sessionId]).toBeTruthy()
      expect(state.currentSessionId).toBe(sessionId)

      state = sessionReducer(state, deleteSession(sessionId))

      expect(state.sessions[sessionId]).toBeUndefined()
      expect(state.currentSessionId).toBeUndefined()
      expect(state.activeSession).toBeUndefined()
    })

    it('should load sessions from storage', () => {
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
      }

      const state = sessionReducer(initialState, loadSessions(sessions))

      expect(state.sessions).toEqual(sessions)
      expect(Object.keys(state.sessions).length).toBe(2)
    })
  })
})