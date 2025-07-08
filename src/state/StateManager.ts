/**
 * State Manager - Facade for Redux store that maintains compatibility with existing extension
 */

import * as vscode from 'vscode';
import store, { RootState, AppDispatch } from './store';
import { getLogger } from '../core/Logger';
import {
  createSession,
  setCurrentSession,
  updateSessionTitle,
  addMessage,
  updateTokenUsage,
  setLoading,
  setError,
  messageAdded,
  messageUpdated,
  messageCompleted,
  thinkingUpdated,
  tokenUsageUpdated,
  toolUseAdded,
  toolResultAdded,
  clearSession,
  deleteSession,
  loadSessions,
} from './slices/sessionSlice';
import { setSelectedModel, setAutoSave, setGitBackup } from './slices/configSlice';
import {
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  showPermissionRequest,
  clearPermissionRequest,
  resetUI,
} from './slices/uiSlice';
import { addProcess, removeProcess } from './slices/processesSlice';
import { setProcessing } from './slices/claudeSlice';
import { updateConnectedServers, setMcpServers, updateServerStatus } from './slices/mcpSlice';
import { ClaudeMessage, ClaudeResultMessage } from '../types/claude';

/**
 * StateManager provides a facade interface for the Redux store, maintaining backward compatibility
 * with the existing extension architecture while enabling gradual migration to Redux.
 *
 * This class implements the Singleton pattern to ensure a single source of truth for application state.
 * It bridges the gap between the legacy state management patterns and the new Redux-based architecture.
 *
 * @example
 * ```typescript
 * const stateManager = StateManager.getInstance();
 * stateManager.initialize(context);
 * stateManager.createOrResumeSession('session-123', 'New Chat');
 * ```
 */
export class StateManager {
  /** Singleton instance of the StateManager */
  private static instance: StateManager;
  /** Logger instance for debugging and error tracking */
  private static readonly logger = getLogger();
  /** Redux store instance containing the application state */
  private readonly store = store;
  /** VS Code extension context for workspace state persistence */
  private context: vscode.ExtensionContext | undefined;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the StateManager and logs the initialization.
   */
  private constructor() {
    StateManager.logger.info('StateManager', 'Initializing state manager');
  }

  /**
   * Gets the singleton instance of StateManager.
   * Creates a new instance if one doesn't exist.
   *
   * @returns The singleton StateManager instance
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initialize the StateManager with VS Code extension context.
   * This enables persistence of state across extension restarts.
   *
   * @param context - VS Code extension context providing storage APIs
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.loadPersistedState();
  }

  /**
   * Get the underlying Redux store instance.
   * Useful for advanced scenarios requiring direct store access.
   *
   * @returns The Redux store instance
   */
  public getStore() {
    return this.store;
  }

  /**
   * Get the current application state from the Redux store.
   *
   * @returns The complete application state tree
   */
  public getState(): RootState {
    return this.store.getState();
  }

  /**
   * Dispatch a Redux action to update the state.
   *
   * @param action - Redux action object with type and optional payload
   */
  public dispatch(action: any): void {
    this.store.dispatch(action);
  }

  // Session Management (compatible with existing extension)

  /**
   * Create a new session or resume an existing one.
   * Maintains compatibility with the legacy _currentSessionId pattern.
   *
   * @param sessionId - Unique identifier for the session
   * @param title - Optional human-readable title for the session
   */
  public createOrResumeSession(sessionId: string, title?: string): void {
    const state = this.getState();

    if (!state.session.sessions[sessionId]) {
      this.dispatch(createSession({ sessionId, title }));
      StateManager.logger.info('StateManager', 'Created new session', { sessionId });
    } else {
      this.dispatch(setCurrentSession(sessionId));
      StateManager.logger.info('StateManager', 'Resumed existing session', { sessionId });
    }

    this.persistState();
  }

