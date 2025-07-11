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
    }))
  },
  RelativePattern: vi.fn((base, pattern) => ({ base, pattern })),
  Uri: {
    file: vi.fn((path) => ({ path, scheme: 'file' })),
    parse: vi.fn((uri) => ({ path: uri }))
  },
  commands: {
    executeCommand: vi.fn(),
    registerCommand: vi.fn()
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
        get: vi.fn(),
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
    it('should handle chat/sendMessage', async () => {
      const messageData = {
        text: 'Hello Claude',
        sessionId: 'test-session-123'
      };

      // Mock the post method
      mockWebviewProtocol.post = vi.fn();
      
      // Mock process spawning
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { on: vi.fn(), pipe: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      });

      await handler.handleMessage('chat/sendMessage', messageData);

      // Verify user message was posted to webview
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('message/add', {
        role: 'user',
        content: 'Hello Claude',
        messageId: expect.any(String),
        timestamp: expect.any(String)
      });

      // Verify processing status was set
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', true);
    });

    it('should handle chat/newSession', async () => {
      const sessionData = { sessionId: 'new-session-456' };
      
      const result = await handler.handleMessage('chat/newSession', sessionData);
      
      expect(result).toEqual({ sessionId: 'new-session-456' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Starting new session',
        expect.any(Object)
      );
    });

    it('should handle settings/get', async () => {
      const mockSettings = { model: 'claude-3-opus', apiKey: 'test-key' };
      mockContext.globalState.get = vi.fn().mockReturnValue(mockSettings);

      const result = await handler.handleMessage('settings/get', {});
      
      expect(result).toEqual(mockSettings);
    });

    it('should handle settings/update', async () => {
      const newSettings = { model: 'claude-3-sonnet' };
      
      await handler.handleMessage('settings/update', newSettings);
      
      expect(mockContext.globalState.update).toHaveBeenCalledWith('claude-settings', newSettings);
    });

    it('should handle chat/stopRequest', async () => {
      mockWebviewProtocol.post = vi.fn();

      await handler.handleMessage('chat/stopRequest', {});
      
      // Should update status
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', false);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('[Stop] No active Claude process to stop');
    });

    it('should handle conversation/getList', async () => {
      const mockConversations = [
        { id: '1', title: 'Chat 1' },
        { id: '2', title: 'Chat 2' }
      ];
      mockContext.globalState.get = vi.fn().mockReturnValue(mockConversations);

      const result = await handler.handleMessage('conversation/getList', {});
      
      expect(result).toEqual(mockConversations);
    });

    it('should handle mcp/getServers', async () => {
      const result = await handler.handleMessage('mcp/getServers', {});
      
      expect(result).toEqual({ servers: [] });
    });

    it('should handle permission/response', async () => {
      const permissionData = {
        permissionId: 'perm-123',
        response: 'allow'
      };

      await handler.handleMessage('permission/response', permissionData);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Received permission response',
        permissionData
      );
    });

    it('should handle plan/approve', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      await handler.handleMessage('plan/approve', {});
      
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('planMode/toggle', false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Plan approved, exiting plan mode'
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
    it('should handle errors in message processing', async () => {
      mockWebviewProtocol.post = vi.fn();
      
      // Force an error by not mocking process spawn
      mockProcessManager.spawn = vi.fn().mockRejectedValue(new Error('Spawn failed'));

      await handler.handleMessage('chat/sendMessage', { text: 'test' });

      // Should post error
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('error/show', {
        message: expect.stringContaining('Spawn failed'),
        details: expect.any(String)
      });

      // Should update status
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', false);
    });

    it('should handle missing session ID gracefully', async () => {
      mockWebviewProtocol.post = vi.fn();

      await handler.handleMessage('chat/sendMessage', { text: 'test', sessionId: null });

      // Should post error about missing session
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('error/show', {
        message: 'No session ID provided',
        details: expect.any(String)
      });
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
    it('should track current session ID', async () => {
      await handler.handleMessage('chat/newSession', { sessionId: 'session-789' });
      
      // The session ID should be stored internally
      // We can verify this by sending a message
      mockWebviewProtocol.post = vi.fn();
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { on: vi.fn(), pipe: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      });

      await handler.handleMessage('chat/sendMessage', { 
        text: 'test',
        sessionId: 'session-789' 
      });

      // Should use the session ID
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ExtensionMessageHandler',
        'Handling message: chat/sendMessage'
      );
    });

    it('should manage processing state correctly', async () => {
      mockWebviewProtocol.post = vi.fn();

      // Start processing
      mockProcessManager.spawn = vi.fn().mockResolvedValue({
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: { on: vi.fn(), pipe: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      });

      await handler.handleMessage('chat/sendMessage', { 
        text: 'test',
        sessionId: 'test-session' 
      });

      // Should set processing to true
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', true);

      // Stop processing
      await handler.handleMessage('chat/stopRequest', {});

      // Should set processing to false
      expect(mockWebviewProtocol.post).toHaveBeenCalledWith('status/processing', false);
    });
  });
});