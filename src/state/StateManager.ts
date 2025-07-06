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
  loadSessions
} from './slices/sessionSlice';
import { 
  setSelectedModel,
  setAutoSave,
  setGitBackup 
} from './slices/configSlice';
import { 
  setWebviewReady,
  setClaudeRunning,
  setShowThinking,
  setShowCost,
  showPermissionRequest,
  clearPermissionRequest,
  resetUI
} from './slices/uiSlice';
import {
  addProcess,
  removeProcess
} from './slices/processesSlice';
import {
  setProcessing
} from './slices/claudeSlice';
import {
  updateConnectedServers,
  setMcpServers,
  updateServerStatus
} from './slices/mcpSlice';
import { ClaudeMessage, ClaudeResultMessage } from '../types/claude';

export class StateManager {
  private static instance: StateManager;
  private static readonly logger = getLogger();
  private readonly store = store;
  private context: vscode.ExtensionContext | undefined;

  private constructor() {
    StateManager.logger.info('StateManager', 'Initializing state manager');
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initialize with VS Code context for persistence
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.loadPersistedState();
  }

  /**
   * Get the Redux store instance
   */
  public getStore() {
    return this.store;
  }

  /**
   * Get current state
   */
  public getState(): RootState {
    return this.store.getState();
  }

  /**
   * Dispatch an action
   */
  public dispatch(action: any): void {
    this.store.dispatch(action);
  }

  // Session Management (compatible with existing extension)
  
  /**
   * Create or resume a session (matches existing _currentSessionId pattern)
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
   * Get current session ID (matches existing _currentSessionId)
   */
  public getCurrentSessionId(): string | undefined {
    return this.getState().session.currentSessionId;
  }

  /**
   * Update session from Claude result message
   */
  public updateSessionFromResult(result: ClaudeResultMessage): void {
    if (result.session_id && result.subtype === 'success') {
      this.createOrResumeSession(result.session_id);
      
      if (result.usage && result.usage.input_tokens && result.usage.output_tokens) {
        this.dispatch(updateTokenUsage({
          sessionId: result.session_id,
          inputTokens: result.usage.input_tokens,
          outputTokens: result.usage.output_tokens,
          cost: result.total_cost_usd || 0
        }));
      }
    }
  }

  /**
   * Set current session (for testing and direct control)
   */
  public setCurrentSession(sessionId: string | undefined): void {
    this.dispatch(setCurrentSession(sessionId));
  }

  // Model Management (compatible with existing _selectedModel)
  
  /**
   * Get selected model (matches existing _selectedModel)
   */
  public getSelectedModel(): string {
    return this.getState().config.selectedModel;
  }

  /**
   * Set selected model with validation (matches existing _setSelectedModel)
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
   * Set Claude running state (matches existing _currentClaudeProcess tracking)
   */
  public setClaudeRunning(running: boolean): void {
    this.dispatch(setClaudeRunning(running));
  }

  /**
   * Set webview ready state
   */
  public setWebviewReady(ready: boolean): void {
    this.dispatch(setWebviewReady(ready));
  }

  // Process Management
  
  /**
   * Track Claude process
   */
  public trackProcess(sessionId: string, pid: number): void {
    this.dispatch(addProcess({
      id: sessionId,
      pid,
      sessionId
    }));
  }

  /**
   * Remove process tracking
   */
  public untrackProcess(sessionId: string): void {
    this.dispatch(removeProcess(sessionId));
  }

  // Persistence (matches existing workspaceState patterns)
  
  private loadPersistedState(): void {
    if (!this.context) {
      return;
    }
    
    // Load saved model preference (matches existing pattern)
    const savedModel = this.context.workspaceState.get<string>('claude.selectedModel', 'default');
    this.setSelectedModel(savedModel);
    
    // Load conversation index (matches existing pattern)
    const conversationIndex = this.context.workspaceState.get<any[]>('claude.conversationIndex', []);
    // TODO: Convert conversation index to sessions
    
    StateManager.logger.info('StateManager', 'Loaded persisted state');
  }

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
   * Subscribe to state changes
   */
  public subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  /**
   * Get total cost across all sessions (matches existing _totalCost)
   */
  public getTotalCost(): number {
    const state = this.getState();
    return Object.values(state.session.sessions)
      .reduce((total, session) => total + session.totalCost, 0);
  }

  /**
   * Get total token counts (matches existing _totalTokensInput/_totalTokensOutput)
   */
  public getTotalTokens(): { input: number; output: number } {
    const state = this.getState();
    const totals = Object.values(state.session.sessions)
      .reduce((acc, session) => ({
        input: acc.input + session.totalInputTokens,
        output: acc.output + session.totalOutputTokens
      }), { input: 0, output: 0 });
    
    return totals;
  }

  // Additional methods for current webview compatibility

  /**
   * Handle message addition (matches webview messageAdded action)
   */
  public addMessageToSession(message: { role: 'user' | 'assistant'; content: string; messageId?: string; isThinkingActive?: boolean }): void {
    this.dispatch(messageAdded(message));
  }

  /**
   * Update message (matches webview messageUpdated action)
   */
  public updateMessage(message: { role: 'assistant'; content?: string; isThinkingActive?: boolean; messageId?: string }): void {
    this.dispatch(messageUpdated(message));
  }

  /**
   * Update thinking state (matches webview thinkingUpdated action)
   */
  public updateThinking(data: { content: string; currentLine?: string; isActive: boolean; duration?: number; messageId?: string; isIncremental?: boolean }): void {
    this.dispatch(thinkingUpdated(data));
  }

  /**
   * Add tool use (matches webview toolUseAdded action)
   */
  public addToolUse(data: { toolName: string; toolId: string; input: any; status: string; parentToolUseId?: string }): void {
    this.dispatch(toolUseAdded(data));
  }

  /**
   * Add tool result (matches webview toolResultAdded action)
   */
  public addToolResult(data: { toolId: string; result: string; isError?: boolean; status: string; parentToolUseId?: string }): void {
    this.dispatch(toolResultAdded(data));
  }

  /**
   * Update token usage (matches webview tokenUsageUpdated action)
   */
  public updateTokens(data: { inputTokens: number; outputTokens: number; thinkingTokens?: number; cacheTokens?: number }): void {
    this.dispatch(tokenUsageUpdated(data));
  }

  /**
   * Set processing state (matches webview claude/setProcessing action)
   */
  public setProcessingState(processing: boolean): void {
    this.dispatch(setProcessing(processing));
  }

  /**
   * Show error (handled through generic dispatch)
   */
  public showErrorMessage(message: string): void {
    // Use generic dispatch since showError isn't exported
    this.dispatch({ type: 'ui/showError', payload: { message } });
  }

  /**
   * Complete message (matches webview messageCompleted action)
   */
  public completeMessage(): void {
    this.dispatch(messageCompleted());
  }

  /**
   * Update MCP servers (matches webview mcp/updateConnectedServers action)
   */
  public updateMcpServers(servers: any[]): void {
    this.dispatch(updateConnectedServers(servers));
  }
}