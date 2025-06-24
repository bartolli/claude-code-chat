/**
 * Redux selectors for efficient state access
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';

// Session selectors
export const selectCurrentSessionId = (state: RootState) => state.session.currentSessionId;
export const selectSessions = (state: RootState) => state.session.sessions;
export const selectActiveSession = (state: RootState) => state.session.activeSession;
export const selectIsLoading = (state: RootState) => state.session.isLoading;
export const selectSessionError = (state: RootState) => state.session.error;

export const selectCurrentSession = createSelector(
  [selectSessions, selectCurrentSessionId],
  (sessions, currentId) => currentId ? sessions[currentId] : undefined
);

export const selectSessionMessages = createSelector(
  [selectActiveSession],
  (session) => session?.messages || []
);

export const selectSessionStats = createSelector(
  [selectActiveSession],
  (session) => ({
    inputTokens: session?.totalInputTokens || 0,
    outputTokens: session?.totalOutputTokens || 0,
    cost: session?.totalCost || 0
  })
);

// Config selectors
export const selectSelectedModel = (state: RootState) => state.config.selectedModel;
export const selectAutoSave = (state: RootState) => state.config.autoSave;
export const selectGitBackup = (state: RootState) => state.config.gitBackup;
export const selectTheme = (state: RootState) => state.config.theme;
export const selectFontSize = (state: RootState) => state.config.fontSize;

// UI selectors
export const selectIsWebviewReady = (state: RootState) => state.ui.isWebviewReady;
export const selectIsClaudeRunning = (state: RootState) => state.ui.isClaudeRunning;
export const selectShowThinking = (state: RootState) => state.ui.showThinking;
export const selectShowCost = (state: RootState) => state.ui.showCost;
export const selectExpandedTools = (state: RootState) => state.ui.expandedTools;

export const selectIsToolExpanded = (toolId: string) => 
  createSelector(
    [selectExpandedTools],
    (expandedTools) => !!expandedTools[toolId]
  );

// Process selectors
export const selectActiveProcesses = (state: RootState) => state.processes.activeProcesses;

export const selectProcessBySessionId = (sessionId: string) =>
  createSelector(
    [selectActiveProcesses],
    (processes) => Object.values(processes).find(p => p.sessionId === sessionId)
  );

export const selectHasActiveProcess = createSelector(
  [selectActiveProcesses],
  (processes) => Object.keys(processes).length > 0
);

// Aggregate selectors (for compatibility with existing extension)
export const selectTotalStats = createSelector(
  [selectSessions],
  (sessions) => {
    const totals = Object.values(sessions).reduce(
      (acc, session) => ({
        inputTokens: acc.inputTokens + session.totalInputTokens,
        outputTokens: acc.outputTokens + session.totalOutputTokens,
        cost: acc.cost + session.totalCost,
        sessionCount: acc.sessionCount + 1
      }),
      { inputTokens: 0, outputTokens: 0, cost: 0, sessionCount: 0 }
    );
    
    return totals;
  }
);

export const selectRecentSessions = createSelector(
  [selectSessions],
  (sessions) => {
    return Object.values(sessions)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
  }
);