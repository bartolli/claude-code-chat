/**
 * Tests for config slice
 */

import * as assert from 'assert';
import configReducer, {
  setSelectedModel,
  setAutoSave,
  setGitBackup,
  setTheme,
  setFontSize
} from '../../../state/slices/configSlice';
import { ConfigState } from '../../../types/state';

suite('Config Slice Test Suite', () => {
  const initialState: ConfigState = {
    selectedModel: 'default',
    autoSave: true,
    gitBackup: false,
    theme: 'dark',
    fontSize: 14
  };

  test('should handle initial state', () => {
    const state = configReducer(undefined, { type: 'unknown' });
    assert.deepStrictEqual(state, initialState);
  });

  suite('Model Configuration', () => {
    test('should set selected model to opus', () => {
      const state = configReducer(initialState, setSelectedModel('opus'));
      assert.strictEqual(state.selectedModel, 'opus');
    });

    test('should set selected model to sonnet', () => {
      const state = configReducer(initialState, setSelectedModel('sonnet'));
      assert.strictEqual(state.selectedModel, 'sonnet');
    });

    test('should set selected model to default', () => {
      let state = configReducer(initialState, setSelectedModel('opus'));
      state = configReducer(state, setSelectedModel('default'));
      assert.strictEqual(state.selectedModel, 'default');
    });
  });

  suite('Auto Save Configuration', () => {
    test('should enable auto save', () => {
      let state = configReducer(initialState, setAutoSave(false));
      state = configReducer(state, setAutoSave(true));
      assert.strictEqual(state.autoSave, true);
    });

    test('should disable auto save', () => {
      const state = configReducer(initialState, setAutoSave(false));
      assert.strictEqual(state.autoSave, false);
    });
  });

  suite('Git Backup Configuration', () => {
    test('should enable git backup', () => {
      const state = configReducer(initialState, setGitBackup(true));
      assert.strictEqual(state.gitBackup, true);
    });

    test('should disable git backup', () => {
      let state = configReducer(initialState, setGitBackup(true));
      state = configReducer(state, setGitBackup(false));
      assert.strictEqual(state.gitBackup, false);
    });
  });

  suite('Theme Configuration', () => {
    test('should set theme to light', () => {
      const state = configReducer(initialState, setTheme('light'));
      assert.strictEqual(state.theme, 'light');
    });

    test('should set theme to dark', () => {
      let state = configReducer(initialState, setTheme('light'));
      state = configReducer(state, setTheme('dark'));
      assert.strictEqual(state.theme, 'dark');
    });
  });

  suite('Font Size Configuration', () => {
    test('should set font size', () => {
      const state = configReducer(initialState, setFontSize(16));
      assert.strictEqual(state.fontSize, 16);
    });

    test('should handle minimum font size', () => {
      const state = configReducer(initialState, setFontSize(10));
      assert.strictEqual(state.fontSize, 10);
    });

    test('should handle maximum font size', () => {
      const state = configReducer(initialState, setFontSize(24));
      assert.strictEqual(state.fontSize, 24);
    });
  });

  suite('Multiple Configuration Changes', () => {
    test('should handle multiple configuration changes', () => {
      let state = initialState;
      
      state = configReducer(state, setSelectedModel('opus'));
      state = configReducer(state, setAutoSave(false));
      state = configReducer(state, setGitBackup(true));
      state = configReducer(state, setTheme('light'));
      state = configReducer(state, setFontSize(18));
      
      assert.deepStrictEqual(state, {
        selectedModel: 'opus',
        autoSave: false,
        gitBackup: true,
        theme: 'light',
        fontSize: 18
      });
    });
  });
});