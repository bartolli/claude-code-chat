/**
 * Simple State Manager for extension host
 * This doesn't use Redux - it's just for backward compatibility
 */

import * as vscode from 'vscode';
import { getLogger } from '../core/Logger';

export class SimpleStateManager {
    private logger = getLogger();
    private _state: any = {
        sessions: {},
        currentSessionId: null,
        config: {
            selectedModel: 'claude-3-opus-20240229',
            autoSave: true,
            gitBackup: false
        },
        ui: {
            webviewReady: false,
            claudeRunning: false,
            showThinking: false,
            showCost: true
        }
    };

    constructor(private context: vscode.ExtensionContext) {
        this.logger.info('SimpleStateManager', 'Initialized without Redux');
    }

    // Compatibility methods that match the original StateManager interface
    getState(): any {
        return this._state;
    }

    getCurrentSessionId(): string | null {
        return this._state.currentSessionId;
    }

    getSelectedModel(): string {
        return this._state.config.selectedModel;
    }

    setSelectedModel(model: string): void {
        this._state.config.selectedModel = model;
    }

    setWebviewReady(ready: boolean): void {
        this._state.ui.webviewReady = ready;
    }

    isWebviewReady(): boolean {
        return this._state.ui.webviewReady;
    }

    // Add other methods as needed for compatibility
}