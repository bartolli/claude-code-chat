import { FeatureFlagManager } from './FeatureFlags';
import * as vscode from 'vscode';
import { 
    messageAdded, 
    messageUpdated, 
    messageCompleted,
    thinkingUpdated,
    toolUseAdded,
    toolResultAdded,
    tokenUsageUpdated,
    setCurrentSession,
    clearSession,
    updateTokenUsage
} from '../state/slices/sessionSlice';
import {
    setWebviewReady,
    setClaudeRunning,
    showPermissionRequest
} from '../state/slices/uiSlice';
import {
    setProcessing
} from '../state/slices/claudeSlice';
import { AnyAction, ActionCreator } from '@reduxjs/toolkit';

/**
 * Webview action structure
 */
export interface WebviewAction {
    type: string;
    payload?: unknown;
}

/**
 * Custom handler function type
 */
export type CustomHandler = (action: WebviewAction) => AnyAction | null;

/**
 * Action mapping configuration
 */
export interface ActionMappingConfig {
    webviewAction: string;
    reduxActionCreator?: ActionCreator<AnyAction>;
    customHandler?: CustomHandler;
    payloadTransform?: (payload: unknown) => unknown;
}

/**
 * Validation result for action processing
 */
export interface ActionValidationResult {
    isValid: boolean;
    error?: string;
    transformedPayload?: unknown;
}

/**
 * Action processing result
 */
export interface ActionProcessingResult {
    success: boolean;
    mappedAction?: AnyAction;
    error?: string;
    unmapped?: boolean;
}

/**
 * ActionMapper handles translation between webview actions and Redux actions
 */
export class ActionMapper {
    private mappings: Map<string, ActionMappingConfig> = new Map();
    private unmappedActions: Set<string> = new Set();
    private outputChannel: vscode.OutputChannel;
    private featureFlags: FeatureFlagManager;
    private actionLog: Array<{ timestamp: Date; action: WebviewAction; result: ActionProcessingResult }> = [];
    
    constructor(context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Claude Code - Action Mapper');
        this.featureFlags = FeatureFlagManager.getInstance(context);
        this.initializeMappings();
    }
    
    /**
     * Initialize action mappings
     */
    private initializeMappings(): void {
        // Direct Redux action mappings
        this.addMapping('session/messageAdded', { reduxActionCreator: messageAdded });
        this.addMapping('session/messageUpdated', { reduxActionCreator: messageUpdated });
        this.addMapping('session/messageCompleted', { 
            reduxActionCreator: messageCompleted,
            payloadTransform: () => undefined // messageCompleted takes no payload
        });
        this.addMapping('session/thinkingUpdated', { reduxActionCreator: thinkingUpdated });
        this.addMapping('session/toolUseAdded', { reduxActionCreator: toolUseAdded });
        this.addMapping('session/toolResultAdded', { reduxActionCreator: toolResultAdded });
        this.addMapping('session/tokenUsageUpdated', { reduxActionCreator: tokenUsageUpdated });
        this.addMapping('ui/showPermissionRequest', { reduxActionCreator: showPermissionRequest });
        this.addMapping('claude/setProcessing', { reduxActionCreator: setProcessing });
        
        // Mappings with different names
        this.addMapping('session/tokensUpdated', { 
            reduxActionCreator: updateTokenUsage,
            payloadTransform: (payload) => {
                // Transform legacy token format to new format
                const tokenPayload = payload as { input?: number; output?: number };
                return {
                    inputTokens: tokenPayload.input || 0,
                    outputTokens: tokenPayload.output || 0
                };
            }
        });
        
        this.addMapping('session/resumed', { 
            reduxActionCreator: setCurrentSession,
            payloadTransform: (payload) => {
                const resumePayload = payload as { sessionId?: string };
                return resumePayload.sessionId || null;
            }
        });
        
        this.addMapping('session/cleared', { 
            reduxActionCreator: clearSession,
            payloadTransform: (payload) => {
                // If payload has sessionId, use it; otherwise use current session
                const clearedPayload = payload as { sessionId?: string };
                return clearedPayload.sessionId || '';
            }
        });
        
        this.addMapping('ui/setReady', { 
            reduxActionCreator: setWebviewReady,
            payloadTransform: (payload) => {
                const readyPayload = payload as { ready?: boolean };
                return readyPayload.ready ?? true;
            }
        });
        
        // Custom handlers for non-Redux actions
        this.addMapping('session/messageAppended', {
            customHandler: this.handleMessageAppended.bind(this)
        });
        
        this.addMapping('session/modelSelected', {
            customHandler: this.handleModelSelected.bind(this)
        });
        
        this.addMapping('ui/showError', {
            customHandler: this.handleShowError.bind(this)
        });
        
        this.addMapping('ui/showNotification', {
            customHandler: this.handleShowNotification.bind(this)
        });
        
        this.addMapping('stream/messageReceived', {
            customHandler: this.handleStreamMessage.bind(this)
        });
    }
    
