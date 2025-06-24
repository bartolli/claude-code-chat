/**
 * Base protocol definitions for typed communication
 */

export interface ProtocolMessage<T = unknown> {
  messageId: string;
  messageType: string;
  timestamp: number;
  data: T;
}

export interface ProtocolRequest<T = unknown> extends ProtocolMessage<T> {
  expectsResponse: true;
  timeout?: number;
}

export interface ProtocolResponse<T = unknown> extends ProtocolMessage<T> {
  requestId: string;
  success: boolean;
  error?: ProtocolError;
}

export interface ProtocolEvent<T = unknown> extends ProtocolMessage<T> {
  expectsResponse: false;
}

export interface ProtocolError {
  code: string;
  message: string;
  details?: unknown;
}

export type Protocol<T extends Record<string, { request: unknown; response: unknown }>> = {
  [K in keyof T]: {
    request: T[K]['request'];
    response: T[K]['response'];
  };
};

// Define the protocol between extension and webview
export interface ExtensionProtocol {
  'chat/sendMessage': {
    request: { message: string; context?: unknown };
    response: { sessionId: string; messageId: string };
  };
  'chat/stop': {
    request: void;
    response: { stopped: boolean };
  };
  'session/new': {
    request: { model?: string };
    response: { sessionId: string };
  };
  'session/load': {
    request: { path: string };
    response: { sessionId: string; messages: unknown[] };
  };
  'session/save': {
    request: { sessionId: string };
    response: { path: string };
  };
  'config/update': {
    request: { config: Partial<unknown> };
    response: { success: boolean };
  };
}

export type ExtensionProtocolType = keyof ExtensionProtocol;