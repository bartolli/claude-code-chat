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
  updateTokenUsage,
} from '../state/slices/sessionSlice';
import { setWebviewReady, setClaudeRunning, showPermissionRequest } from '../state/slices/uiSlice';
import { setProcessing, setError as setClaudeError } from '../state/slices/claudeSlice';
import { setSelectedModel } from '../state/slices/configSlice';
import { AnyAction, ActionCreator } from '@reduxjs/toolkit';
import { withSyncMetadata, SyncAwareAction } from './syncMiddleware';
import { SyncMetadata } from './StateSynchronizer';

/**
 * @todo Phase 2: Complete stream message handling integration with ExtensionMessageHandler
 * - handleStreamMessage needs to coordinate with message update logic
 * - handleMessageAppended may need to handle incremental appends vs full updates
 */

/**
 * Webview action structure
 */
export interface WebviewAction {
  /** Action type identifier */
  type: string;
  /** Optional action payload data */
  payload?: unknown;
  /** Optional sync metadata for loop prevention */
  syncMetadata?: Partial<SyncMetadata>;
}

/**
 * Custom handler function type
 */
export type CustomHandler = (action: WebviewAction) => AnyAction | null;

/**
 * Action mapping configuration
 */
export interface ActionMappingConfig {
  /** Webview action type to map from */
  webviewAction: string;
  /** Redux action creator function */
  reduxActionCreator?: ActionCreator<AnyAction>;
  /** Custom handler function for complex actions */
  customHandler?: CustomHandler;
  /** Function to transform payload before mapping */
  payloadTransform?: (payload: unknown) => unknown;
}

/**
 * Validation result for action processing
 */
export interface ActionValidationResult {
  /** Whether the action is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Payload after transformation */
  transformedPayload?: unknown;
}

/**
 * Action processing result
 */
export interface ActionProcessingResult {
  /** Whether processing was successful */
  success: boolean;
  /** The resulting Redux action */
  mappedAction?: AnyAction;
  /** Error message if processing failed */
  error?: string;
  /** Whether action was unmapped */
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
  private actionLog: Array<{
    /** When the action was processed */
    timestamp: Date;
    /** The original webview action */
    action: WebviewAction;
    /** Result of processing the action */
    result: ActionProcessingResult;
  }> = [];