  /**
   * Get the ID of the currently active session.
   * Maintains compatibility with the legacy _currentSessionId property.
   *
   * @returns The current session ID, or undefined if no session is active
   */
  public getCurrentSessionId(): string | undefined {
    return this.getState().session.currentSessionId;
  }

  /**
   * Update session state based on a Claude API result message.
   * Creates or resumes the session and updates token usage statistics.
   *
   * @param result - Result message from Claude API containing session and usage data
   */
  public updateSessionFromResult(result: ClaudeResultMessage): void {
    if (result.session_id && result.subtype === 'success') {
      this.createOrResumeSession(result.session_id);

      if (result.usage && result.usage.input_tokens && result.usage.output_tokens) {
        this.dispatch(
          updateTokenUsage({
            sessionId: result.session_id,
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
            cost: result.total_cost_usd || 0,
          })
        );
      }
    }
  }

  /**
   * Set the current active session ID.
   * Primarily used for testing and scenarios requiring direct session control.
   *
   * @param sessionId - Session ID to set as current, or undefined to clear
   */
  public setCurrentSession(sessionId: string | undefined): void {
    this.dispatch(setCurrentSession(sessionId));
  }

  // Model Management (compatible with existing _selectedModel)

  /**
   * Get the currently selected Claude model.
   * Maintains compatibility with the legacy _selectedModel property.
   *
   * @returns The selected model identifier (e.g., 'opus', 'sonnet', 'default')
   */
  public getSelectedModel(): string {
    return this.getState().config.selectedModel;
  }

  /**
   * Set the selected Claude model with validation.
   * Maintains compatibility with the legacy _setSelectedModel method.
   *
   * @param model - Model identifier to select ('opus', 'sonnet', or 'default')
   * @returns true if the model was successfully set, false if invalid
   */
  public setSelectedModel(model: string): boolean {
    const validModels = ['opus', 'sonnet', 'default'];
    if (validModels.includes(model)) {
      this.dispatch(setSelectedModel(model as any));
      this.context?.workspaceState.update('claude.selectedModel', model);
      StateManager.logger.info('StateManager', 'Model selected', { model });
      return true;
    }
    StateManager.logger.warn('StateManager', 'Invalid model', { model });
    return false;
  }

  // UI State Management

  /**
   * Set whether Claude is currently processing a request.
   * Maintains compatibility with the legacy _currentClaudeProcess tracking.
   *
   * @param running - true if Claude is processing, false otherwise
   */
  public setClaudeRunning(running: boolean): void {
    this.dispatch(setClaudeRunning(running));
  }

  /**
   * Set whether the webview UI is ready to receive messages.
   *
   * @param ready - true if webview is initialized and ready, false otherwise
   */
  public setWebviewReady(ready: boolean): void {
    this.dispatch(setWebviewReady(ready));
  }

  // Process Management

  /**
   * Track a Claude process by associating it with a session.
   * Used for process lifecycle management and cleanup.
   *
   * @param sessionId - ID of the session associated with the process
   * @param pid - Process ID of the Claude process
   */
  public trackProcess(sessionId: string, pid: number): void {
    this.dispatch(
      addProcess({
        id: sessionId,
        pid,
        sessionId,
      })
    );
  }

  /**
   * Remove tracking for a Claude process.
   * Called when a process terminates or is no longer needed.
   *
   * @param sessionId - ID of the session whose process should be untracked
   */
  public untrackProcess(sessionId: string): void {
    this.dispatch(removeProcess(sessionId));
  }

  // Persistence (matches existing workspaceState patterns)

  /**
   * Load persisted state from VS Code workspace storage.
   * Restores user preferences and session data across extension restarts.
   */
  private loadPersistedState(): void {
    if (!this.context) {
      return;
    }

    // Load saved model preference (matches existing pattern)
    const savedModel = this.context.workspaceState.get<string>('claude.selectedModel', 'default');
    this.setSelectedModel(savedModel);

    // Load conversation index (matches existing pattern)
    const conversationIndex = this.context.workspaceState.get<any[]>(
      'claude.conversationIndex',
      []
    );
    // TODO: Convert conversation index to sessions

    StateManager.logger.info('StateManager', 'Loaded persisted state');
  }

