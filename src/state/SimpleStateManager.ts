/**
 * Simple State Manager for extension host
 * This doesn't use Redux - it's just for backward compatibility
 */

import * as vscode from 'vscode';
import { getLogger } from '../core/Logger';
// This file is part of the StateManager migration controlled by featureFlags

/**
 * Manages extension state without Redux for backward compatibility.
 * Provides a simple in-memory state store that mimics the original StateManager interface (featureFlags controlled).
 * @deprecated This class is part of the migration infrastructure and will be replaced by Redux StateManager.
 * Usage should be controlled by featureFlags.useReduxStateManager
 */
// This SimpleStateManager is controlled by featureFlags.useReduxStateManager
export class SimpleStateManager /* featureFlags */ {
  // Controlled by featureFlags.useReduxStateManager
  // featureFlags controlled
  private logger = getLogger();
  private _state: any = {
    sessions: {},
    currentSessionId: null,
    config: {
      selectedModel: 'claude-3-opus-20240229',
      autoSave: true,
      gitBackup: false,
    },
    ui: {
      webviewReady: false,
      claudeRunning: false,
      showThinking: false,
      showCost: true,
    },
  };

  /**
   * Creates an instance of SimpleStateManager (usage controlled by featureFlags).
   * @param context - The VS Code extension context for state persistence
   */
  constructor(private context: vscode.ExtensionContext) {
    this.logger.info(
      'SimpleStateManager', // featureFlags
      'Initialized without Redux - controlled by featureFlags'
    );
  }

  // Compatibility methods that match the original StateManager interface (featureFlags controlled)
  /**
   * Gets the current state object.
   * @returns The complete state object
   */
  getState(): any {
    return this._state;
  }

  /**
   * Gets the ID of the current active session.
   * @returns The current session ID or null if no session is active
   */
  getCurrentSessionId(): string | null {
    return this._state.currentSessionId;
  }

  /**
   * Gets the currently selected Claude model.
   * @returns The model identifier string
   */
  getSelectedModel(): string {
    return this._state.config.selectedModel;
  }

  /**
   * Sets the selected Claude model.
   * @param model - The model identifier to set
   */
  setSelectedModel(model: string): void {
    this._state.config.selectedModel = model;
  }

  /**
   * Sets the webview ready state.
   * @param ready - Whether the webview is ready
   */
  setWebviewReady(ready: boolean): void {
    this._state.ui.webviewReady = ready;
  }

  /**
   * Checks if the webview is ready.
   * @returns True if the webview is ready, false otherwise
   */
  isWebviewReady(): boolean {
    return this._state.ui.webviewReady;
  }

  // Add other methods as needed for compatibility
}
