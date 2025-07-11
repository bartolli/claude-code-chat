import { describe, it, expect } from 'vitest'
import configReducer, {
  setSelectedModel,
  setAutoSave,
  setGitBackup,
  setTheme,
  setFontSize,
} from '@/state/slices/configSlice'
import { ConfigState } from '@/types/state'

describe('Config Slice Test Suite', () => {
  const initialState: ConfigState = {
    selectedModel: 'sonnet',
    autoSave: true,
    gitBackup: false,
    theme: 'dark',
    fontSize: 14,
    availableModels: [],
    features: {
      planMode: true,
      thinkingMode: true,
      costTracking: true,
    },
  }

  it('should handle initial state', () => {
    const state = configReducer(undefined, { type: 'unknown' })
    expect(state).toEqual(initialState)
  })

  describe('Model Configuration', () => {
    it('should set selected model to opus', () => {
      const state = configReducer(initialState, setSelectedModel('opus'))
      expect(state.selectedModel).toBe('opus')
    })

    it('should set selected model to sonnet', () => {
      const state = configReducer(initialState, setSelectedModel('sonnet'))
      expect(state.selectedModel).toBe('sonnet')
    })

    it('should set selected model to default', () => {
      let state = configReducer(initialState, setSelectedModel('opus'))
      state = configReducer(state, setSelectedModel('default'))
      expect(state.selectedModel).toBe('default')
    })
  })

  describe('Auto Save Configuration', () => {
    it('should enable auto save', () => {
      let state = configReducer(initialState, setAutoSave(false))
      state = configReducer(state, setAutoSave(true))
      expect(state.autoSave).toBe(true)
    })

    it('should disable auto save', () => {
      const state = configReducer(initialState, setAutoSave(false))
      expect(state.autoSave).toBe(false)
    })
  })

  describe('Git Backup Configuration', () => {
    it('should enable git backup', () => {
      const state = configReducer(initialState, setGitBackup(true))
      expect(state.gitBackup).toBe(true)
    })

    it('should disable git backup', () => {
      let state = configReducer(initialState, setGitBackup(true))
      state = configReducer(state, setGitBackup(false))
      expect(state.gitBackup).toBe(false)
    })
  })

  describe('Theme Configuration', () => {
    it('should set theme to light', () => {
      const state = configReducer(initialState, setTheme('light'))
      expect(state.theme).toBe('light')
    })

    it('should set theme to dark', () => {
      let state = configReducer(initialState, setTheme('light'))
      state = configReducer(state, setTheme('dark'))
      expect(state.theme).toBe('dark')
    })
  })

  describe('Font Size Configuration', () => {
    it('should set font size', () => {
      const state = configReducer(initialState, setFontSize(16))
      expect(state.fontSize).toBe(16)
    })

    it('should handle minimum font size', () => {
      const state = configReducer(initialState, setFontSize(10))
      expect(state.fontSize).toBe(10)
    })

    it('should handle maximum font size', () => {
      const state = configReducer(initialState, setFontSize(24))
      expect(state.fontSize).toBe(24)
    })
  })

  describe('Multiple Configuration Changes', () => {
    it('should handle multiple configuration changes', () => {
      let state = initialState

      state = configReducer(state, setSelectedModel('opus'))
      state = configReducer(state, setAutoSave(false))
      state = configReducer(state, setGitBackup(true))
      state = configReducer(state, setTheme('light'))
      state = configReducer(state, setFontSize(18))

      expect(state).toEqual({
        selectedModel: 'opus',
        autoSave: false,
        gitBackup: true,
        theme: 'light',
        fontSize: 18,
        availableModels: [],
        features: {
          planMode: true,
          thinkingMode: true,
          costTracking: true,
        },
      })
    })
  })
})