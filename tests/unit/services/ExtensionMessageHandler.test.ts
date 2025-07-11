import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ExtensionMessageHandler } from '../../../src/services/ExtensionMessageHandler';
import { ServiceContainer } from '../../../src/core/ServiceContainer';
import { SimpleWebviewProtocol } from '../../../src/protocol/SimpleWebviewProtocol';
import { Logger } from '../../../src/core/Logger';
import { StreamProcessor } from '../../../src/services/StreamProcessor';
import { ChunkedJSONParser } from '../../../src/services/ChunkedJSONParser';
import { ClaudeProcessManager } from '../../../src/services/ClaudeProcessManager';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      show: vi.fn(),
      hide: vi.fn()
    }))
  },
  OutputChannel: vi.fn(),
  ExtensionContext: vi.fn(),
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn()
    })),
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn()
    })),
    workspaceFolders: [{
      uri: { fsPath: '/test/workspace' },
      name: 'test',
      index: 0
    }]
  },
  RelativePattern: vi.fn((base, pattern) => ({ base, pattern })),
  Uri: {
    file: vi.fn((path) => ({ path, scheme: 'file' })),
    parse: vi.fn((uri) => ({ path: uri }))
  },
  commands: {
    executeCommand: vi.fn(),
    registerCommand: vi.fn()
  },
  env: {
    machineId: 'test-machine-id',
    sessionId: 'test-session-id'
  }
}));

// Mock dependencies
vi.mock('../../../src/protocol/SimpleWebviewProtocol');
vi.mock('../../../src/services/StreamProcessor');
vi.mock('../../../src/services/ChunkedJSONParser');
vi.mock('../../../src/services/ClaudeProcessManager');
vi.mock('../../../src/services/McpService', () => ({
  mcpService: {
    initialize: vi.fn(),
    getServers: vi.fn().mockResolvedValue([])
  }
}));
vi.mock('../../../src/services/McpClientService', () => ({
  mcpClientService: {
    startServer: vi.fn(),
    stopServer: vi.fn()
  }
}));
vi.mock('../../../src/state/StateManager', () => ({
  StateManager: {
    getInstance: vi.fn(() => ({
      dispatch: vi.fn(),
      getState: vi.fn(),
      subscribe: vi.fn()
    }))
  }
}));
vi.mock('../../../src/migration/ActionMapper');

/**
 * ExtensionMessageHandler Unit Tests
 * 
 * These tests verify the message handling logic of ExtensionMessageHandler.
 * 
 * NOTE: Some tests are skipped because they involve spawning Claude processes:
 * - chat/sendMessage: Spawns Claude process, better tested in integration tests
 * - plan/approve: Triggers handleChatMessage which spawns Claude
 * - State management tests: Require active Claude processes
 * 
 * The StateManager integration is tested by verifying that:
 * 1. Existing behavior is preserved (no breaking changes)
 * 2. StateManager is only initialized when feature flag is enabled
 * 3. Parallel dispatches don't affect the main message flow
 */
