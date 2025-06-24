/**
 * UI state slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '../../types/state';
import { resetAllState } from '../actions';

const initialState: UIState = {
  isWebviewReady: false,
  isClaudeRunning: false,
  showThinking: false,
  showCost: true,
  expandedTools: {}
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setWebviewReady: (state, action: PayloadAction<boolean>) => {
      state.isWebviewReady = action.payload;
    },
    
    setClaudeRunning: (state, action: PayloadAction<boolean>) => {
      state.isClaudeRunning = action.payload;
    },
    
    setShowThinking: (state, action: PayloadAction<boolean>) => {
      state.showThinking = action.payload;
    },
    
    setShowCost: (state, action: PayloadAction<boolean>) => {
      state.showCost = action.payload;
    },
    
    toggleToolExpanded: (state, action: PayloadAction<string>) => {
      const toolId = action.payload;
      if (state.expandedTools[toolId]) {
        delete state.expandedTools[toolId];
      } else {
        state.expandedTools[toolId] = true;
      }
    },
    
    setToolExpanded: (state, action: PayloadAction<{ toolId: string; expanded: boolean }>) => {
      const { toolId, expanded } = action.payload;
      if (expanded) {
        state.expandedTools[toolId] = true;
      } else {
        delete state.expandedTools[toolId];
      }
    },
    
    clearExpandedTools: (state) => {
      state.expandedTools = {};
    },
    
    resetUI: () => initialState
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  }
});

export const {
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  toggleToolExpanded,
  setToolExpanded,
  clearExpandedTools,
  resetUI
} = uiSlice.actions;

export default uiSlice.reducer;