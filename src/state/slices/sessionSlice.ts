/**
 * Session state slice - aligned with Claude Code JSON communication
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { SessionState } from '../../types/state';
import { ClaudeMessage } from '../../types/claude';
import { resetAllState } from '../actions';

const initialState: SessionState = {
  currentSessionId: undefined,
  sessions: {},
  activeSession: undefined,
  isLoading: false,
  error: undefined,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // Session management - matches existing extension patterns
    /**
     * Create a new session with the given ID and optional title
     * @param state - The session state
     * @param action - Action containing session ID and optional title
     */
    createSession: (
      state,
      action: PayloadAction<{
        /** Unique identifier for the new session */
        sessionId: string;
        /** Optional title for the session */
        title?: string;
      }>
    ) => {
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
        totalCost: 0,
      };

      state.currentSessionId = sessionId;
      state.activeSession = state.sessions[sessionId];
    },

    /**
     * Set the currently active session by ID
     * @param state - The session state
     * @param action - Action containing session ID or undefined to clear
     */
    setCurrentSession: (state, action: PayloadAction<string | undefined>) => {
      state.currentSessionId = action.payload;
      state.activeSession = action.payload ? state.sessions[action.payload] : undefined;
    },

    /**
     * Update the title of an existing session
     * @param state - The session state
     * @param action - Action containing session ID and new title
     */
    updateSessionTitle: (
      state,
      action: PayloadAction<{
        /** ID of the session to update */
        sessionId: string;
        /** New title for the session */
        title: string;
      }>
    ) => {
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
    /**
     * Add a new message to a session
     * @param state - The session state
     * @param action - Action containing session ID and message to add
     */
    addMessage: (
      state,
      action: PayloadAction<{
        /** ID of the session to add the message to */
        sessionId: string;
        /** The message to add */
        message: ClaudeMessage;
      }>
    ) => {
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
    /**
     * Update token usage and cost for a session
     * @param state - The session state
     * @param action - Action containing session ID and token/cost data
     */
    updateTokenUsage: (
      state,
      action: PayloadAction<{
        /** ID of the session to update */
        sessionId: string;
        /** Number of input tokens used */
        inputTokens: number;
        /** Number of output tokens generated */
        outputTokens: number;
        /** Total cost in dollars */
        cost: number;
      }>
    ) => {
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
    /**
     * Set the loading state for session operations
     * @param state - The session state
     * @param action - Action containing loading state boolean
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set or clear the error message
     * @param state - The session state
     * @param action - Action containing error message or undefined
     */
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },

    // Clear session
    /**
     * Clear all messages and reset token counts for a session
     * @param state - The session state
     * @param action - Action containing session ID to clear
     */
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
    /**
     * Delete a session and all its data
     * @param state - The session state
     * @param action - Action containing session ID to delete
     */
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      delete state.sessions[sessionId];

      if (state.currentSessionId === sessionId) {
        state.currentSessionId = undefined;
        state.activeSession = undefined;
      }
    },

    // Load sessions from storage
    /**
     * Load multiple sessions from storage
     * @param state - The session state
     * @param action - Action containing sessions object to load
     */
    loadSessions: (state, action: PayloadAction<SessionState['sessions']>) => {
      state.sessions = action.payload;
    },

    // Streaming message handling
    /**
     * Add a new message during streaming
     * @param state - The session state
     * @param action - Action containing message details
     */
    messageAdded: (
      state,
      action: PayloadAction<{
        /** Message role (user or assistant) */
        role: 'user' | 'assistant';
        /** Message content */
        content: string;
        /** Unique message identifier */
        messageId?: string;
        /** Parent message ID for threading */
        parentMessageId?: string;
        /** Whether thinking mode is active */
        isThinkingActive?: boolean;
      }>
    ) => {
      // Log message addition for debugging

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
          totalCost: 0,
        };
        state.currentSessionId = sessionId;
        state.activeSession = state.sessions[sessionId];
      }

      const session = state.sessions[state.currentSessionId];
      if (session) {
        // Check for duplicate user messages (within last 2 seconds)
        if (action.payload.role === 'user') {
          const recentMessages = session.messages.filter(
            (msg) =>
              msg.role === 'user' &&
              msg.content === action.payload.content &&
              msg.timestamp &&
              Date.now() - msg.timestamp < 2000
          );

          if (recentMessages.length > 0) {
            // Ignoring duplicate user message
            return; // Skip duplicate
          }
        }

        // Check for empty assistant message duplicates
        if (!action.payload.content && action.payload.role === 'assistant') {
          const lastMessage = session.messages[session.messages.length - 1];
          // Don't skip if this message has thinking indicators or a messageId
          if (
            lastMessage?.role === 'assistant' &&
            !lastMessage.content &&
            !action.payload.isThinkingActive &&
            !action.payload.messageId
          ) {
            // Skipping duplicate empty assistant message
            return;
          }
          // Adding empty assistant message as placeholder for tools or thinking
        }

        const message: ClaudeMessage = {
          role: action.payload.role,
          content: action.payload.content,
          timestamp: Date.now(),
          messageId: action.payload.messageId,
          isThinkingActive: action.payload.isThinkingActive,
        };

        // Adding message to session
        session.messages.push(message);
        session.updatedAt = Date.now();

        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
          // Updated activeSession messages
        }
      }
    },

    /**
     * Update an existing assistant message during streaming
     * @param state - The session state
     * @param action - Action containing message updates
     */
    messageUpdated: (
      state,
      action: PayloadAction<{
        /** Role is always assistant for updates */
        role: 'assistant';
        /** Updated message content */
        content?: string;
        /** Whether thinking mode is active */
        isThinkingActive?: boolean;
        /** Message ID to update */
        messageId?: string;
      }>
    ) => {
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
          totalCost: 0,
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
          if (
            action.payload.isThinkingActive !== undefined &&
            message.isThinkingActive !== action.payload.isThinkingActive
          ) {
            message.isThinkingActive = action.payload.isThinkingActive;
            hasChanges = true;
          }
          // Update messageId if provided and currently undefined
          if (action.payload.messageId && !message.messageId) {
            message.messageId = action.payload.messageId;
            hasChanges = true;
            // Updated message with messageId
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
            timestamp: Date.now(),
          };
          session.messages.push(message);
        }

        session.updatedAt = Date.now();

        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
        }
      }
    },

    /**
     * Mark message streaming as complete
     * @param state - The session state
     */
    messageCompleted: (state) => {
      // Mark the current streaming as complete
      state.isLoading = false;

      if (state.currentSessionId && state.sessions[state.currentSessionId]) {
        state.sessions[state.currentSessionId].updatedAt = Date.now();
      }
    },

    /**
     * Update thinking state for a message
     * @param state - The session state
     * @param action - Action containing thinking update details
     */
    thinkingUpdated: (
      state,
      action: PayloadAction<{
        /** Thinking content */
        content: string;
        /** Current line being processed */
        currentLine?: string;
        /** Whether thinking is active */
        isActive: boolean;
        /** Duration of thinking in milliseconds */
        duration?: number;
        /** Target message ID */
        messageId?: string | null;
        /** Whether to append to existing thinking content */
        isIncremental?: boolean;
      }>
    ) => {
      // Update thinking state for a message
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) {
        return;
      }

      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;

      let targetIndex = -1;

      // If messageId provided, find that specific message
      if (action.payload.messageId) {
        // Looking for message with specific ID
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            // Checking message for matching ID
            if (messages[i].messageId === action.payload.messageId) {
              targetIndex = i;
              // Found matching message
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
              // Assigned messageId to message
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
            messages[targetIndex].thinking =
              (messages[targetIndex].thinking || '') + action.payload.content;
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

        // Updated message thinking state

        // Ensure activeSession is updated too with new reference for React
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession = {
            ...state.activeSession,
            messages: [...state.activeSession.messages],
          };
          state.activeSession.messages[targetIndex] = { ...messages[targetIndex] };
          // Updated activeSession thinking state
        }
      }
    },

    /**
     * Update token usage for the current message
     * @param state - The session state
     * @param action - Action containing token usage data
     */
    tokenUsageUpdated: (
      state,
      action: PayloadAction<{
        /** Number of input tokens */
        inputTokens: number;
        /** Number of output tokens */
        outputTokens: number;
        /** Number of thinking tokens */
        thinkingTokens?: number;
        /** Number of cached tokens */
        cacheTokens?: number;
      }>
    ) => {
      // Update token usage for the last assistant message
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) {
        return;
      }

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
          thinking: action.payload.thinkingTokens || 0,
        };

        // Also update session totals
        session.totalInputTokens = (session.totalInputTokens || 0) + action.payload.inputTokens;
        session.totalOutputTokens = (session.totalOutputTokens || 0) + action.payload.outputTokens;
      }
    },

    /**
     * Add a tool use to the current message
     * @param state - The session state
     * @param action - Action containing tool use details
     */
    toolUseAdded: (
      state,
      action: PayloadAction<{
        /** Name of the tool being used */
        toolName: string;
        /** Unique identifier for this tool use */
        toolId: string;
        /** Input parameters for the tool */
        input: any;
        /** Current status of the tool use */
        status: string;
        /** Parent tool use ID for nested calls */
        parentToolUseId?: string;
      }>
    ) => {
      // Add tool use to the last assistant message
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) {
        return;
      }

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
          parentToolUseId: action.payload.parentToolUseId,
        });

        // Update activeSession to trigger re-render
        if (state.activeSession?.id === state.currentSessionId) {
          state.activeSession.messages = [...session.messages];
        }
      }
    },

    /**
     * Add a result for a tool use
     * @param state - The session state
     * @param action - Action containing tool result details
     */
    toolResultAdded: (
      state,
      action: PayloadAction<{
        /** ID of the tool use to add result to */
        toolId: string;
        /** Result from the tool execution */
        result: string;
        /** Whether the tool execution resulted in an error */
        isError?: boolean;
        /** Updated status of the tool use */
        status: string;
        /** Parent tool use ID for nested calls */
        parentToolUseId?: string;
      }>
    ) => {
      // Add tool result to the corresponding tool use
      if (!state.currentSessionId || !state.sessions[state.currentSessionId]) {
        return;
      }

      const session = state.sessions[state.currentSessionId];
      const messages = session.messages;

      // Find the message with this tool ID
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.toolUses) {
          const toolUse = message.toolUses.find((t) => t.toolId === action.payload.toolId);
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
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  },
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
  toolResultAdded,
} = sessionSlice.actions;