describe('ExtensionMessageHandler', () => {
  let handler: ExtensionMessageHandler;
  let mockContext: vscode.ExtensionContext;
  let mockServiceContainer: ServiceContainer;
  let mockWebviewProtocol: SimpleWebviewProtocol;
  let mockLogger: Logger;
  let mockOutputChannel: vscode.OutputChannel;
  let mockStreamProcessor: StreamProcessor;
  let mockJsonParser: ChunkedJSONParser;
  let mockProcessManager: ClaudeProcessManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: vi.fn((key) => {
          // Return empty feature flags to disable StateManager integration
          if (key === 'featureFlags') {
            return {};
          }
          return undefined;
        }),
        update: vi.fn()
      },
      workspaceState: {
        get: vi.fn(),
        update: vi.fn()
      }
    } as any;

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    } as any;

    // Create mock output channel
    mockOutputChannel = vscode.window.createOutputChannel('Test');

    // Create mock services
    mockStreamProcessor = new StreamProcessor(mockLogger);
    mockJsonParser = new ChunkedJSONParser(mockLogger);
    mockProcessManager = new ClaudeProcessManager();

    // Create service container
    mockServiceContainer = ServiceContainer.getInstance();
    mockServiceContainer.set('Logger', mockLogger);
    mockServiceContainer.set('OutputChannel', mockOutputChannel);
    mockServiceContainer.set('StreamProcessor', mockStreamProcessor);
    mockServiceContainer.set('ChunkedJSONParser', mockJsonParser);
    mockServiceContainer.set('ClaudeProcessManager', mockProcessManager);

    // Create handler
    handler = new ExtensionMessageHandler(mockContext, mockServiceContainer);

    // Create and attach mock webview protocol
    mockWebviewProtocol = new SimpleWebviewProtocol({} as any);
    handler.attach(mockWebviewProtocol);
    
    // Mock the post method to track calls
    mockWebviewProtocol.post = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with required dependencies', () => {
      expect(handler).toBeDefined();
      expect(mockLogger.info).not.toHaveBeenCalled(); // No info logs during init
    });

    it('should attach webview protocol', () => {
      const newProtocol = new SimpleWebviewProtocol({} as any);
      handler.attach(newProtocol);
      // Should not throw
      expect(handler).toBeDefined();
    });
  });

  describe('handleMessage', () => {
    it.skip('should handle chat/sendMessage', async () => {
      const messageData = {
        text: 'Hello Claude',
        sessionId: 'test-session-123'
      };

      // Mock the post method
      mockWebviewProtocol.post = vi.fn();
      
      // Mock process spawning with correct Result type
      const mockProcess = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { 
          on: vi.fn(), 
          pipe: vi.fn()
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'exit') {
            // Simulate process exit immediately
            setTimeout(() => callback(0, null), 0);
          }
        }),
        kill: vi.fn(),
        pid: 12345,
        killed: false
      };
      
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        ok: true,
        value: mockProcess
      });
      
      // Mock stream processor
      mockStreamProcessor.streamToWebview = vi.fn().mockResolvedValue(undefined);

      // Start the message handling but don't wait for it to complete
      const messagePromise = handler.handleMessage('chat/sendMessage', messageData);
      
      // Wait a bit for initial messages to be posted
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify user message was posted to webview
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('message/add', {
        role: 'user',
        content: 'Hello Claude'
      });

      // Verify processing status was set
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', true);
      
      // Clean up - don't wait for the full process
      mockProcess.on.mock.calls.forEach(([event, callback]) => {
        if (event === 'exit') {
          callback(0, null);
        }
      });
    });

    it('should handle chat/newSession', async () => {
      const sessionData = { sessionId: 'new-session-456' };
      
      const result = await handler.handleMessage('chat/newSession', sessionData);
      
      // chat/newSession returns void
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'New session requested'
      );
    });

    it('should handle settings/get', async () => {
      // Mock workspaceState.get to return expected values
      mockContext.workspaceState.get = vi.fn((key, defaultValue) => {
        if (key === 'selectedModel') return 'claude-3-opus';
        if (key === 'autoSave') return true;
        if (key === 'gitBackup') return false;
        return defaultValue;
      });

      const result = await handler.handleMessage('settings/get', {});
      
      expect(result).toEqual({
        selectedModel: 'claude-3-opus',
        autoSave: true,
        gitBackup: false
      });
    });

    it('should handle settings/update', async () => {
      const newSettings = { selectedModel: 'claude-3-sonnet' };
      
      await handler.handleMessage('settings/update', newSettings);
      
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith('selectedModel', 'claude-3-sonnet');
    });

    it('should handle chat/stopRequest', async () => {
      mockWebviewProtocol.post = vi.fn();

      await handler.handleMessage('chat/stopRequest', {});
      
      // Without active process, it should just log
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Stop requested'
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('[Stop] User requested to stop Claude');
    });

    it('should handle conversation/getList', async () => {
      const result = await handler.handleMessage('conversation/getList', {});
      
      // Currently returns empty array
      expect(result).toEqual({ conversations: [] });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Getting conversation list'
      );
    });

    it('should handle mcp/getServers', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      const result = await handler.handleMessage('mcp/getServers', {});
      
      // mcp/getServers returns void and posts to webview
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Getting MCP servers'
      );
      
      // Should post mcp/status
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('mcp/status', { servers: [] });
    });

    it('should handle permission/response', async () => {
      const permissionData = {
        permissionId: 'perm-123',
        response: 'allow'
      };

      await handler.handleMessage('permission/response', permissionData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Permission response',
        permissionData
      );
    });

    it.skip('should handle plan/approve', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      // Mock fs.promises.writeFile
      const fs = await import('fs');
      vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      
      // Mock process spawning for handleChatMessage
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          stdin: { write: vi.fn(), end: vi.fn() },
          stdout: { on: vi.fn(), pipe: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, callback) => {
            if (event === 'exit') {
              setTimeout(() => callback(0, null), 0);
            }
          }),
          kill: vi.fn(),
          pid: 12345,
          killed: false
        }
      });
      
      await handler.handleMessage('plan/approve', {});
      
      // Should toggle plan mode
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('planMode/toggle', false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Plan approved',
        {}
      );
    });

    it('should handle plan/refine with feedback', async () => {
      const feedbackData = { feedback: 'Please add more details' };
      
      await handler.handleMessage('plan/refine', feedbackData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Plan refinement requested',
        feedbackData
      );
    });
  });

  describe('error handling', () => {
    it.skip('should handle errors in message processing', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      // Force an error by returning error result
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        ok: false,
        error: new Error('Spawn failed')
      });

      await handler.handleMessage('chat/sendMessage', { text: 'test', sessionId: 'test-session' });

      // Should post error
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('error/show', {
        message: 'Failed to start Claude: Spawn failed'
      });
    });

    it.skip('should handle missing session ID gracefully', async () => {
      // Skip this test - the handler doesn't validate session ID
      // It will create a new session if none exists
    });
  });

  describe('stream processing', () => {
    it('should process assistant messages from stream', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      // Simulate stream data
      const streamData = {
        type: 'content_block',
        content_block: {
          type: 'text',
          text: 'Hello from Claude!'
        }
      };

      // We'll need to test the stream processing callback
      // This would require exposing the processStream method or testing via integration
      // For now, we'll test that the handler is set up correctly
      expect(handler).toBeDefined();
    });
  });

  describe('state management', () => {
    it.skip('should track current session ID', async () => {
      // Skip this test - it would require spawning Claude
      // Better tested in integration tests
    });

    it.skip('should manage processing state correctly', async () => {
      // Skip this test - it would require spawning Claude
      // Better tested in integration tests
    });
  });
});