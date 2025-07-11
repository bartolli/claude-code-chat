import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StateManager } from '@/state/StateManager'
import store from '@/state/store'
import { ClaudeResultMessage } from '@/types/claude'
import { resetAllState } from '@/state/actions'

// Mock vscode module
vi.mock('vscode')

describe('StateManager Test Suite', () => {
  let stateManager: StateManager
  let mockContext: any

  beforeEach(() => {
    // Reset store before each test
    store.dispatch(resetAllState())

    stateManager = StateManager.getInstance()
    // Create a mock context for testing
    mockContext = {
      workspaceState: {
        get: vi.fn((_key: string, defaultValue?: any) => defaultValue),
        update: vi.fn((_key: string, _value: any) => Promise.resolve()),
      },
    }
    stateManager.initialize(mockContext)
  })

  afterEach(() => {
    // Reset store state after each test
    const state = store.getState()
    if (state.session.currentSessionId) {
      // Reset state through Redux action
      stateManager.dispatch({ type: 'session/setCurrentSession', payload: undefined })
    }
  })

  it('should be a singleton', () => {
    const instance1 = StateManager.getInstance()
    const instance2 = StateManager.getInstance()
    expect(instance1).toBe(instance2)
  })

  describe('Session Management', () => {
    it('should create a new session', () => {
      const sessionId = 'test-session-123'
      const title = 'Test Session'

      stateManager.createOrResumeSession(sessionId, title)

      const currentId = stateManager.getCurrentSessionId()
      expect(currentId).toBe(sessionId)

      const state = stateManager.getState()
      expect(state.session.sessions[sessionId]).toBeTruthy()
      expect(state.session.sessions[sessionId].title).toBe(title)
    })

    it('should resume existing session', () => {
      const sessionId = 'existing-session'

      // Create session first
      stateManager.createOrResumeSession(sessionId, 'Original Title')

      // Change current session
      stateManager.dispatch({ type: 'session/setCurrentSession', payload: undefined })
      expect(stateManager.getCurrentSessionId()).toBeUndefined()

      // Resume the session
      stateManager.createOrResumeSession(sessionId)
      expect(stateManager.getCurrentSessionId()).toBe(sessionId)
    })

    it('should update session from Claude result', () => {
      const sessionId = 'result-session'
      const result: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: sessionId,
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
        total_cost_usd: 0.05,
      }

      stateManager.updateSessionFromResult(result)

      const state = stateManager.getState()
      const session = state.session.sessions[sessionId]

      expect(session).toBeTruthy()
      expect(session.totalInputTokens).toBe(100)
      expect(session.totalOutputTokens).toBe(200)
      expect(session.totalCost).toBe(0.05)
    })
  })

  describe('Model Management', () => {
    it('should get default model', () => {
      const model = stateManager.getSelectedModel()
      expect(model).toBe('default') // StateManager loads 'default' from workspace state
    })

    it('should set valid model', () => {
      const result = stateManager.setSelectedModel('opus')
      expect(result).toBe(true)
      expect(stateManager.getSelectedModel()).toBe('opus')
    })

    it('should reject invalid model', () => {
      const result = stateManager.setSelectedModel('invalid-model')
      expect(result).toBe(false)
      // Model should remain unchanged
      expect(stateManager.getSelectedModel()).not.toBe('invalid-model')
    })

    it('should validate all supported models', () => {
      const validModels = ['opus', 'sonnet', 'default']

      for (const model of validModels) {
        const result = stateManager.setSelectedModel(model)
        expect(result).toBe(true)
        expect(stateManager.getSelectedModel()).toBe(model)
      }
    })
  })

  describe('UI State Management', () => {
    it('should set Claude running state', () => {
      stateManager.setClaudeRunning(true)
      expect(stateManager.getState().ui.isClaudeRunning).toBe(true)

      stateManager.setClaudeRunning(false)
      expect(stateManager.getState().ui.isClaudeRunning).toBe(false)
    })

    it('should set webview ready state', () => {
      stateManager.setWebviewReady(true)
      expect(stateManager.getState().ui.isWebviewReady).toBe(true)

      stateManager.setWebviewReady(false)
      expect(stateManager.getState().ui.isWebviewReady).toBe(false)
    })
  })

  describe('Process Management', () => {
    it('should track process', () => {
      const sessionId = 'process-session'
      const pid = 12345

      stateManager.trackProcess(sessionId, pid)

      const state = stateManager.getState()
      expect(state.processes.activeProcesses[sessionId]).toBeTruthy()
      expect(state.processes.activeProcesses[sessionId].pid).toBe(pid)
    })

    it('should untrack process', () => {
      const sessionId = 'process-session-2'
      const pid = 54321

      stateManager.trackProcess(sessionId, pid)
      expect(stateManager.getState().processes.activeProcesses[sessionId]).toBeTruthy()

      stateManager.untrackProcess(sessionId)
      expect(stateManager.getState().processes.activeProcesses[sessionId]).toBeUndefined()
    })
  })

  describe('Cost and Token Tracking', () => {
    it('should calculate total cost across sessions', () => {
      // Create multiple sessions with costs
      const result1: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'cost-session-1',
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
        total_cost_usd: 0.05,
      }

      const result2: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'cost-session-2',
        usage: {
          input_tokens: 150,
          output_tokens: 300,
        },
        total_cost_usd: 0.08,
      }

      stateManager.updateSessionFromResult(result1)
      stateManager.updateSessionFromResult(result2)

      const totalCost = stateManager.getTotalCost()
      expect(totalCost).toBe(0.13)
    })

    it('should calculate total tokens across sessions', () => {
      // Create multiple sessions with tokens
      const result1: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'token-session-1',
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
        total_cost_usd: 0.05,
      }

      const result2: ClaudeResultMessage = {
        type: 'result',
        subtype: 'success',
        session_id: 'token-session-2',
        usage: {
          input_tokens: 150,
          output_tokens: 300,
        },
        total_cost_usd: 0.08,
      }

      stateManager.updateSessionFromResult(result1)
      stateManager.updateSessionFromResult(result2)

      const totals = stateManager.getTotalTokens()
      expect(totals.input).toBe(250)
      expect(totals.output).toBe(500)
    })
  })

  describe('State Subscription', () => {
    it('should allow subscribing to state changes', () => {
      return new Promise<void>((resolve) => {
        let callCount = 0

        const unsubscribe = stateManager.subscribe(() => {
          callCount++
          if (callCount === 1) {
            // First call from model change
            expect(stateManager.getSelectedModel()).toBe('sonnet')
            unsubscribe()
            resolve()
          }
        })

        // Trigger a state change
        stateManager.setSelectedModel('sonnet')
      })
    })
  })
})