  /**
   * Persist current state to VS Code workspace storage.
   * Saves user preferences and session data for future restoration.
   */
  private persistState(): void {
    if (!this.context) {
      return;
    }

    const state = this.getState();

    // Persist model selection
    this.context.workspaceState.update('claude.selectedModel', state.config.selectedModel);

    // TODO: Persist session data in compatible format

    StateManager.logger.debug('StateManager', 'Persisted state');
  }

  /**
   * Subscribe to Redux store state changes.
   *
   * @param listener - Callback function invoked when state changes
   * @returns Unsubscribe function to remove the listener
   */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * Calculate the total cost across all sessions.
   * Maintains compatibility with the legacy _totalCost property.
   *
   * @returns Total cost in USD across all sessions
   */
  public getTotalCost(): number {
    const state = this.getState();
    return Object.values(state.session.sessions).reduce(
      (total, session) => total + session.totalCost,
      0
    );
  }

  /**
   * Calculate the total token counts across all sessions.
   * Maintains compatibility with the legacy _totalTokensInput/_totalTokensOutput properties.
   *
   * @returns Object containing total input and output token counts
   */
  public getTotalTokens(): {
    /** Total number of input tokens across all sessions */
    input: number;
    /** Total number of output tokens across all sessions */
    output: number;
  } {
    const state = this.getState();
    const totals = Object.values(state.session.sessions).reduce(
      (acc, session) => ({
        input: acc.input + session.totalInputTokens,
        output: acc.output + session.totalOutputTokens,
      }),
      { input: 0, output: 0 }
    );

    return totals;
  }

  // Additional methods for current webview compatibility

  /**
   * Add a new message to the current session.
   * Maintains compatibility with the webview messageAdded action.
   *
   * @param message - Message object containing role, content, and optional metadata
   * @param message.role - Role of the message sender ('user' or 'assistant')
   * @param message.content - The message content text
   * @param message.messageId - Optional unique identifier for the message
   * @param message.isThinkingActive - Optional flag indicating if thinking mode is active
   */
  public addMessageToSession(message: {
    /** Role of the message sender ('user' or 'assistant') */
    role: 'user' | 'assistant';
    /** The message content text */
    content: string;
    /** Optional unique identifier for the message */
    messageId?: string;
    /** Optional flag indicating if thinking mode is active */
    isThinkingActive?: boolean;
  }): void {
    this.dispatch(messageAdded(message));
  }

  /**
   * Update an existing assistant message.
   * Maintains compatibility with the webview messageUpdated action.
   *
   * @param message - Message update object
   * @param message.role - Role must be 'assistant' for updates
   * @param message.content - Optional updated message content
   * @param message.isThinkingActive - Optional flag for thinking mode state
   * @param message.messageId - Optional message ID to update specific message
   */
  public updateMessage(message: {
    /** Role must be 'assistant' for updates */
    role: 'assistant';
    /** Optional updated message content */
    content?: string;
    /** Optional flag for thinking mode state */
    isThinkingActive?: boolean;
    /** Optional message ID to update specific message */
    messageId?: string;
  }): void {
    this.dispatch(messageUpdated(message));
  }

  /**
   * Update the thinking block state for Claude's internal reasoning.
   * Maintains compatibility with the webview thinkingUpdated action.
   *
   * @param data - Thinking state update data
   * @param data.content - The thinking content text
   * @param data.currentLine - Optional current line being processed
   * @param data.isActive - Whether thinking mode is currently active
   * @param data.duration - Optional duration of thinking in milliseconds
   * @param data.messageId - Optional message ID associated with thinking
   * @param data.isIncremental - Optional flag for incremental updates
   */
  public updateThinking(data: {
    /** The thinking content text */
    content: string;
    /** Optional current line being processed */
    currentLine?: string;
    /** Whether thinking mode is currently active */
    isActive: boolean;
    /** Optional duration of thinking in milliseconds */
    duration?: number;
    /** Optional message ID associated with thinking */
    messageId?: string;
    /** Optional flag for incremental updates */
    isIncremental?: boolean;
  }): void {
    this.dispatch(thinkingUpdated(data));
  }

