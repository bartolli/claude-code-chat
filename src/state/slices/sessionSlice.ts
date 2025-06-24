/**
 * Session state slice - aligned with Claude Code JSON communication
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { SessionState } from '../../types/state';
import { ClaudeMessage, ClaudeResultMessage } from '../../types/claude';
import { resetAllState } from '../actions';

const initialState: SessionState = {
  currentSessionId: undefined,
  sessions: {},
  activeSession: undefined,
  isLoading: false,
  error: undefined
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // Session management - matches existing extension patterns
    createSession: (state, action: PayloadAction<{ sessionId: string; title?: string }>) => {
      const { sessionId, title } = action.payload;
      const now = Date.now();
      
      state.sessions[sessionId] = {
        id: sessionId,
        title: title || 'New Conversation',
        createdAt: now,
        updatedAt: now,
        model: 'default',
        messages: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0
      };
      
      state.currentSessionId = sessionId;
      state.activeSession = state.sessions[sessionId];
    },
    
    setCurrentSession: (state, action: PayloadAction<string | undefined>) => {
      state.currentSessionId = action.payload;
      state.activeSession = action.payload ? state.sessions[action.payload] : undefined;
    },
    
    updateSessionTitle: (state, action: PayloadAction<{ sessionId: string; title: string }>) => {
      const { sessionId, title } = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].title = title;
        state.sessions[sessionId].updatedAt = Date.now();
        
        if (state.activeSession?.id === sessionId) {
          state.activeSession.title = title;
        }
      }
    },
    
    // Message management
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: ClaudeMessage }>) => {
      const { sessionId, message } = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].messages.push(message);
        state.sessions[sessionId].updatedAt = Date.now();
        
        if (state.activeSession?.id === sessionId) {
          state.activeSession.messages.push(message);
        }
      }
    },
    
    // Token and cost tracking
    updateTokenUsage: (state, action: PayloadAction<{
      sessionId: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>) => {
      const { sessionId, inputTokens, outputTokens, cost } = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].totalInputTokens += inputTokens;
        state.sessions[sessionId].totalOutputTokens += outputTokens;
        state.sessions[sessionId].totalCost += cost;
        state.sessions[sessionId].updatedAt = Date.now();
        
        if (state.activeSession?.id === sessionId) {
          state.activeSession.totalInputTokens = state.sessions[sessionId].totalInputTokens;
          state.activeSession.totalOutputTokens = state.sessions[sessionId].totalOutputTokens;
          state.activeSession.totalCost = state.sessions[sessionId].totalCost;
        }
      }
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
    
    // Clear session
    clearSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].messages = [];
        state.sessions[sessionId].totalInputTokens = 0;
        state.sessions[sessionId].totalOutputTokens = 0;
        state.sessions[sessionId].totalCost = 0;
        state.sessions[sessionId].updatedAt = Date.now();
        
        if (state.activeSession?.id === sessionId) {
          state.activeSession = state.sessions[sessionId];
        }
      }
    },
    
    // Delete session
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      delete state.sessions[sessionId];
      
      if (state.currentSessionId === sessionId) {
        state.currentSessionId = undefined;
        state.activeSession = undefined;
      }
    },
    
    // Load sessions from storage
    loadSessions: (state, action: PayloadAction<SessionState['sessions']>) => {
      state.sessions = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  }
});

export const {
  createSession,
  setCurrentSession,
  updateSessionTitle,
  addMessage,
  updateTokenUsage,
  setLoading,
  setError,
  clearSession,
  deleteSession,
  loadSessions
} = sessionSlice.actions;

// Selectors
export const selectCurrentSession = (state: { session: SessionState }) => state.session.activeSession;
export const selectCurrentSessionTokens = (state: { session: SessionState }) => {
  const session = state.session.activeSession;
  if (!session) return 0;
  return (session.totalInputTokens || 0) + (session.totalOutputTokens || 0);
};
export const selectCurrentSessionCost = (state: { session: SessionState }) => {
  return state.session.activeSession?.totalCost || 0;
};
export const selectIsLoading = (state: { session: SessionState }) => state.session.isLoading;
export const selectError = (state: { session: SessionState }) => state.session.error;

export default sessionSlice.reducer;