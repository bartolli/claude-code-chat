import { describe, it, expect } from 'vitest'
import uiReducer, {
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  setToolExpanded,
  clearExpandedTools,
} from '@/state/slices/uiSlice'
import { UIState } from '@/types/state'

describe('UI Slice Test Suite', () => {
  const initialState: UIState = {
    isWebviewReady: false,
    isClaudeRunning: false,
    showThinking: false,
    showCost: true,
    expandedTools: {},
    permissionRequest: null,
  }

  it('should handle initial state', () => {
    const state = uiReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  describe('Webview State', () => {
    it('should set webview ready', () => {
      const state = uiReducer(initialState, setWebviewReady(true))
      expect(state.isWebviewReady).toBe(true)
    })

    it('should set webview not ready', () => {
      let state = uiReducer(initialState, setWebviewReady(true))
      state = uiReducer(state, setWebviewReady(false))
      expect(state.isWebviewReady).toBe(false)
    })
  })

  describe('Claude Running State', () => {
    it('should set Claude running', () => {
      const state = uiReducer(initialState, setClaudeRunning(true))
      expect(state.isClaudeRunning).toBe(true)
    })

    it('should set Claude not running', () => {
      let state = uiReducer(initialState, setClaudeRunning(true))
      state = uiReducer(state, setClaudeRunning(false))
      expect(state.isClaudeRunning).toBe(false)
    })
  })

  describe('Display Preferences', () => {
    it('should show thinking', () => {
      const state = uiReducer(initialState, setShowThinking(true))
      expect(state.showThinking).toBe(true)
    })

    it('should hide thinking', () => {
      let state = uiReducer(initialState, setShowThinking(true))
      state = uiReducer(state, setShowThinking(false))
      expect(state.showThinking).toBe(false)
    })

    it('should show cost', () => {
      const state = uiReducer(initialState, setShowCost(true))
      expect(state.showCost).toBe(true)
    })

    it('should hide cost', () => {
      const state = uiReducer(initialState, setShowCost(false))
      expect(state.showCost).toBe(false)
    })
  })

  describe('Tool Expansion State', () => {
    it('should expand a tool', () => {
      const state = uiReducer(
        initialState,
        setToolExpanded({
          toolId: 'tool-1',
          expanded: true,
        })
      )
      expect(state.expandedTools['tool-1']).toBe(true)
    })

    it('should collapse a tool', () => {
      let state = uiReducer(
        initialState,
        setToolExpanded({
          toolId: 'tool-1',
          expanded: true,
        })
      )
      state = uiReducer(
        state,
        setToolExpanded({
          toolId: 'tool-1',
          expanded: false,
        })
      )
      expect(state.expandedTools['tool-1']).toBeUndefined()
    })

    it('should handle multiple tool expansions', () => {
      let state = initialState

      state = uiReducer(state, setToolExpanded({ toolId: 'tool-1', expanded: true }))
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-2', expanded: true }))
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-3', expanded: false }))

      expect(state.expandedTools['tool-1']).toBe(true)
      expect(state.expandedTools['tool-2']).toBe(true)
      expect(state.expandedTools['tool-3']).toBeUndefined()
    })

    it('should clear all tool expansions', () => {
      let state = initialState

      // Expand multiple tools
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-1', expanded: true }))
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-2', expanded: true }))
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-3', expanded: true }))

      // Clear all expansions
      state = uiReducer(state, clearExpandedTools())

      expect(state.expandedTools).toEqual({})
    })
  })

  describe('Complex UI State Changes', () => {
    it('should handle multiple UI state changes', () => {
      let state = initialState

      state = uiReducer(state, setWebviewReady(true))
      state = uiReducer(state, setClaudeRunning(true))
      state = uiReducer(state, setShowThinking(true))
      state = uiReducer(state, setShowCost(false))
      state = uiReducer(state, setToolExpanded({ toolId: 'search', expanded: true }))

      expect(state.isWebviewReady).toBe(true)
      expect(state.isClaudeRunning).toBe(true)
      expect(state.showThinking).toBe(true)
      expect(state.showCost).toBe(false)
      expect(state.expandedTools['search']).toBe(true)
    })
  })
})