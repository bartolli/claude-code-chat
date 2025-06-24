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
    },
    
    // Streaming message handling
    messageAdded: (state, action: PayloadAction<{ role: 'user' | 'assistant'; content: string }>) => {
      // Don't add empty messages
      if (!action.payload.content && action.payload.role === 'assistant') {
        return;
      }
      
      // Ensure we have a current session
      if (!state.currentSessionId) {
        // Create a new session if none exists
        const sessionId = uuidv4();
        const now = Date.now();
        state.sessions[sessionId] = {
          id: sessionId,
          title: 'New Conversation',
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
      }
      
      const session = state.sessions[state.currentSessionId];
      if (session) {
        const message: ClaudeMessage = {
          role: action.payload.role,
          content: action.payload.content,
          timestamp: Date.now()
        };
        
        session.messages.push(message);
        session.updatedAt = Date.now();
        
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
        }
      }
    },
    
    messageUpdated: (state, action: PayloadAction<{ role: 'assistant'; content: string }>) => {
      // Ensure we have a current session
      if (!state.currentSessionId) {
        // Create a new session if none exists
        const sessionId = uuidv4();
        const now = Date.now();
        state.sessions[sessionId] = {
          id: sessionId,
          title: 'New Conversation',
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
      }
      
      const session = state.sessions[state.currentSessionId];
      if (session) {
        // Find the last assistant message
        let lastAssistantIndex = -1;
        for (let i = session.messages.length - 1; i >= 0; i--) {
          if (session.messages[i].role === 'assistant') {
            lastAssistantIndex = i;
            break;
          }
        }
        
        if (lastAssistantIndex !== -1) {
          // Update existing assistant message
          session.messages[lastAssistantIndex].content = action.payload.content;
        } else {
          // No assistant message yet, create one
          const message: ClaudeMessage = {
            role: 'assistant',
            content: action.payload.content,
            timestamp: Date.now()
          };
          session.messages.push(message);
        }
        
        session.updatedAt = Date.now();
        
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
        }
      }
    },
    
    messageCompleted: (state) => {
      // Mark the current streaming as complete
      state.isLoading = false;
      
      if (state.currentSessionId && state.sessions[state.currentSessionId]) {
        state.sessions[state.currentSessionId].updatedAt = Date.now();
      }
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
  loadSessions,
  messageAdded,
  messageUpdated,
  messageCompleted
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