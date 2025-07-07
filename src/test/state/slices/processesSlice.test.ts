/**
 * Tests for processes slice
 */

import * as assert from 'assert';
import processesReducer, {
  addProcess,
  removeProcess,
  updateProcess,
  clearProcesses,
} from '../../../state/slices/processesSlice';
import { ProcessState } from '../../../types/state';

suite('Processes Slice Test Suite', () => {
  const initialState: ProcessState = {
    activeProcesses: {},
  };

  test('should handle initial state', () => {
    const state = processesReducer(undefined, { type: 'unknown' });
    assert.deepStrictEqual(state, initialState);
  });

  suite('Process Management', () => {
    test('should add a process', () => {
      const process = {
        id: 'process-1',
        pid: 12345,
        sessionId: 'session-1',
      };

      const state = processesReducer(initialState, addProcess(process));

      assert.ok(state.activeProcesses['process-1']);
      assert.strictEqual(state.activeProcesses['process-1'].pid, 12345);
      assert.strictEqual(state.activeProcesses['process-1'].sessionId, 'session-1');
      // Process should be added (status is not stored in the current implementation)
      assert.ok(state.activeProcesses['process-1'].startedAt);
    });

    test('should add multiple processes', () => {
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

      assert.strictEqual(Object.keys(state.activeProcesses).length, 2);
      assert.ok(state.activeProcesses['process-1']);
      assert.ok(state.activeProcesses['process-2']);
    });

    test('should remove a process', () => {
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

      assert.ok(state.activeProcesses['process-to-remove']);

      // Remove the process
      state = processesReducer(state, removeProcess('process-to-remove'));

      assert.strictEqual(state.activeProcesses['process-to-remove'], undefined);
      assert.strictEqual(Object.keys(state.activeProcesses).length, 0);
    });

    test('should handle removing non-existent process', () => {
      const state = processesReducer(initialState, removeProcess('non-existent'));
      assert.deepStrictEqual(state, initialState);
    });
  });

  suite('Process Updates', () => {
    test('should update process details', () => {
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

      assert.strictEqual(state.activeProcesses['update-process'].pid, 22222);
      assert.notStrictEqual(state.activeProcesses['update-process'].pid, originalPid);
    });

    test('should not update non-existent process', () => {
      const state = processesReducer(
        initialState,
        updateProcess({
          id: 'non-existent',
          updates: {
            pid: 99999,
          },
        })
      );

      assert.deepStrictEqual(state, initialState);
    });
  });

  suite('Clear Processes', () => {
    test('should clear all processes', () => {
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

      assert.strictEqual(Object.keys(state.activeProcesses).length, 3);

      // Clear all processes
      state = processesReducer(state, clearProcesses());

      assert.deepStrictEqual(state.activeProcesses, {});
      assert.strictEqual(Object.keys(state.activeProcesses).length, 0);
    });
  });

  suite('Complex Process Scenarios', () => {
    test('should handle process lifecycle', () => {
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

      assert.ok(state.activeProcesses['lifecycle-process']);
      assert.strictEqual(state.activeProcesses['lifecycle-process'].pid, 55555);

      // Remove the process
      state = processesReducer(state, removeProcess('lifecycle-process'));

      assert.strictEqual(state.activeProcesses['lifecycle-process'], undefined);
    });

    test('should handle multiple processes for same session', () => {
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
      assert.ok(state.activeProcesses['process-1']);
      assert.ok(state.activeProcesses['process-2']);
      assert.strictEqual(state.activeProcesses['process-1'].sessionId, sessionId);
      assert.strictEqual(state.activeProcesses['process-2'].sessionId, sessionId);
    });
  });
});
