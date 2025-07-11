/**
 * Complete documentation of all webview ↔ backend message types
 * This serves as the source of truth for the migration
 * 
 * Updated based on ExtensionMessageHandler analysis (Phase 2.0.3)
 * Last updated: Phase 2 - StateManager migration
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
 * Based on ExtensionMessageHandler.handleMessage() switch cases
 */
export const WEBVIEW_TO_BACKEND_MESSAGES = {
  // Chat operations
  'chat/sendMessage': {
    description: 'User sends a message',
    payload: { text: 'string', sessionId: 'string | undefined' },
    handler: 'handleChatMessage',
  },
  'chat/newSession': {
    description: 'Start new chat session',
    payload: { sessionId: 'string' },
    handler: 'returns { sessionId }',
  },
  'chat/stopRequest': {
    description: 'Stop current Claude process',
    payload: {},
    handler: 'kills process or sends ESC',
  },

  // Settings and configuration
  'settings/get': {
    description: 'Get current settings',
    payload: {},
    handler: 'returns globalState settings',
  },
  'settings/update': {
    description: 'Update settings',
    payload: { settings: 'object' },
    handler: 'updates globalState',
  },
  'settings/selectModel': {
    description: 'Select Claude model',
    payload: { model: 'string' },
    handler: 'updates selectedModel',
  },

  // Conversation management
  'conversation/getList': {
    description: 'Get conversation list',
    payload: {},
    handler: 'returns conversation array',
  },

  // MCP (Model Context Protocol)
  'mcp/getServers': {
    description: 'Get MCP server list',
    payload: {},
    handler: 'returns { servers: McpServer[] }',
  },

  // Permissions
  'permission/response': {
    description: 'User responds to permission request',
    payload: { permissionId: 'string', response: 'allow' | 'deny' },
    handler: 'resolves pending permission',
  },

  // Plan mode
  'plan/approve': {
    description: 'Approve proposed plan',
    payload: {},
    handler: 'exits plan mode and continues',
  },
  'plan/refine': {
    description: 'Request plan refinement',
    payload: { feedback: 'string | undefined' },
    handler: 'sends feedback to Claude',
  },

};

/**
 * Messages sent FROM backend TO webview
 * Based on webviewProtocol.post() calls in ExtensionMessageHandler
 */
export const BACKEND_TO_WEBVIEW_MESSAGES = {
  // Message lifecycle operations
  'message/add': {
    description: 'Add new message (user/assistant)',
    payload: { role: 'user' | 'assistant', content: 'string', messageId: 'string', timestamp: 'string' },
    frequency: 'high',
  },
  'message/update': {
    description: 'Update existing message content',
    payload: { messageId: 'string', content: 'string' },
    frequency: 'high - during streaming',
  },
  'message/thinking': {
    description: 'Update thinking block',
    payload: { messageId: 'string', content: 'string', duration: 'number' },
    frequency: 'high - during thinking',
  },
  'message/toolUse': {
    description: 'Tool usage notification',
    payload: { messageId: 'string', toolUse: 'ToolUse' },
    frequency: 'medium',
  },
  'message/toolResult': {
    description: 'Tool execution results',
    payload: { messageId: 'string', toolUseId: 'string', result: 'any' },
    frequency: 'medium',
  },
  'message/planProposal': {
    description: 'Plan mode proposals',
    payload: { messageId: 'string', plan: 'object' },
    frequency: 'low - plan mode only',
  },
  'message/tokenUsage': {
    description: 'Token usage stats',
    payload: { inputTokens: 'number', outputTokens: 'number' },
    frequency: 'once per message',
  },

  // Status and control
  'status/processing': {
    description: 'Toggle processing state',
    payload: 'boolean',
    frequency: 'high',
  },
  'chat/messageComplete': {
    description: 'Signal message completion',
    payload: {},
    frequency: 'once per message',
  },
  'planMode/toggle': {
    description: 'Toggle plan mode',
    payload: 'boolean',
    frequency: 'low',
  },
  'error/show': {
    description: 'Display errors',
    payload: { message: 'string', details: 'string | undefined' },
    frequency: 'on errors',
  },

  // Other operations
  'permission/request': {
    description: 'Request user permission',
    payload: { permissionId: 'string', message: 'string', permissions: 'array' },
    frequency: 'as needed',
  },
  'mcp/status': {
    description: 'MCP server status',
    payload: { servers: 'McpServer[]' },
    frequency: 'on change',
  },
  'terminal/opened': {
    description: 'Terminal opened notification',
    payload: { terminalId: 'string' },
    frequency: 'on terminal open',
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

/**
 * Message flow sequences for common operations
 * Based on ExtensionMessageHandler stream processing
 */
export const MESSAGE_FLOW_SEQUENCES = {
  // User sends a message
  userMessage: [
    '→ chat/sendMessage',
    '← message/add (role: user)',
    '← status/processing (true)',
    '← message/add (role: assistant, empty)',
    '← message/thinking (multiple updates)',
    '← message/update (content chunks)',
    '← message/toolUse (if tools used)',
    '← message/toolResult (tool results)',
    '← message/tokenUsage',
    '← chat/messageComplete',
    '← status/processing (false)',
  ],

  // Error during processing
  errorFlow: [
    '→ chat/sendMessage',
    '← message/add (role: user)',
    '← status/processing (true)',
    '← error/show',
    '← status/processing (false)',
  ],

  // Plan mode interaction
  planModeFlow: [
    '← message/planProposal',
    '→ plan/approve OR plan/refine',
    '← planMode/toggle (false)',
    '← message/add (continue with plan)',
  ],

  // Permission request
  permissionFlow: [
    '← permission/request',
    '→ permission/response',
    '(continues with operation)',
  ],

  // Stop request
  stopFlow: [
    '→ chat/stopRequest',
    '← status/processing (false)',
  ],
};

/**
 * Critical state transitions during message processing
 */
export const STATE_TRANSITIONS = {
  messageStart: {
    before: { processing: false, currentAssistantMessageId: null },
    after: { processing: true, currentAssistantMessageId: 'new-id' },
  },
  
  thinkingStart: {
    before: { thinkingMessageId: null, accumulatedThinking: '' },
    after: { thinkingMessageId: 'thinking-id', thinkingStartTime: 'timestamp' },
  },
  
  toolUseStart: {
    before: { hasSeenToolUse: false, pendingToolIds: [] },
    after: { hasSeenToolUse: true, pendingToolIds: ['tool-id'] },
  },
  
  messageComplete: {
    before: { processing: true, hasCreatedAssistantMessage: true },
    after: { processing: false, currentAssistantMessageId: null },
  },
};