  /**
   * Initialize ActionMapper with VS Code extension context
   * @param context VS Code extension context for feature flags and output channel
   */
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
      payloadTransform: () => undefined, // messageCompleted takes no payload
    });
    this.addMapping('session/thinkingUpdated', { reduxActionCreator: thinkingUpdated });
    this.addMapping('session/toolUseAdded', { reduxActionCreator: toolUseAdded });
    this.addMapping('session/toolResultAdded', { reduxActionCreator: toolResultAdded });
    this.addMapping('session/tokenUsageUpdated', { reduxActionCreator: tokenUsageUpdated });
    this.addMapping('ui/showPermissionRequest', { reduxActionCreator: showPermissionRequest });
    this.addMapping('claude/setProcessing', {
      reduxActionCreator: setProcessing,
      payloadTransform: (payload) => {
        const processingPayload = payload as {
          /**
           *
           */
          processing?: boolean;
        };
        return processingPayload.processing ?? false;
      },
    });
    
    // Map status/processing to the same action
    this.addMapping('status/processing', {
      reduxActionCreator: setProcessing,
      payloadTransform: (payload) => {
        // If payload is a boolean, use it directly
        return typeof payload === 'boolean' ? payload : false;
      },
    });

    // Mappings with different names
    this.addMapping('session/tokensUpdated', {
      reduxActionCreator: updateTokenUsage,
      payloadTransform: (payload) => {
        // Transform legacy token format to new format
        const tokenPayload = payload as {
          /** Input token count */
          input?: number;
          /** Output token count */
          output?: number;
        };
        return {
          inputTokens: tokenPayload.input || 0,
          outputTokens: tokenPayload.output || 0,
        };
      },
    });
    
    // Map message/tokenUsage to the same Redux action
    this.addMapping('message/tokenUsage', {
      reduxActionCreator: updateTokenUsage,
      payloadTransform: (payload) => {
        // Already in correct format
        return payload;
      },
    });

    this.addMapping('session/resumed', {
      reduxActionCreator: setCurrentSession,
      payloadTransform: (payload) => {
        const resumePayload = payload as {
          /** Session identifier */
          sessionId?: string;
        };
        return resumePayload.sessionId || null;
      },
    });

    this.addMapping('session/cleared', {
      reduxActionCreator: clearSession,
      payloadTransform: (payload) => {
        // If payload has sessionId, use it; otherwise use current session
        const clearedPayload = payload as {
          /** Session identifier to clear */
          sessionId?: string;
        };
        return clearedPayload.sessionId || '';
      },
    });

    this.addMapping('ui/setReady', {
      reduxActionCreator: setWebviewReady,
      payloadTransform: (payload) => {
        const readyPayload = payload as {
          /** Whether webview is ready */
          ready?: boolean;
        };
        return readyPayload.ready ?? true;
      },
    });

    // Custom handlers for non-Redux actions
    this.addMapping('session/messageAppended', {
      customHandler: this.handleMessageAppended.bind(this),
    });

    this.addMapping('session/modelSelected', {
      customHandler: this.handleModelSelected.bind(this),
    });

    this.addMapping('ui/showError', {
      customHandler: this.handleShowError.bind(this),
    });
    
    // Map error/show to the same handler as ui/showError
    this.addMapping('error/show', {
      customHandler: this.handleShowError.bind(this),
    });

    this.addMapping('ui/showNotification', {
      customHandler: this.handleShowNotification.bind(this),
    });

    this.addMapping('stream/messageReceived', {
      customHandler: this.handleStreamMessage.bind(this),
    });
    
    // Map chat/messageComplete to messageCompleted action
    this.addMapping('chat/messageComplete', {
      customHandler: this.handleMessageComplete.bind(this),
    });
    
    // Map message/update for streaming content updates
    this.addMapping('message/update', {
      customHandler: this.handleMessageUpdate.bind(this),
    });
    
    // Map message/thinking for thinking block updates
    this.addMapping('message/thinking', {
      customHandler: this.handleThinkingUpdate.bind(this),
    });
    
    // Map message/toolUse for tool usage tracking
    this.addMapping('message/toolUse', {
      customHandler: this.handleToolUse.bind(this),
    });
    
    // Map message/toolResult for tool result tracking
    this.addMapping('message/toolResult', {
      customHandler: this.handleToolResult.bind(this),
    });
    
    // Map terminal/opened for terminal notifications
    this.addMapping('terminal/opened', {
      customHandler: this.handleTerminalOpened.bind(this),
    });
  }

  /**
   * Add a mapping configuration
   * @param actionType The webview action type to map
   * @param config Configuration for the mapping
   */
  private addMapping(actionType: string, config: Omit<ActionMappingConfig, 'webviewAction'>): void {
    this.mappings.set(actionType, {
      webviewAction: actionType,
      ...config,
    });
  }

  /**
   * Map a webview action to Redux action
   * @param action The webview action to map
   * @param syncMetadata Optional sync metadata to attach to the Redux action
   * @returns Result of action processing
   */
  mapAction(action: WebviewAction, syncMetadata?: Partial<SyncMetadata>): ActionProcessingResult {
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
        // Add sync metadata if provided
        const finalAction = syncMetadata 
          ? withSyncMetadata(mappedAction, syncMetadata)
          : mappedAction;
          
        this.logAction(action, { success: true, mappedAction: finalAction });
        return { success: true, mappedAction: finalAction };
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
   * @param action The unmapped webview action
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
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleMessageAppended(action: WebviewAction): AnyAction | null {
    // Message appending is handled by messageUpdated with append logic
    // Transform to a messageUpdated action
    const payload = action.payload as {
      /** Message identifier to update */
      messageId?: string;
      /** New content to set */
      content?: string;
    };
    
    if (payload.messageId && payload.content) {
      return messageUpdated({
        role: 'assistant',
        content: payload.content,
        messageId: payload.messageId,
      });
    }
    
    return null;
  }

  /**
   * Custom handler for model selection
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleModelSelected(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Selected model identifier */
      model?: string;
    };
    
    if (payload.model) {
      return setSelectedModel(payload.model as any);
    }
    
    return null;
  }

  /**
   * Custom handler for error display
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleShowError(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Error string to display */
      error?: string;
      /** Alternative message field */
      message?: string;
    };
    
    const errorMessage = payload.error || payload.message;
    if (errorMessage) {
      return setClaudeError(errorMessage);
    }
    
    return null;
  }

  /**
   * Custom handler for notifications
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleShowNotification(action: WebviewAction): AnyAction | null {
    // Notifications typically bypass Redux and go directly to VS Code API
    // We'll log this but not map it to Redux
    const payload = action.payload as {
      /** Notification message */
      message?: string;
      /** Notification type */
      type?: 'info' | 'warning' | 'error';
    };
    
    if (this.featureFlags.isEnabled('logStateTransitions')) {
      this.outputChannel.appendLine(
        `[NOTIFICATION] ${payload.type || 'info'}: ${payload.message || 'No message'}`
      );
    }
    
    // Return null as notifications are handled outside Redux
    return null;
  }

  /**
   * Custom handler for stream messages
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleStreamMessage(action: WebviewAction): AnyAction | null {
    // Stream messages need complex processing that involves multiple Redux actions
    // This would typically update the current message content incrementally
    const payload = action.payload as {
      /** Stream chunk data */
      chunk?: any;
      /** Session identifier */
      sessionId?: string;
      /** Message identifier */
      messageId?: string;
    };
    
    if (this.featureFlags.isEnabled('logStateTransitions')) {
      this.outputChannel.appendLine(
        `[STREAM] Received stream chunk for message ${payload.messageId || 'unknown'}`
      );
    }
    
    // Stream handling is complex and needs coordination with ExtensionMessageHandler
    // For now, return null to indicate it needs special handling in Phase 2
    return null;
  }
  
  /**
   * Custom handler for message complete with metadata
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleMessageComplete(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Session identifier */
      sessionId?: string;
      /** Total cost in USD */
      totalCost?: number;
      /** Duration in milliseconds */
      duration?: number;
    };
    
    // Always dispatch messageCompleted to mark loading as false
    // Note: We can't dispatch multiple actions from here, so we'll
    // just return messageCompleted. The metadata should be handled
    // separately via updateTokenUsage when token counts are available
    return messageCompleted();
  }
  
  /**
   * Custom handler for message updates during streaming
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleMessageUpdate(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Message role */
      role?: string;
      /** Message identifier */
      messageId?: string;
      /** Updated content (optional) */
      content?: string;
    };
    
    // Only handle if we have required fields
    if (payload.messageId) {
      return messageUpdated({
        role: 'assistant' as const,  // message/update is always for assistant messages
        content: payload.content || '',
        messageId: payload.messageId,
      });
    }
    
    return null;
  }
  
  /**
   * Custom handler for thinking block updates
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleThinkingUpdate(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Thinking content */
      content?: string;
      /** Whether thinking is currently active */
      isActive?: boolean;
      /** Message identifier */
      messageId?: string;
      /** Current line number */
      currentLine?: number;
      /** Duration if completed */
      duration?: number;
      /** Whether this is incremental */
      isIncremental?: boolean;
    };
    
    // Only handle if we have thinking content
    if (payload.content !== undefined) {
      return thinkingUpdated({
        content: payload.content,
        isActive: payload.isActive ?? true,
        messageId: payload.messageId,
        currentLine: payload.currentLine?.toString(),  // Convert number to string if needed
        duration: payload.duration,
        isIncremental: payload.isIncremental,
      });
    }
    
    return null;
  }
  
  /**
   * Custom handler for tool use tracking
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleToolUse(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Tool name */
      toolName?: string;
      /** Tool identifier */
      toolId?: string;
      /** Tool input parameters */
      input?: any;
      /** Tool status */
      status?: string;
      /** Parent tool use ID for nested tools */
      parentToolUseId?: string;
    };
    
    // Only handle if we have required fields
    if (payload.toolName && payload.toolId) {
      return toolUseAdded({
        toolName: payload.toolName,
        toolId: payload.toolId,
        input: payload.input,
        status: payload.status || 'calling',  // Default to 'calling' if not provided
        parentToolUseId: payload.parentToolUseId,
      });
    }
    
    return null;
  }
  
  /**
   * Custom handler for tool result tracking
   * @param action The webview action
   * @returns Redux action or null if not handled
   */
  private handleToolResult(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Tool identifier */
      toolId?: string;
      /** Tool result data */
      result?: any;
      /** Whether the result indicates an error */
      isError?: boolean;
      /** Tool status */
      status?: string;
      /** Parent tool use ID for nested tools */
      parentToolUseId?: string;
    };
    
    // Only handle if we have required fields
    if (payload.toolId && payload.result !== undefined) {
      return toolResultAdded({
        toolId: payload.toolId,
        result: payload.result,
        isError: payload.isError ?? false,
        status: payload.status || 'complete',  // Default to 'complete' if not provided
        parentToolUseId: payload.parentToolUseId,
      });
    }
    
    return null;
  }

  /**
   * Handle terminal/opened actions for terminal notifications
   * @param action The webview action containing terminal message
   * @returns A Redux action or null
   */
  private handleTerminalOpened(action: WebviewAction): AnyAction | null {
    const payload = action.payload as {
      /** Terminal notification message */
      message?: string;
    };
    
    if (payload.message) {
      this.outputChannel.appendLine(`[Terminal] Opened with message: ${payload.message}`);
      // For now, just log terminal notifications
      // In the future, this could dispatch to a Redux slice for terminal state
    }
    
    return null;
  }

  /**
   * Log action for debugging
   * @param action The webview action that was processed
   * @param result The result of processing the action
   */
  private logAction(action: WebviewAction, result: ActionProcessingResult): void {
    const logEntry = {
      timestamp: new Date(),
      action,
      result,
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
   * @param action The webview action to validate
   * @returns Validation result with transformed payload if valid
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
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Get action mapping statistics
   * @returns Statistics about action processing
   */
  getStatistics(): ActionMapperStats {
    const totalActions = this.actionLog.length;
    const successfulActions = this.actionLog.filter((log) => log.result.success).length;
    const failedActions = totalActions - successfulActions;
    const unmappedActionTypes = Array.from(this.unmappedActions);

    return {
      totalActions,
      successfulActions,
      failedActions,
      unmappedActionTypes,
      successRate: totalActions > 0 ? (successfulActions / totalActions) * 100 : 0,
      recentActions: this.actionLog.slice(-10).map((log) => ({
        type: log.action.type,
        success: log.result.success,
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Export action log for analysis
   * @returns JSON string with action log data
   */
  exportActionLog(): string {
    const stats = this.getStatistics();
    const report = {
      generated: new Date().toISOString(),
      statistics: stats,
      unmappedActions: Array.from(this.unmappedActions),
      sampleFailures: this.actionLog
        .filter((log) => !log.result.success)
        .slice(-20)
        .map((log) => ({
          action: log.action.type,
          error: log.result.error,
          timestamp: log.timestamp,
        })),
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
  /**
   *
   */
  totalActions: number;
  /**
   *
   */
  successfulActions: number;
  /**
   *
   */
  failedActions: number;
  /**
   *
   */
  unmappedActionTypes: string[];
  /**
   *
   */
  successRate: number;
  /**
   *
   */
  recentActions: Array<{
    /** Action type */
    type: string;
    /** Whether action was successful */
    success: boolean;
    /** When action was processed */
    timestamp: Date;
  }>;
}

/**
 * Type guards for payload validation
 */
export const PayloadValidators = {
  isTokenPayload: (
    payload: unknown
  ): payload is {
    /** Input token count */
    input?: number;
    /** Output token count */
    output?: number;
  } => {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const p = payload as Record<string, unknown>;
    return (
      (p.input === undefined || typeof p.input === 'number') &&
      (p.output === undefined || typeof p.output === 'number')
    );
  },

  isSessionPayload: (
    payload: unknown
  ): payload is {
    /** Session identifier */
    sessionId?: string;
  } => {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const p = payload as Record<string, unknown>;
    return p.sessionId === undefined || typeof p.sessionId === 'string';
  },

  isReadyPayload: (
    payload: unknown
  ): payload is {
    /** Whether component is ready */
    ready?: boolean;
  } => {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const p = payload as Record<string, unknown>;
    return p.ready === undefined || typeof p.ready === 'boolean';
  },
};
