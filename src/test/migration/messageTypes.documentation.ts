/**
 * Complete documentation of all webview ↔ backend message types
 * This serves as the source of truth for the migration
 */

export interface WebviewMessage {
  /**
   *
   */
  type: string;
  /**
   *
   */
  data: any;
}

/**
 * Messages sent FROM webview TO backend
 */
export const WEBVIEW_TO_BACKEND_MESSAGES = {
  // Chat operations
  'chat/sendMessage': {
    description: 'User sends a message',
    payload: { text: 'string', sessionId: 'string | undefined' },
  },
  'chat/stop': {
    description: 'User stops Claude response',
    payload: { sessionId: 'string' },
  },
  'chat/retry': {
    description: 'User retries last message',
    payload: { sessionId: 'string' },
  },

  // Session management
  'session/select': {
    description: 'User selects a session',
    payload: { sessionId: 'string' },
  },
  'session/create': {
    description: 'User creates new session',
    payload: { title: 'string | undefined' },
  },
  'session/delete': {
    description: 'User deletes a session',
    payload: { sessionId: 'string' },
  },
  'session/clear': {
    description: 'User clears current session',
    payload: {},
  },

  // UI interactions
  'ui/ready': {
    description: 'Webview signals ready state',
    payload: {},
  },
  'ui/toolExpanded': {
    description: 'User expands/collapses tool',
    payload: { toolId: 'string', expanded: 'boolean' },
  },
  'ui/thinkingToggled': {
    description: 'User toggles thinking visibility',
    payload: { visible: 'boolean' },
  },

  // Settings
  'settings/modelChanged': {
    description: 'User changes model selection',
    payload: { model: 'string' },
  },
  'settings/updated': {
    description: 'User updates settings',
    payload: { settings: 'object' },
  },

  // Permissions
  'permission/response': {
    description: 'User responds to permission request',
    payload: { granted: 'boolean', permissions: 'array' },
  },
};

/**
 * Messages sent FROM backend TO webview
 */
export const BACKEND_TO_WEBVIEW_MESSAGES = {
  // Session messages (Redux actions)
  'session/messageAdded': {
    description: 'New message added to session',
    reduxAction: 'messageAdded',
    payload: { sessionId: 'string', message: 'Message' },
  },
  'session/messageUpdated': {
    description: 'Message content updated',
    reduxAction: 'messageUpdated',
    payload: { sessionId: 'string', messageId: 'string', updates: 'Partial<Message>' },
  },
  'session/messageCompleted': {
    description: 'Message marked as complete',
    reduxAction: 'messageCompleted',
    payload: { sessionId: 'string', messageId: 'string' },
  },
  'session/thinkingUpdated': {
    description: 'Thinking block updated',
    reduxAction: 'thinkingUpdated',
    payload: { sessionId: 'string', messageId: 'string', thinking: 'ThinkingContent' },
  },
  'session/toolUseAdded': {
    description: 'Tool use added',
    reduxAction: 'toolUseAdded',
    payload: { sessionId: 'string', messageId: 'string', toolUse: 'ToolUse' },
  },
  'session/toolResultAdded': {
    description: 'Tool result added',
    reduxAction: 'toolResultAdded',
    payload: {
      sessionId: 'string',
      messageId: 'string',
      toolUseId: 'string',
      result: 'ToolResult',
    },
  },
  'session/tokenUsageUpdated': {
    description: 'Token usage updated',
    reduxAction: 'tokenUsageUpdated',
    payload: { sessionId: 'string', usage: 'TokenUsage' },
  },

  // Non-Redux session messages (need mapping)
  'session/messageAppended': {
    description: 'Content appended to current message',
    reduxAction: null,
    customHandler: 'appendToMessage',
    payload: { content: 'string' },
  },
  'session/tokensUpdated': {
    description: 'Legacy token update',
    reduxAction: 'updateTokenUsage',
    payload: { input: 'number', output: 'number' },
  },
  'session/resumed': {
    description: 'Session resumed',
    reduxAction: 'setCurrentSession',
    payload: { sessionId: 'string' },
  },
  'session/cleared': {
    description: 'Session cleared',
    reduxAction: 'clearSession',
    payload: {},
  },
  'session/modelSelected': {
    description: 'Model selected',
    reduxAction: null,
    customHandler: 'updateConfig',
    payload: { model: 'string' },
  },

  // UI messages (Redux actions)
  'ui/showPermissionRequest': {
    description: 'Show permission dialog',
    reduxAction: 'showPermissionRequest',
    payload: { request: 'PermissionRequest' },
  },
  'claude/setProcessing': {
    description: 'Set Claude processing state',
    reduxAction: 'setProcessing',
    payload: { processing: 'boolean' },
  },

  // Non-Redux UI messages (need custom handling)
  'ui/setReady': {
    description: 'Set webview ready state',
    reduxAction: 'setWebviewReady',
    payload: { ready: 'boolean' },
  },
  'ui/showError': {
    description: 'Show error message',
    reduxAction: null,
    customHandler: 'showError',
    payload: { message: 'string', details: 'string | undefined' },
  },
  'ui/showNotification': {
    description: 'Show notification',
    reduxAction: null,
    customHandler: 'showNotification',
    payload: { message: 'string', type: 'info' | 'warning' | 'error' },
  },
  'ui/showPlanProposal': {
    description: 'Show plan proposal',
    reduxAction: null,
    customHandler: 'showPlanProposal',
    payload: { plan: 'object' },
  },

  // Stream messages (need custom handling)
  'stream/messageReceived': {
    description: 'Handle Claude stream chunk',
    reduxAction: null,
    customHandler: 'processStreamChunk',
    payload: { chunk: 'StreamChunk' },
  },

  // Config messages (need custom handling)
  'config/initializeConfig': {
    description: 'Initialize configuration',
    reduxAction: null,
    customHandler: 'initializeConfig',
    payload: { config: 'Config' },
  },

  // MCP messages (need custom handling)
  'mcp/updateConnectedServers': {
    description: 'Update MCP server status',
    reduxAction: null,
    customHandler: 'updateMcpServers',
    payload: { servers: 'McpServer[]' },
  },
};

