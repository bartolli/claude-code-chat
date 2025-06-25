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
      console.log('[sessionSlice] messageAdded called with:', action.payload);
      
      // We'll check for empty duplicates after ensuring we have a session
      
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
        // Check for duplicate user messages (within last 2 seconds)
        if (action.payload.role === 'user') {
          const recentMessages = session.messages.filter(
            msg => msg.role === 'user' && 
            msg.content === action.payload.content &&
            msg.timestamp && (Date.now() - msg.timestamp < 2000)
          );
          
          if (recentMessages.length > 0) {
            console.warn('[sessionSlice] Ignoring duplicate user message:', action.payload.content);
            return; // Skip duplicate
          }
        }
        
        // Check for empty assistant message duplicates
        if (!action.payload.content && action.payload.role === 'assistant') {
          const lastMessage = session.messages[session.messages.length - 1];
          if (lastMessage?.role === 'assistant' && !lastMessage.content) {
            console.log('[sessionSlice] Skipping duplicate empty assistant message');
            return;
          }
          console.log('[sessionSlice] Adding empty assistant message as placeholder for tools');
        }
        
        const message: ClaudeMessage = {
          role: action.payload.role,
          content: action.payload.content,
          timestamp: Date.now()
        };
        
        console.log('[sessionSlice] Adding message to session:', message);
        session.messages.push(message);
        session.updatedAt = Date.now();
        
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
          console.log('[sessionSlice] Updated activeSession messages count:', state.activeSession.messages.length);
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
    },
    
    thinkingUpdated: (state, action: PayloadAction<{ content: string; isActive: boolean }>) => {
      console.log('[sessionSlice] thinkingUpdated:', action.payload);
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      // Find the last assistant message
      let lastAssistantIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }
      if (lastAssistantIndex >= 0) {
        messages[lastAssistantIndex].thinking = action.payload.content;
      }
    },
    
    toolUseAdded: (state, action: PayloadAction<{
      toolName: string;
      toolId: string;
      input: any;
      status: string;
    }>) => {
      console.log('[sessionSlice] toolUseAdded:', action.payload);
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      // Find the last assistant message
      let lastAssistantIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }
      if (lastAssistantIndex >= 0) {
        const message = messages[lastAssistantIndex];
        if (!message.toolUses) {
          message.toolUses = [];
        }
        
        // Add the tool use
        message.toolUses.push({
          toolName: action.payload.toolName,
          toolId: action.payload.toolId,
          input: action.payload.input
        });
        
        // Update activeSession to trigger re-render
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
        }
      }
    },
    
    toolResultAdded: (state, action: PayloadAction<{
      toolId: string;
      result: string;
      isError?: boolean;
      status: string;
    }>) => {
      console.log('[sessionSlice] toolResultAdded:', action.payload);
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      // Find the message with this tool ID
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.toolUses) {
          const toolUse = message.toolUses.find(t => t.toolId === action.payload.toolId);
          if (toolUse) {
            toolUse.result = action.payload.result;
            toolUse.isError = action.payload.isError;
            
            // Update activeSession to trigger re-render
            if (state.activeSession?.id === state.currentSessionId) {
              state.activeSession.messages = [...session.messages];
            }
            break;
          }
        }
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
  messageCompleted,
  thinkingUpdated,
  toolUseAdded,
  toolResultAdded
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