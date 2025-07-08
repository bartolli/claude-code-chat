/**
 * State shape definitions for the application
 */

import { ModelType, ClaudeMessage, SessionInfo } from './claude';

export interface SessionState {
  /**
   * ID of the currently active session
   */
  currentSessionId: string | undefined;
  /**
   * Map of all sessions by ID
   */
  sessions: Record<string, SessionInfo>;
  /**
   * Full details of the active session
   */
  activeSession: SessionInfo | undefined;
  /**
   * Whether session data is being loaded
   */
  isLoading: boolean;
  /**
   * Error message if session operations fail
   */
  error: string | undefined;
}

export interface ConfigState {
  /**
   * Currently selected Claude model
   */
  selectedModel: ModelType;
  /**
   * Whether to auto-save conversations
   */
  autoSave: boolean;
  /**
   * Whether to backup conversations to git
   */
  gitBackup: boolean;
  /**
   * UI theme preference
   */
  theme: string | undefined;
  /**
   * Font size preference
   */
  fontSize: number | undefined;
  /**
   * List of available Claude models
   */
  availableModels?: any[];
  /**
   * Feature toggle flags
   */
  features?: {
    /**
     * Enable plan mode feature
     */
    planMode: boolean;
    /**
     * Enable thinking mode display
     */
    thinkingMode: boolean;
    /**
     * Enable cost tracking display
     */
    costTracking: boolean;
  };
}

export interface UIState {
  /**
   * Whether the webview has finished initializing
   */
  isWebviewReady: boolean;
  /**
   * Whether Claude process is currently running
   */
  isClaudeRunning: boolean;
  /**
   * Whether to show thinking process in UI
   */
  showThinking: boolean;
  /**
   * Whether to show cost information in UI
   */
  showCost: boolean;
  /**
   * Map of tool IDs to their expanded state
   */
  expandedTools: Record<string, boolean>;
  /**
   * Current permission request awaiting user response
   */
  permissionRequest: {
    /**
     * Name of the tool requesting permission
     */
    toolName: string;
    /**
     * Unique identifier for the tool use
     */
    toolId: string;
    /**
     * Input parameters for the tool
     */
    toolInput: any;
  } | null;
}

export interface ProcessState {
  /**
   * Map of active Claude processes by process ID
   */
  activeProcesses: Record<
    string,
    {
      /**
       * Unique process identifier
       */
      id: string;
      /**
       * Operating system process ID
       */
      pid: number;
      /**
       * Associated session ID
       */
      sessionId: string;
      /**
       * Unix timestamp when process started
       */
      startedAt: number;
    }
  >;
}

export interface AppState {
  /**
   * Session-related state
   */
  session: SessionState;
  /**
   * Configuration and settings state
   */
  config: ConfigState;
  /**
   * UI-related state
   */
  ui: UIState;
  /**
   * Process management state
   */
  processes: ProcessState;
}

// Action types
export interface Action<T = unknown> {
  /**
   * Action type identifier
   */
  type: string;
  /**
   * Action payload data
   */
  payload?: T;
  /**
   * Additional metadata for the action
   */
  meta?: Record<string, unknown>;
  /**
   * Whether this action represents an error
   */
  error?: boolean;
}