// Selectors
/**
 * Select the currently active session
 * @param state - The Redux state object
 * @param state.session - The session slice of the state
 * @returns The active session or undefined
 */
export const selectCurrentSession = (state: {
  /** The session slice of the state */
  session: SessionState;
}) => state.session.activeSession;
/**
 * Select the total token count for the current session
 * @param state - The Redux state object
 * @param state.session - The session slice of the state
 * @returns Total number of tokens used in the current session
 */
export const selectCurrentSessionTokens = (state: {
  /** The session slice of the state */
  session: SessionState;
}) => {
  const session = state.session.activeSession;
  if (!session) {
    return 0;
  }
  return (session.totalInputTokens || 0) + (session.totalOutputTokens || 0);
};
/**
 * Select the total cost for the current session
 * @param state - The Redux state object
 * @param state.session - The session slice of the state
 * @returns Total cost in dollars for the current session
 */
export const selectCurrentSessionCost = (state: {
  /** The session slice of the state */
  session: SessionState;
}) => {
  return state.session.activeSession?.totalCost || 0;
};
/**
 * Select whether sessions are loading
 * @param state - The Redux state object
 * @param state.session - The session slice of the state
 * @returns Whether sessions are currently loading
 */
export const selectIsLoading = (state: {
  /** The session slice of the state */
  session: SessionState;
}) => state.session.isLoading;
/**
 * Select the current session error if any
 * @param state - The Redux state object
 * @param state.session - The session slice of the state
 * @returns Error message or undefined if no error
 */
export const selectError = (state: {
  /** The session slice of the state */
  session: SessionState;
}) => state.session.error;

export default sessionSlice.reducer;
