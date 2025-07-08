/**
 * Processes state slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProcessState } from '../../types/state';
import { resetAllState } from '../actions';

const initialState: ProcessState = {
  activeProcesses: {},
};

const processesSlice = createSlice({
  name: 'processes',
  initialState,
  reducers: {
    addProcess: (
      state,
      action: PayloadAction<{
        /** Process unique identifier */
        id: string;
        /** Process ID from the operating system */
        pid: number;
        /** Associated session ID */
        sessionId: string;
      }>
    ) => {
      const { id, pid, sessionId } = action.payload;
      state.activeProcesses[id] = {
        id,
        pid,
        sessionId,
        startedAt: Date.now(),
      };
    },

    removeProcess: (state, action: PayloadAction<string>) => {
      delete state.activeProcesses[action.payload];
    },

    clearProcesses: (state) => {
      state.activeProcesses = {};
    },

    updateProcess: (
      state,
      action: PayloadAction<{
        /** Process ID to update */
        id: string;
        /** Partial updates to apply to the process */
        updates: Partial<ProcessState['activeProcesses'][string]>;
      }>
    ) => {
      const { id, updates } = action.payload;
      if (state.activeProcesses[id]) {
        state.activeProcesses[id] = {
          ...state.activeProcesses[id],
          ...updates,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  },
});

export const { addProcess, removeProcess, clearProcesses, updateProcess } = processesSlice.actions;

export default processesSlice.reducer;
