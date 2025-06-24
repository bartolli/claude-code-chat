/**
 * State shape definitions for the application
 */

import { ModelType, ClaudeMessage, SessionInfo } from './claude';

export interface SessionState {
  currentSessionId: string | undefined;
  sessions: Record<string, SessionInfo>;
  activeSession: SessionInfo | undefined;
  isLoading: boolean;
  error: string | undefined;
}

export interface ConfigState {
  selectedModel: ModelType;
  autoSave: boolean;
  gitBackup: boolean;
  theme: string | undefined;
  fontSize: number | undefined;
  availableModels?: any[];
  features?: {
    planMode: boolean;
    thinkingMode: boolean;
    costTracking: boolean;
  };
}

export interface UIState {
  isWebviewReady: boolean;
  isClaudeRunning: boolean;
  showThinking: boolean;
  showCost: boolean;
  expandedTools: Record<string, boolean>;
}

export interface ProcessState {
  activeProcesses: Record<string, {
    id: string;
    pid: number;
    sessionId: string;
    startedAt: number;
  }>;
}

export interface AppState {
  session: SessionState;
  config: ConfigState;
  ui: UIState;
  processes: ProcessState;
}

// Action types
export interface Action<T = unknown> {
  type: string;
  payload?: T;
  meta?: Record<string, unknown>;
  error?: boolean;
}