    /**
     * Add a mapping configuration
     */
    private addMapping(actionType: string, config: Omit<ActionMappingConfig, 'webviewAction'>): void {
        this.mappings.set(actionType, {
            webviewAction: actionType,
            ...config
        });
    }
    
    /**
     * Map a webview action to Redux action
     */
    mapAction(action: WebviewAction): ActionProcessingResult {
        if (!this.featureFlags.isEnabled('enableActionMapping')) {
            return { success: false, error: 'Action mapping disabled' };
        }
        
        const mapping = this.mappings.get(action.type);
        
        if (!mapping) {
            this.handleUnmappedAction(action);
            return { success: false, unmapped: true };
        }
        
        try {
            let mappedAction: AnyAction | null = null;
            
            if (mapping.reduxActionCreator) {
                // Transform payload if needed
                const payload = mapping.payloadTransform 
                    ? mapping.payloadTransform(action.payload)
                    : action.payload;
                
                // Create Redux action
                mappedAction = mapping.reduxActionCreator(payload) as AnyAction;
            } else if (mapping.customHandler) {
                // Use custom handler
                mappedAction = mapping.customHandler(action);
            }
            
            if (mappedAction) {
                this.logAction(action, { success: true, mappedAction });
                return { success: true, mappedAction };
            }
            
            return { success: false, error: 'No handler produced action' };
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logAction(action, { success: false, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }
    
    /**
     * Handle unmapped action
     */
    private handleUnmappedAction(action: WebviewAction): void {
        if (!this.unmappedActions.has(action.type)) {
            this.unmappedActions.add(action.type);
            
            if (this.featureFlags.isEnabled('logUnmappedActions')) {
                this.outputChannel.appendLine(
                    `[UNMAPPED] First occurrence of unmapped action: ${action.type}`
                );
            }
        }
    }
    
    /**
     * Custom handler for message append
     */
    private handleMessageAppended(_action: WebviewAction): AnyAction | null {
        // This would need to be handled differently as it's appending to existing message
        // For now, return null to indicate it needs special handling
        return null;
    }
    
    /**
     * Custom handler for model selection
     */
    private handleModelSelected(_action: WebviewAction): AnyAction | null {
        // Model selection affects config, not session state
        // This would dispatch to config slice
        return null;
    }
    
    /**
     * Custom handler for error display
     */
    private handleShowError(_action: WebviewAction): AnyAction | null {
        // Errors might need special UI handling
        return null;
    }
    
    /**
     * Custom handler for notifications
     */
    private handleShowNotification(_action: WebviewAction): AnyAction | null {
        // Notifications might bypass Redux entirely
        return null;
    }
    
    /**
     * Custom handler for stream messages
     */
    private handleStreamMessage(_action: WebviewAction): AnyAction | null {
        // Stream messages need complex processing
        return null;
    }
    
    /**
     * Log action for debugging
     */
    private logAction(action: WebviewAction, result: ActionProcessingResult): void {
        const logEntry = {
            timestamp: new Date(),
            action,
            result
        };
        
        this.actionLog.push(logEntry);
        
        // Keep log size manageable
        if (this.actionLog.length > 1000) {
            this.actionLog = this.actionLog.slice(-500);
        }
        
        if (this.featureFlags.isEnabled('logStateTransitions')) {
            this.outputChannel.appendLine(
                `[${logEntry.timestamp.toISOString()}] ${action.type} → ` +
                `${result.success ? 'SUCCESS' : 'FAILED'} ` +
                `${result.error || ''}`
            );
        }
    }
    
    /**
     * Validate action payload
     */
    validateAction(action: WebviewAction): ActionValidationResult {
        if (!action.type) {
            return { isValid: false, error: 'Action type is required' };
        }
        
        const mapping = this.mappings.get(action.type);
        if (!mapping) {
            return { isValid: true }; // Unknown actions are valid, just unmapped
        }
        
        // Add specific validation logic per action type if needed
        try {
            const transformedPayload = mapping.payloadTransform 
                ? mapping.payloadTransform(action.payload)
                : action.payload;
                
            return { isValid: true, transformedPayload };
        } catch (error) {
            return { 
                isValid: false, 
                error: error instanceof Error ? error.message : 'Validation failed'
            };
        }
    }
    
    /**
     * Get action mapping statistics
     */
    getStatistics(): ActionMapperStats {
        const totalActions = this.actionLog.length;
        const successfulActions = this.actionLog.filter(log => log.result.success).length;
        const failedActions = totalActions - successfulActions;
        const unmappedActionTypes = Array.from(this.unmappedActions);
        
        return {
            totalActions,
            successfulActions,
            failedActions,
            unmappedActionTypes,
            successRate: totalActions > 0 ? (successfulActions / totalActions) * 100 : 0,
            recentActions: this.actionLog.slice(-10).map(log => ({
                type: log.action.type,
                success: log.result.success,
                timestamp: log.timestamp
            }))
        };
    }
    
    /**
     * Export action log for analysis
     */
    exportActionLog(): string {
        const stats = this.getStatistics();
        const report = {
            generated: new Date().toISOString(),
            statistics: stats,
            unmappedActions: Array.from(this.unmappedActions),
            sampleFailures: this.actionLog
                .filter(log => !log.result.success)
                .slice(-20)
                .map(log => ({
                    action: log.action.type,
                    error: log.result.error,
                    timestamp: log.timestamp
                }))
        };
        
        return JSON.stringify(report, null, 2);
    }
    
    /**
     * Clear action log
     */
    clearLog(): void {
        this.actionLog = [];
        this.unmappedActions.clear();
    }
}

/**
 * Statistics interface
 */
export interface ActionMapperStats {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    unmappedActionTypes: string[];
    successRate: number;
    recentActions: Array<{
        type: string;
        success: boolean;
        timestamp: Date;
    }>;
}

/**
 * Type guards for payload validation
 */
export const PayloadValidators = {
    isTokenPayload: (payload: unknown): payload is { input?: number; output?: number } => {
        if (typeof payload !== 'object' || payload === null) return false;
        const p = payload as Record<string, unknown>;
        return (p.input === undefined || typeof p.input === 'number') &&
               (p.output === undefined || typeof p.output === 'number');
    },
    
    isSessionPayload: (payload: unknown): payload is { sessionId?: string } => {
        if (typeof payload !== 'object' || payload === null) return false;
        const p = payload as Record<string, unknown>;
        return p.sessionId === undefined || typeof p.sessionId === 'string';
    },
    
    isReadyPayload: (payload: unknown): payload is { ready?: boolean } => {
        if (typeof payload !== 'object' || payload === null) return false;
        const p = payload as Record<string, unknown>;
        return p.ready === undefined || typeof p.ready === 'boolean';
    }
};