  /**
   * Add a tool use event to the current session.
   * Maintains compatibility with the webview toolUseAdded action.
   *
   * @param data - Tool use data
   * @param data.toolName - Name of the tool being used
   * @param data.toolId - Unique identifier for this tool invocation
   * @param data.input - Input parameters passed to the tool
   * @param data.status - Current status of the tool execution
   * @param data.parentToolUseId - Optional ID of parent tool use for nested calls
   */
  public addToolUse(data: {
    /** Name of the tool being used */
    toolName: string;
    /** Unique identifier for this tool invocation */
    toolId: string;
    /** Input parameters passed to the tool */
    input: any;
    /** Current status of the tool execution */
    status: string;
    /** Optional ID of parent tool use for nested calls */
    parentToolUseId?: string;
  }): void {
    this.dispatch(toolUseAdded(data));
  }

  /**
   * Add a tool execution result to the current session.
   * Maintains compatibility with the webview toolResultAdded action.
   *
   * @param data - Tool result data
   * @param data.toolId - ID of the tool invocation this result belongs to
   * @param data.result - The result output from the tool
   * @param data.isError - Optional flag indicating if the result is an error
   * @param data.status - Current status of the tool execution
   * @param data.parentToolUseId - Optional ID of parent tool use for nested calls
   */
  public addToolResult(data: {
    /** ID of the tool invocation this result belongs to */
    toolId: string;
    /** The result output from the tool */
    result: string;
    /** Optional flag indicating if the result is an error */
    isError?: boolean;
    /** Current status of the tool execution */
    status: string;
    /** Optional ID of parent tool use for nested calls */
    parentToolUseId?: string;
  }): void {
    this.dispatch(toolResultAdded(data));
  }

  /**
   * Update token usage statistics for the current session.
   * Maintains compatibility with the webview tokenUsageUpdated action.
   *
   * @param data - Token usage data
   * @param data.inputTokens - Number of input tokens consumed
   * @param data.outputTokens - Number of output tokens generated
   * @param data.thinkingTokens - Optional number of tokens used for thinking
   * @param data.cacheTokens - Optional number of cached tokens used
   */
  public updateTokens(data: {
    /** Number of input tokens consumed */
    inputTokens: number;
    /** Number of output tokens generated */
    outputTokens: number;
    /** Optional number of tokens used for thinking */
    thinkingTokens?: number;
    /** Optional number of cached tokens used */
    cacheTokens?: number;
  }): void {
    this.dispatch(tokenUsageUpdated(data));
  }

  /**
   * Set whether Claude is currently processing a request.
   * Maintains compatibility with the webview claude/setProcessing action.
   *
   * @param processing - true if processing, false otherwise
   */
  public setProcessingState(processing: boolean): void {
    this.dispatch(setProcessing(processing));
  }

  /**
   * Display an error message to the user.
   * Uses generic dispatch since the showError action isn't directly exported.
   *
   * @param message - Error message to display
   */
  public showErrorMessage(message: string): void {
    // Use generic dispatch since showError isn't exported
    this.dispatch({ type: 'ui/showError', payload: { message } });
  }

  /**
   * Mark the current assistant message as completed.
   * Maintains compatibility with the webview messageCompleted action.
   */
  public completeMessage(): void {
    this.dispatch(messageCompleted());
  }

  /**
   * Update the list of connected MCP (Model Context Protocol) servers.
   * Maintains compatibility with the webview mcp/updateConnectedServers action.
   *
   * @param servers - Array of MCP server configuration objects
   */
  public updateMcpServers(servers: any[]): void {
    this.dispatch(updateConnectedServers(servers));
  }
}
