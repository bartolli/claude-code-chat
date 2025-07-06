import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExtensionMessageHandler } from '../../services/ExtensionMessageHandler';
import { SimpleStateManager } from '../../state/SimpleStateManager';
import { ClaudeServiceInterface } from '../../interfaces/claude.interface';
import { WebviewProtocol } from '../../protocols/WebviewProtocol';

/**
 * Integration tests for current message flow
 * These tests establish a baseline for the migration to StateManager
 */
suite('Message Flow Integration Tests - Baseline', () => {
    let messageHandler: ExtensionMessageHandler;
    let stateManager: SimpleStateManager;
    let webviewProtocol: WebviewProtocol;
    let claudeService: MockClaudeService;
    let context: vscode.ExtensionContext;

    // Message type tracking
    const capturedMessages: Array<{ type: string; data: any }> = [];

    class MockClaudeService implements Partial<ClaudeServiceInterface> {
        async sendMessage(text: string, options?: any) {
            return {
                messageId: 'test-message-id',
                sessionId: 'test-session-id',
                response: 'Test response'
            };
        }

        async streamMessage(text: string, options?: any) {
            const chunks = [
                { type: 'message_start', message: { id: 'msg-1' } },
                { type: 'content_block_start', content_block: { type: 'text' } },
                { type: 'content_block_delta', delta: { text: 'Hello' } },
                { type: 'content_block_stop' },
                { type: 'message_stop' }
            ];
            
            for (const chunk of chunks) {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (options?.onChunk) {
                    options.onChunk(chunk);
                }
            }
        }
    }

    setup(async () => {
        // Create a mock context
        context = {
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => {}
            },
            subscriptions: []
        } as any;

        // Initialize components
        stateManager = new SimpleStateManager(context);
        claudeService = new MockClaudeService();
        
        // Create mock webview protocol that captures messages
        webviewProtocol = {
            post: (type: string, data: any) => {
                capturedMessages.push({ type, data });
                return Promise.resolve();
            },
            isReady: () => true
        } as any;

        // Clear captured messages before each test
        capturedMessages.length = 0;
    });

    teardown(() => {
        // Clean up
        capturedMessages.length = 0;
    });

    test('User message flow - complete lifecycle', async () => {
        // Test complete flow: user message → Claude response → UI updates
        const userMessage = 'Hello Claude';
        
        // Simulate user sending a message
        await messageHandler.handleChatMessage({ text: userMessage });

        // Verify message flow
        const messageAddEvents = capturedMessages.filter(m => m.type === 'message/add');
        assert.strictEqual(messageAddEvents.length >= 2, true, 'Should have at least 2 message/add events (user + assistant)');
        
        // Verify user message
        const userMessageEvent = messageAddEvents.find(m => m.data.role === 'user');
        assert.strictEqual(userMessageEvent?.data.content, userMessage);
        
        // Verify assistant message started
        const assistantMessageEvent = messageAddEvents.find(m => m.data.role === 'assistant');
        assert.ok(assistantMessageEvent, 'Should have assistant message');
    });

    test('Thinking block creation and completion', async () => {
        // Override streamMessage to include thinking blocks
        claudeService.streamMessage = async (text: string, options?: any) => {
            const chunks = [
                { type: 'message_start', message: { id: 'msg-1' } },
                { type: 'content_block_start', content_block: { type: 'thinking' } },
                { type: 'content_block_delta', delta: { thinking: 'Analyzing request...' } },
                { type: 'content_block_stop' },
                { type: 'content_block_start', content_block: { type: 'text' } },
                { type: 'content_block_delta', delta: { text: 'Here is my response' } },
                { type: 'content_block_stop' },
                { type: 'message_stop' }
            ];
            
            for (const chunk of chunks) {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (options?.onChunk) {
                    options.onChunk(chunk);
                }
            }
        };

        await messageHandler.handleChatMessage({ text: 'Test with thinking' });

        // Verify thinking block messages
        const thinkingMessages = capturedMessages.filter(m => m.type === 'message/thinking');
        assert.ok(thinkingMessages.length > 0, 'Should have thinking block messages');
        
        // Verify thinking block lifecycle
        const activeThinking = thinkingMessages.find(m => m.data.isActive === true);
        const completedThinking = thinkingMessages.find(m => m.data.isActive === false);
        assert.ok(activeThinking, 'Should have active thinking block');
        assert.ok(completedThinking, 'Should have completed thinking block');
    });

    test('Tool use tracking', async () => {
        // Override streamMessage to include tool use
        claudeService.streamMessage = async (text: string, options?: any) => {
            const chunks = [
                { type: 'message_start', message: { id: 'msg-1' } },
                { type: 'content_block_start', content_block: { 
                    type: 'tool_use',
                    id: 'tool-1',
                    name: 'read_file',
                    input: { path: '/test/file.js' }
                }},
                { type: 'content_block_stop' },
                { type: 'message_stop' }
            ];
            
            for (const chunk of chunks) {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (options?.onChunk) {
                    options.onChunk(chunk);
                }
            }
        };

        await messageHandler.handleChatMessage({ text: 'Read a file' });

        // Verify tool use messages
        const toolUseMessages = capturedMessages.filter(m => m.type === 'message/toolUse');
        assert.ok(toolUseMessages.length > 0, 'Should have tool use messages');
        
        const toolUse = toolUseMessages[0];
        assert.strictEqual(toolUse.data.name, 'read_file');
        assert.strictEqual(toolUse.data.input.path, '/test/file.js');
    });

    test('Token counting and cost tracking', async () => {
        // Override streamMessage to include usage stats
        claudeService.streamMessage = async (text: string, options?: any) => {
            const chunks = [
                { type: 'message_start', message: { id: 'msg-1', usage: { input_tokens: 10 } } },
                { type: 'content_block_start', content_block: { type: 'text' } },
                { type: 'content_block_delta', delta: { text: 'Response' } },
                { type: 'content_block_stop' },
                { type: 'message_delta', usage: { output_tokens: 5 } },
                { type: 'message_stop' }
            ];
            
            for (const chunk of chunks) {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (options?.onChunk) {
                    options.onChunk(chunk);
                }
            }
        };

        await messageHandler.handleChatMessage({ text: 'Count tokens' });

        // Verify token update messages
        const tokenMessages = capturedMessages.filter(m => 
            m.type === 'message/tokensUpdate' || m.type === 'session/tokensUpdated'
        );
        assert.ok(tokenMessages.length > 0, 'Should have token update messages');
    });

    test('Session creation and management', async () => {
        // Test session lifecycle
        const sessionId = 'test-session-123';
        
        // Verify initial state
        assert.strictEqual(stateManager.getCurrentSessionId(), null, 'Should start with no session');
        
        // Simulate session creation through message
        await messageHandler.handleChatMessage({ text: 'Start conversation' });
        
        // Verify session messages
        const sessionMessages = capturedMessages.filter(m => m.type.startsWith('session/'));
        assert.ok(sessionMessages.length > 0, 'Should have session-related messages');
    });

    test('Error handling and recovery', async () => {
        // Override to simulate error
        claudeService.streamMessage = async (text: string, options?: any) => {
            throw new Error('Simulated API error');
        };

        await messageHandler.handleChatMessage({ text: 'Trigger error' });

        // Verify error handling
        const errorMessages = capturedMessages.filter(m => 
            m.type === 'message/error' || m.type === 'ui/showError'
        );
        assert.ok(errorMessages.length > 0, 'Should have error messages');
    });

    test('Message state transitions', async () => {
        // Track all message state updates
        const messageStates: string[] = [];
        
        // Override to track state transitions
        const originalPost = webviewProtocol.post;
        webviewProtocol.post = (type: string, data: any) => {
            if (type === 'message/update' || type === 'message/complete') {
                messageStates.push(type);
            }
            return originalPost(type, data);
        };

        await messageHandler.handleChatMessage({ text: 'Track states' });

        // Verify state transitions occurred
        assert.ok(messageStates.includes('message/update'), 'Should have message updates');
        assert.ok(messageStates.includes('message/complete'), 'Should have message completion');
    });

    test('Performance benchmark - message processing', async () => {
        const startTime = Date.now();
        const messageCount = 10;

        for (let i = 0; i < messageCount; i++) {
            await messageHandler.handleChatMessage({ text: `Message ${i}` });
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / messageCount;

        // Log performance baseline
        console.log(`Performance baseline: ${avgTime}ms per message`);
        
        // Store for comparison after migration
        context.workspaceState.update('migration.baseline.messageTime', avgTime);
    });
});