/**
 * Action mapping strategy for migration
 */
export interface ActionMapping {
  /**
   *
   */
  webviewAction: string;
  /**
   *
   */
  reduxAction?: string;
  /**
   *
   */
  customHandler?: string;
  /**
   *
   */
  payloadTransform?: (payload: any) => any;
}

/**
 * Complete action mappings for StateManager migration
 */
export const ACTION_MAPPINGS: ActionMapping[] = [
  // Direct Redux action mappings
  { webviewAction: 'session/messageAdded', reduxAction: 'messageAdded' },
  { webviewAction: 'session/messageUpdated', reduxAction: 'messageUpdated' },
  { webviewAction: 'session/messageCompleted', reduxAction: 'messageCompleted' },
  { webviewAction: 'session/thinkingUpdated', reduxAction: 'thinkingUpdated' },
  { webviewAction: 'session/toolUseAdded', reduxAction: 'toolUseAdded' },
  { webviewAction: 'session/toolResultAdded', reduxAction: 'toolResultAdded' },
  { webviewAction: 'session/tokenUsageUpdated', reduxAction: 'tokenUsageUpdated' },
  { webviewAction: 'ui/showPermissionRequest', reduxAction: 'showPermissionRequest' },
  { webviewAction: 'claude/setProcessing', reduxAction: 'setProcessing' },

  // Mappings with different names
  { webviewAction: 'session/tokensUpdated', reduxAction: 'updateTokenUsage' },
  { webviewAction: 'session/resumed', reduxAction: 'setCurrentSession' },
  { webviewAction: 'session/cleared', reduxAction: 'clearSession' },
  { webviewAction: 'ui/setReady', reduxAction: 'setWebviewReady' },

  // Custom handler mappings
  { webviewAction: 'session/messageAppended', customHandler: 'appendToMessage' },
  { webviewAction: 'session/modelSelected', customHandler: 'updateConfig' },
  { webviewAction: 'ui/showError', customHandler: 'showError' },
  { webviewAction: 'ui/showNotification', customHandler: 'showNotification' },
  { webviewAction: 'ui/showPlanProposal', customHandler: 'showPlanProposal' },
  { webviewAction: 'stream/messageReceived', customHandler: 'processStreamChunk' },
  { webviewAction: 'config/initializeConfig', customHandler: 'initializeConfig' },
  { webviewAction: 'mcp/updateConnectedServers', customHandler: 'updateMcpServers' },
];

/**
 * State synchronization strategy
 */
export interface StateSyncStrategy {
  /**
   *
   */
  stateField: string;
  /**
   *
   */
  syncToWebview: boolean;
  /**
   *
   */
  syncFromWebview: boolean;
  /**
   *
   */
  debounceMs?: number;
}

export const STATE_SYNC_STRATEGIES: StateSyncStrategy[] = [
  { stateField: 'sessions', syncToWebview: true, syncFromWebview: false, debounceMs: 100 },
  { stateField: 'currentSessionId', syncToWebview: true, syncFromWebview: true },
  { stateField: 'ui.webviewReady', syncToWebview: false, syncFromWebview: true },
  { stateField: 'ui.claudeRunning', syncToWebview: true, syncFromWebview: false },
  { stateField: 'claude.processing', syncToWebview: true, syncFromWebview: false },
  { stateField: 'config.selectedModel', syncToWebview: true, syncFromWebview: true },
];
