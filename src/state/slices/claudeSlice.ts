/**
 * Claude process state slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetAllState } from '../actions';

export interface ClaudeState {
  /** Whether Claude is currently connected */
  isConnected: boolean;
  /** Whether Claude is currently processing a request */
  isProcessing: boolean;
  /** Error message if Claude encountered an error */
  error?: string;
  /** Currently selected model ID */
  currentModel?: string;
}

const initialState: ClaudeState = {
  isConnected: true,
  isProcessing: false,
  error: undefined,
  currentModel: undefined,
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
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  },
});

export const { setConnected, setProcessing, setError, setCurrentModel, updateClaudeState } =
  claudeSlice.actions;

// Selectors
/**
 * Select the complete Claude state
 * @param state - The Redux state object
 * @param state.claude - The Claude slice of the state
 * @returns The complete Claude state object
 */
export const selectClaudeStatus = (state: {
  /** The Claude slice of the state */
  claude: ClaudeState;
}) => state.claude;
/**
 * Select whether Claude is connected
 * @param state - The Redux state object
 * @param state.claude - The Claude slice of the state
 * @returns Whether Claude is currently connected
 */
export const selectIsConnected = (state: {
  /** The Claude slice of the state */
  claude: ClaudeState;
}) => state.claude.isConnected;
/**
 * Select whether Claude is processing
 * @param state - The Redux state object
 * @param state.claude - The Claude slice of the state
 * @returns Whether Claude is currently processing a request
 */
export const selectIsProcessing = (state: {
  /** The Claude slice of the state */
  claude: ClaudeState;
}) => state.claude.isProcessing;
/**
 * Select Claude error message if any
 * @param state - The Redux state object
 * @param state.claude - The Claude slice of the state
 * @returns The error message if any, undefined otherwise
 */
export const selectClaudeError = (state: {
  /** The Claude slice of the state */
  claude: ClaudeState;
}) => state.claude.error;

export default claudeSlice.reducer;
