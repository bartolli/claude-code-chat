/**
 * Type-safe message protocol between extension and webview
 * Based on the IdeMessenger pattern from the GUI project
 */

import { ClaudeStreamMessage, ModelType } from '../types/claude';

// Base message structure
export interface Message<T = any> {
    messageId: string;
    messageType: string;
    data: T;
}

// Message response types
export type MessageResult<T> = 
    | { status: 'success'; content: T }
    | { status: 'error'; error: string };

// Stream message types
export interface StreamMessage<T> {
    done: false;
    content: T;
}

export interface StreamComplete<T> {
    done: true;
    content?: T;
}

export type StreamResult<T> = StreamMessage<T> | StreamComplete<T> | { error: string };

// ============= Extension to Webview Messages =============

export interface ToWebviewProtocol {
    // Session Management
    'session/resumed': [void, { sessionId: string; title?: string }];
    'session/cleared': [void, void];
    'session/info': [void, { 
        sessionId: string; 
        tools: string[]; 
        mcpServers: string[] 
    }];

    // Status Messages
    'status/ready': [void, string];
    'status/loading': [void, string];
    'status/clearLoading': [void, void];
    'status/processing': [void, boolean];
    'status/loginRequired': [void, void];

    // Content Messages
    'content/output': [void, string];
    'content/userInput': [void, string];
    'content/error': [void, string];
    'content/thinking': [void, string];
    'content/toolUse': [void, {
        toolInfo: string;
        toolInput: string;
        rawInput: any;
        toolName: string;
    }];
    'content/toolResult': [void, {
        content: string;
        isError: boolean;
        toolUseId?: string;
    }];

    // Token and Cost Updates
    'tokens/update': [void, {
        totalTokensInput: number;
        totalTokensOutput: number;
        currentInputTokens: number;
        currentOutputTokens: number;
        cacheCreationTokens: number;
        cacheReadTokens: number;
    }];
    'totals/update': [void, {
        totalCost: number;
        totalTokensInput: number;
        totalTokensOutput: number;
        requestCount: number;
        currentCost?: number;
        currentDuration?: number;
        currentTurns?: number;
    }];

    // File and Workspace
    'workspace/files': [void, Array<{ 
        relativePath: string; 
        isDirectory: boolean 
    }>];
    'workspace/imagePath': [void, string];
    'workspace/clipboardText': [void, string];

    // Conversation Management
    'conversation/list': [void, Array<{
        filename: string;
        timestamp: number;
        title: string;
        model: string;
        messagesCount: number;
        totalTokens: number;
        totalCost: number;
    }>];
    'conversation/showRestoreOption': [void, Array<{
        sha: string;
        message: string;
        date: string;
    }>];
    'conversation/restoreProgress': [void, string];
    'conversation/restoreSuccess': [void, void];
    'conversation/restoreError': [void, string];

    // Settings and Configuration
    'settings/data': [void, Record<string, any>];
    'settings/modelSelected': [void, string];
    'settings/terminalOpened': [void, string];
    
    // Terminal messages
    'terminal/opened': [void, { message: string }];

    // Progressive UI Updates
    'ui/updateElement': [void, {
        id: string;
        type: 'text' | 'code' | 'tool' | 'thinking';
        content: string;
        metadata?: Record<string, any>;
    }];
    'ui/progressiveUpdate': [void, {
        messageId: string;
        content: string;
        isComplete: boolean;
        timestamp: number;
    }];
    'ui/batchUpdate': [void, {
        messageId: string;
        updates: Array<{
            messageId: string;
            content: string;
            isComplete: boolean;
            timestamp: number;
        }>;
        final: any;
    }];
    'ui/messageComplete': [void, {
        messageId: string;
        content: string;
        tokens: {
            input?: number;
            output?: number;
            thinking?: number;
        };
        cost?: number;
    }];

    // Stream Messages
    'stream/claude': [void, ClaudeStreamMessage];
    
    // Permission handling
    'permission/request': [void, {
        toolName: string;
        toolId: string;
        toolInput: any;
    }];
    
    // Error handling
    'error/show': [void, { message: string }];
    
    // Chat message protocol
    'message/add': [void, {
        role: 'user' | 'assistant';
        content: string;
        thinking?: string;
        toolUses?: Array<{
            toolName: string;
            toolId: string;
            input: any;
            result?: string;
            isError?: boolean;
        }>;
    }];
    'message/update': [void, {
        role: 'assistant';
        content: string;
    }];
    'message/thinking': [void, {
        content: string;
        isActive: boolean;
    }];
    'message/toolUse': [void, {
        toolName: string;
        toolId: string;
        input: any;
        status: string;
    }];
    'message/toolResult': [void, {
        toolId: string;
        result: string;
        isError?: boolean;
        status: string;
    }];
    'chat/messageComplete': [void, {
        sessionId?: string;
        totalCost?: number;
        duration?: number;
    }];
}

// ============= Webview to Extension Messages =============

export interface FromWebviewProtocol {
    // Chat Operations
    'chat/sendMessage': [{
        text: string;
        planMode: boolean;
        thinkingMode: boolean;
        thinkingIntensity?: 'think' | 'think-hard' | 'think-harder';
    }, void];
    'chat/stopRequest': [void, void];
    'chat/newSession': [void, void];

    // File Operations
    'file/getWorkspaceFiles': [{ searchTerm?: string }, Array<{
        relativePath: string;
        isDirectory: boolean;
    }>];
    'file/selectImage': [void, string | undefined];
    'file/getClipboardText': [void, string];

    // Conversation Management
    'conversation/getList': [void, Array<{
        filename: string;
        timestamp: number;
        title: string;
        model: string;
        messagesCount: number;
        totalTokens: number;
        totalCost: number;
    }>];
    'conversation/load': [{ filename: string }, void];
    'conversation/restore': [{ commitSha: string }, void];

    // Settings and Configuration
    'settings/get': [void, Record<string, any>];
    'settings/update': [Record<string, any>, void];
    'settings/selectModel': [{ model: string }, void];
    'settings/openModelTerminal': [void, void];
    'settings/executeSlashCommand': [{ command: string }, void];

    // Streaming requests
    'stream/start': [{ requestId: string }, void];
    'stream/abort': [{ requestId: string }, void];
    
    // Permission handling
    'permission/response': [{
        toolId: string;
        toolName: string;
        approved: boolean;
    }, void];
}

// Helper types for type safety
export type ToWebviewMessageType = keyof ToWebviewProtocol;
export type FromWebviewMessageType = keyof FromWebviewProtocol;

export type ToWebviewMessage<T extends ToWebviewMessageType> = {
    type: T;
    data: ToWebviewProtocol[T][1];
};

export type FromWebviewMessage<T extends FromWebviewMessageType> = {
    type: T;
    data: FromWebviewProtocol[T][0];
    messageId?: string;
};

// Utility types for protocol handling
export type ProtocolHandler<P extends Record<string, [any, any]>> = {
    [K in keyof P]: (data: P[K][0]) => Promise<P[K][1]> | P[K][1];
};

export type StreamProtocolHandler<P extends Record<string, [any, any]>> = {
    [K in keyof P]: (data: P[K][0]) => AsyncGenerator<P[K][1], void, unknown>;
};