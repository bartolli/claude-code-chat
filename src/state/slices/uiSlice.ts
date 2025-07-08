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
  expandedTools: {},
  permissionRequest: null,
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

    /**
     * Set the expanded state of a specific tool
     * @param state - The UI state
     * @param action - Action containing tool ID and expanded state
     */
    setToolExpanded: (
      state,
      action: PayloadAction<{
        /** ID of the tool to expand/collapse */
        toolId: string;
        /** Whether the tool should be expanded */
        expanded: boolean;
      }>
    ) => {
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

    /**
     * Show a permission request dialog for a tool
     * @param state - The UI state
     * @param action - Action containing tool permission request details
     */
    showPermissionRequest: (
      state,
      action: PayloadAction<{
        /** Name of the tool requesting permission */
        toolName: string;
        /** ID of the tool requesting permission */
        toolId: string;
        /** Input parameters for the tool */
        toolInput: any;
      }>
    ) => {
      state.permissionRequest = action.payload;
    },

    clearPermissionRequest: (state) => {
      state.permissionRequest = null;
    },

    resetUI: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
    // Handle the action from the webview dispatcher
    builder.addCase('ui/showPermissionRequest', (state, action: any) => {
      state.permissionRequest = action.payload;
    });
  },
});

export const {
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  toggleToolExpanded,
  setToolExpanded,
  clearExpandedTools,
  showPermissionRequest,
  clearPermissionRequest,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
