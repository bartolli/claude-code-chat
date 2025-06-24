/**
 * Tests for UI slice
 */

import * as assert from 'assert';
import uiReducer, {
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  setToolExpanded,
  clearExpandedTools
} from '../../../state/slices/uiSlice';
import { UIState } from '../../../types/state';

suite('UI Slice Test Suite', () => {
  const initialState: UIState = {
    isWebviewReady: false,
    isClaudeRunning: false,
    showThinking: false,
    showCost: true,
    expandedTools: {}
  };

  test('should handle initial state', () => {
    const state = uiReducer(undefined, { type: 'unknown' });
    assert.deepStrictEqual(state, initialState);
  });

  suite('Webview State', () => {
    test('should set webview ready', () => {
      const state = uiReducer(initialState, setWebviewReady(true));
      assert.strictEqual(state.isWebviewReady, true);
    });

    test('should set webview not ready', () => {
      let state = uiReducer(initialState, setWebviewReady(true));
      state = uiReducer(state, setWebviewReady(false));
      assert.strictEqual(state.isWebviewReady, false);
    });
  });

  suite('Claude Running State', () => {
    test('should set Claude running', () => {
      const state = uiReducer(initialState, setClaudeRunning(true));
      assert.strictEqual(state.isClaudeRunning, true);
    });

    test('should set Claude not running', () => {
      let state = uiReducer(initialState, setClaudeRunning(true));
      state = uiReducer(state, setClaudeRunning(false));
      assert.strictEqual(state.isClaudeRunning, false);
    });
  });

  suite('Display Preferences', () => {
    test('should show thinking', () => {
      const state = uiReducer(initialState, setShowThinking(true));
      assert.strictEqual(state.showThinking, true);
    });

    test('should hide thinking', () => {
      let state = uiReducer(initialState, setShowThinking(true));
      state = uiReducer(state, setShowThinking(false));
      assert.strictEqual(state.showThinking, false);
    });

    test('should show cost', () => {
      const state = uiReducer(initialState, setShowCost(true));
      assert.strictEqual(state.showCost, true);
    });

    test('should hide cost', () => {
      const state = uiReducer(initialState, setShowCost(false));
      assert.strictEqual(state.showCost, false);
    });
  });

  suite('Tool Expansion State', () => {
    test('should expand a tool', () => {
      const state = uiReducer(initialState, setToolExpanded({ 
        toolId: 'tool-1', 
        expanded: true 
      }));
      assert.strictEqual(state.expandedTools['tool-1'], true);
    });

    test('should collapse a tool', () => {
      let state = uiReducer(initialState, setToolExpanded({ 
        toolId: 'tool-1', 
        expanded: true 
      }));
      state = uiReducer(state, setToolExpanded({ 
        toolId: 'tool-1', 
        expanded: false 
      }));
      assert.strictEqual(state.expandedTools['tool-1'], undefined);
    });

    test('should handle multiple tool expansions', () => {
      let state = initialState;
      
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-1', expanded: true }));
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-2', expanded: true }));
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-3', expanded: false }));
      
      assert.strictEqual(state.expandedTools['tool-1'], true);
      assert.strictEqual(state.expandedTools['tool-2'], true);
      assert.strictEqual(state.expandedTools['tool-3'], undefined);
    });

    test('should clear all tool expansions', () => {
      let state = initialState;
      
      // Expand multiple tools
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-1', expanded: true }));
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-2', expanded: true }));
      state = uiReducer(state, setToolExpanded({ toolId: 'tool-3', expanded: true }));
      
      // Clear all expansions
      state = uiReducer(state, clearExpandedTools());
      
      assert.deepStrictEqual(state.expandedTools, {});
    });
  });

  suite('Complex UI State Changes', () => {
    test('should handle multiple UI state changes', () => {
      let state = initialState;
      
      state = uiReducer(state, setWebviewReady(true));
      state = uiReducer(state, setClaudeRunning(true));
      state = uiReducer(state, setShowThinking(true));
      state = uiReducer(state, setShowCost(false));
      state = uiReducer(state, setToolExpanded({ toolId: 'search', expanded: true }));
      
      assert.strictEqual(state.isWebviewReady, true);
      assert.strictEqual(state.isClaudeRunning, true);
      assert.strictEqual(state.showThinking, true);
      assert.strictEqual(state.showCost, false);
      assert.strictEqual(state.expandedTools['search'], true);
    });
  });
});