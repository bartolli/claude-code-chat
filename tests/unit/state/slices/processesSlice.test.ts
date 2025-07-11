import { describe, it, expect } from 'vitest';
import processesReducer, {
  addProcess,
  removeProcess,
  updateProcess,
  clearProcesses,
} from '@/state/slices/processesSlice';
import { ProcessState } from '@/types/state';

describe('Processes Slice Test Suite', () => {
  const initialState: ProcessState = {
    activeProcesses: {},
  };

  it('should handle initial state', () => {
    const state = processesReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  describe('Process Management', () => {
    it('should add a process', () => {
      const process = {
        id: 'process-1',
        pid: 12345,
        sessionId: 'session-1',
      };

      const state = processesReducer(initialState, addProcess(process));

      expect(state.activeProcesses['process-1']).toBeTruthy();
      expect(state.activeProcesses['process-1'].pid).toBe(12345);
      expect(state.activeProcesses['process-1'].sessionId).toBe('session-1');
      // Process should be added (status is not stored in the current implementation)
      expect(state.activeProcesses['process-1'].startedAt).toBeTruthy();
    });

    it('should add multiple processes', () => {
      let state = initialState;

      state = processesReducer(
        state,
        addProcess({
          id: 'process-1',
          pid: 12345,
          sessionId: 'session-1',
        })
      );

      state = processesReducer(
        state,
        addProcess({
          id: 'process-2',
          pid: 54321,
          sessionId: 'session-2',
        })
      );

      expect(Object.keys(state.activeProcesses).length).toBe(2);
      expect(state.activeProcesses['process-1']).toBeTruthy();
      expect(state.activeProcesses['process-2']).toBeTruthy();
    });

    it('should remove a process', () => {
      let state = initialState;

      // Add a process first
      state = processesReducer(
        state,
        addProcess({
          id: 'process-to-remove',
          pid: 99999,
          sessionId: 'session-1',
        })
      );

      expect(state.activeProcesses['process-to-remove']).toBeTruthy();

      // Remove the process
      state = processesReducer(state, removeProcess('process-to-remove'));

      expect(state.activeProcesses['process-to-remove']).toBeUndefined();
      expect(Object.keys(state.activeProcesses).length).toBe(0);
    });

    it('should handle removing non-existent process', () => {
      const state = processesReducer(initialState, removeProcess('non-existent'));
      expect(state).toEqual(initialState);
    });
  });

  describe('Process Updates', () => {
    it('should update process details', () => {
      let state = processesReducer(
        initialState,
        addProcess({
          id: 'update-process',
          pid: 11111,
          sessionId: 'session-1',
        })
      );

      const originalPid = state.activeProcesses['update-process'].pid;

      state = processesReducer(
        state,
        updateProcess({
          id: 'update-process',
          updates: {
            pid: 22222,
          },
        })
      );

      expect(state.activeProcesses['update-process'].pid).toBe(22222);
      expect(state.activeProcesses['update-process'].pid).not.toBe(originalPid);
    });

    it('should not update non-existent process', () => {
      const state = processesReducer(
        initialState,
        updateProcess({
          id: 'non-existent',
          updates: {
            pid: 99999,
          },
        })
      );

      expect(state).toEqual(initialState);
    });
  });

  describe('Clear Processes', () => {
    it('should clear all processes', () => {
      let state = initialState;

      // Add multiple processes
      state = processesReducer(
        state,
        addProcess({
          id: 'process-1',
          pid: 11111,
          sessionId: 'session-1',
        })
      );

      state = processesReducer(
        state,
        addProcess({
          id: 'process-2',
          pid: 22222,
          sessionId: 'session-2',
        })
      );

      state = processesReducer(
        state,
        addProcess({
          id: 'process-3',
          pid: 33333,
          sessionId: 'session-3',
        })
      );

      expect(Object.keys(state.activeProcesses).length).toBe(3);

      // Clear all processes
      state = processesReducer(state, clearProcesses());

      expect(state.activeProcesses).toEqual({});
      expect(Object.keys(state.activeProcesses).length).toBe(0);
    });
  });

  describe('Complex Process Scenarios', () => {
    it('should handle process lifecycle', () => {
      let state = initialState;

      // Add a process
      state = processesReducer(
        state,
        addProcess({
          id: 'lifecycle-process',
          pid: 55555,
          sessionId: 'session-1',
        })
      );

      expect(state.activeProcesses['lifecycle-process']).toBeTruthy();
      expect(state.activeProcesses['lifecycle-process'].pid).toBe(55555);

      // Remove the process
      state = processesReducer(state, removeProcess('lifecycle-process'));

      expect(state.activeProcesses['lifecycle-process']).toBeUndefined();
    });

    it('should handle multiple processes for same session', () => {
      let state = initialState;
      const sessionId = 'multi-process-session';

      // Add multiple processes for the same session
      state = processesReducer(
        state,
        addProcess({
          id: 'process-1',
          pid: 10001,
          sessionId,
        })
      );

      state = processesReducer(
        state,
        addProcess({
          id: 'process-2',
          pid: 10002,
          sessionId,
        })
      );

      // Both processes should exist
      expect(state.activeProcesses['process-1']).toBeTruthy();
      expect(state.activeProcesses['process-2']).toBeTruthy();
      expect(state.activeProcesses['process-1'].sessionId).toBe(sessionId);
      expect(state.activeProcesses['process-2'].sessionId).toBe(sessionId);
    });
  });
});