/**
 * Webview Protocol Message Documentation
 * These are all the message types observed in the current implementation
 */
export const WEBVIEW_MESSAGE_TYPES = {
    // Session messages
    'session/created': { description: 'New session created', payload: { id: 'string', title: 'string' } },
    'session/resumed': { description: 'Session resumed', payload: { sessionId: 'string' } },
    'session/cleared': { description: 'Session cleared', payload: {} },
    'session/messageAppended': { description: 'Content appended to message', payload: { messageId: 'string', content: 'string' } },
    'session/tokensUpdated': { description: 'Token count updated', payload: { input: 'number', output: 'number' } },
    'session/modelSelected': { description: 'Model selected', payload: { model: 'string' } },
    
    // Message lifecycle
    'message/add': { description: 'Add new message', payload: { role: 'string', content: 'string' } },
    'message/update': { description: 'Update message content', payload: { messageId: 'string', content: 'string' } },
    'message/complete': { description: 'Mark message as complete', payload: { messageId: 'string' } },
    'message/error': { description: 'Message error', payload: { error: 'string' } },
    'message/thinking': { description: 'Thinking block update', payload: { content: 'string', isActive: 'boolean', messageId: 'string' } },
    'message/toolUse': { description: 'Tool use event', payload: { id: 'string', name: 'string', input: 'object' } },
    'message/toolResult': { description: 'Tool result', payload: { toolUseId: 'string', result: 'any' } },
    'message/tokensUpdate': { description: 'Token usage update', payload: { input: 'number', output: 'number' } },
    
    // UI messages
    'ui/setReady': { description: 'Webview ready', payload: { ready: 'boolean' } },
    'ui/showError': { description: 'Show error to user', payload: { message: 'string' } },
    'ui/showPermissionRequest': { description: 'Show permission dialog', payload: { permissions: 'array' } },
    'ui/showNotification': { description: 'Show notification', payload: { message: 'string', type: 'string' } },
    'ui/showPlanProposal': { description: 'Show plan proposal', payload: { plan: 'object' } },
    
    // Claude messages
    'claude/setProcessing': { description: 'Set Claude processing state', payload: { processing: 'boolean' } },
    
    // Other messages
    'stream/messageReceived': { description: 'Stream chunk received', payload: { chunk: 'object' } },
    'config/initializeConfig': { description: 'Initialize configuration', payload: { config: 'object' } },
    'mcp/updateConnectedServers': { description: 'Update MCP server status', payload: { servers: 'array' } }
};