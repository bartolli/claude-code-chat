/**
 * Claude process state slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetAllState } from '../actions';

export interface ClaudeState {
  isConnected: boolean;
  isProcessing: boolean;
  error?: string;
  currentModel?: string;
}

const initialState: ClaudeState = {
  isConnected: true,
  isProcessing: false,
  error: undefined,
  currentModel: undefined
};

const claudeSlice = createSlice({
  name: 'claude',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        state.error = undefined;
      }
    },
    
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
    
    setCurrentModel: (state, action: PayloadAction<string | undefined>) => {
      state.currentModel = action.payload;
    },
    
    updateClaudeState: (state, action: PayloadAction<Partial<ClaudeState>>) => {
      return { ...state, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  }
});

export const {
  setConnected,
  setProcessing,
  setError,
  setCurrentModel,
  updateClaudeState
} = claudeSlice.actions;

// Selectors
export const selectClaudeStatus = (state: { claude: ClaudeState }) => state.claude;
export const selectIsConnected = (state: { claude: ClaudeState }) => state.claude.isConnected;
export const selectIsProcessing = (state: { claude: ClaudeState }) => state.claude.isProcessing;
export const selectClaudeError = (state: { claude: ClaudeState }) => state.claude.error;

export default claudeSlice.reducer;