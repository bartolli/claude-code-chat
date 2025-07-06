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
    messageAdded: (state, action: PayloadAction<{ 
      role: 'user' | 'assistant'; 
      content: string;
      messageId?: string;
      parentMessageId?: string;
      isThinkingActive?: boolean;
    }>) => {
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
          // Don't skip if this message has thinking indicators or a messageId
          if (lastMessage?.role === 'assistant' && !lastMessage.content && 
              !action.payload.isThinkingActive && !action.payload.messageId) {
            console.log('[sessionSlice] Skipping duplicate empty assistant message');
            return;
          }
          console.log('[sessionSlice] Adding empty assistant message as placeholder for tools or thinking');
        }
        
        const message: ClaudeMessage = {
          role: action.payload.role,
          content: action.payload.content,
          timestamp: Date.now(),
          messageId: action.payload.messageId,
          isThinkingActive: action.payload.isThinkingActive
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
    
    messageUpdated: (state, action: PayloadAction<{ 
      role: 'assistant'; 
      content?: string;
      isThinkingActive?: boolean;
      messageId?: string;
    }>) => {
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
            const message = session.messages[lastAssistantIndex];
            let hasChanges = false;
            
            if (action.payload.content !== undefined && message.content !== action.payload.content) {
              message.content = action.payload.content;
              hasChanges = true;
              // Clear thinking active state when content arrives
              if (action.payload.content && message.isThinkingActive) {
                message.isThinkingActive = false;
              }
            }
            // Update isThinkingActive if provided and different
            if (action.payload.isThinkingActive !== undefined && message.isThinkingActive !== action.payload.isThinkingActive) {
              message.isThinkingActive = action.payload.isThinkingActive;
              hasChanges = true;
            }
            // Update messageId if provided and currently undefined
            if (action.payload.messageId && !message.messageId) {
              message.messageId = action.payload.messageId;
              hasChanges = true;
              console.log('[sessionSlice] Updated message with messageId:', action.payload.messageId);
            }
            
            // Only update timestamp if there were actual changes
            if (hasChanges) {
              session.updatedAt = Date.now();
            }
        } else {
          // No assistant message yet, create one
          const message: ClaudeMessage = {
            role: 'assistant',
            content: action.payload.content || '',
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
    
    thinkingUpdated: (state, action: PayloadAction<{ content: string; currentLine?: string; isActive: boolean; duration?: number; messageId?: string | null; isIncremental?: boolean }>) => {
      console.log('[sessionSlice] thinkingUpdated:', {
        content: action.payload.content?.substring(0, 50),
        currentLine: action.payload.currentLine,
        isActive: action.payload.isActive,
        duration: action.payload.duration,
        messageId: action.payload.messageId,
        isIncremental: action.payload.isIncremental
      });
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      let targetIndex = -1;
      
      // If messageId provided, find that specific message
      if (action.payload.messageId) {
        console.log('[sessionSlice] Looking for message with ID:', action.payload.messageId);
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            console.log(`[sessionSlice] Checking message ${i} with messageId:`, messages[i].messageId);
            if (messages[i].messageId === action.payload.messageId) {
              targetIndex = i;
              console.log('[sessionSlice] Found matching message at index:', i);
              break;
            }
          }
        }
      }
      
      // Fall back to finding the last assistant message if no messageId or not found
      if (targetIndex === -1) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            targetIndex = i;
            // If we have a messageId and the message doesn't, update it
            if (action.payload.messageId && !messages[i].messageId) {
              messages[i].messageId = action.payload.messageId;
              console.log('[sessionSlice] Assigned messageId to message at index:', i, 'messageId:', action.payload.messageId);
            }
            break;
          }
        }
      }
      if (targetIndex >= 0) {
        // Update thinking content
        if (action.payload.content !== undefined) {
          if (action.payload.isIncremental) {
            // Append new content to existing thinking
            messages[targetIndex].thinking = (messages[targetIndex].thinking || '') + action.payload.content;
          } else {
            // Replace entire thinking content
            messages[targetIndex].thinking = action.payload.content;
          }
        }
        if (action.payload.duration !== undefined) {
          messages[targetIndex].thinkingDuration = action.payload.duration;
        }
        if (action.payload.currentLine !== undefined) {
          messages[targetIndex].currentThinkingLine = action.payload.currentLine;
        }
        // Store thinking active state
        messages[targetIndex].isThinkingActive = action.payload.isActive;
        
        console.log('[sessionSlice] Updated message thinking state:', {
          index: targetIndex,
          messageId: messages[targetIndex].messageId,
          isThinkingActive: messages[targetIndex].isThinkingActive,
          thinkingDuration: messages[targetIndex].thinkingDuration,
          contentLength: messages[targetIndex].thinking?.length
        });
        
        // Ensure activeSession is updated too with new reference for React
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession = {
            ...state.activeSession,
            messages: [...state.activeSession.messages]
          };
          state.activeSession.messages[targetIndex] = { ...messages[targetIndex] };
          console.log('[sessionSlice] Updated activeSession thinking state');
        }
      }
    },
    
    tokenUsageUpdated: (state, action: PayloadAction<{
      inputTokens: number;
      outputTokens: number;
      thinkingTokens?: number;
      cacheTokens?: number;
    }>) => {
      console.log('[sessionSlice] tokenUsageUpdated:', action.payload);
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      // Find the last assistant message to attach token usage
      let lastAssistantIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }
      
      if (lastAssistantIndex >= 0) {
        const message = messages[lastAssistantIndex];
        // Store token usage on the message
        message.tokenUsage = {
          input: action.payload.inputTokens,
          output: action.payload.outputTokens,
          cache: action.payload.cacheTokens || 0,
          thinking: action.payload.thinkingTokens || 0
        };
        
        // Also update session totals
        session.totalInputTokens = (session.totalInputTokens || 0) + action.payload.inputTokens;
        session.totalOutputTokens = (session.totalOutputTokens || 0) + action.payload.outputTokens;
      }
    },
    
    toolUseAdded: (state, action: PayloadAction<{
      toolName: string;
      toolId: string;
      input: any;
      status: string;
      parentToolUseId?: string;
    }>) => {
      console.log('[sessionSlice] toolUseAdded:', action.payload);
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) return;
      
      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;
      
      let targetIndex = -1;
      
      // Find the last assistant message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          targetIndex = i;
          break;
        }
      }
      
      if (targetIndex >= 0) {
        const message = messages[targetIndex];
        if (!message.toolUses) {
          message.toolUses = [];
        }
        
        // Add the tool use with parent ID if available
        message.toolUses.push({
          toolName: action.payload.toolName,
          toolId: action.payload.toolId,
          input: action.payload.input,
          parentToolUseId: action.payload.parentToolUseId
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
      parentToolUseId?: string;
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
            
            // Store parent tool use ID if provided
            if (action.payload.parentToolUseId) {
              toolUse.parentToolUseId = action.payload.parentToolUseId;
            }
            
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
  tokenUsageUpdated,
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