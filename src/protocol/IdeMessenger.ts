/**
 * IdeMessenger for webview-side communication
 * Implements the same pattern as the GUI project for compatibility
 */

import { v4 as uuidv4 } from 'uuid';
import {
    Message,
    MessageResult,
    StreamResult,
    ToWebviewProtocol,
    FromWebviewProtocol,
    ToWebviewMessageType,
    FromWebviewMessageType,
} from './types';

declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};

export interface IIdeMessenger {
    post<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
        messageId?: string,
        attempt?: number,
    ): void;

    respond<T extends ToWebviewMessageType>(
        messageType: T,
        data: ToWebviewProtocol[T][1],
        messageId: string,
    ): void;

    request<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
    ): Promise<FromWebviewProtocol[T][1]>;

    streamRequest<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
        cancelToken?: AbortSignal,
    ): AsyncGenerator<FromWebviewProtocol[T][1], void, unknown>;

    on<T extends ToWebviewMessageType>(
        messageType: T,
        handler: (data: ToWebviewProtocol[T][0]) => void,
    ): () => void;

    onStream<T extends ToWebviewMessageType>(
        messageType: T,
        handler: (data: AsyncGenerator<ToWebviewProtocol[T][1], void>) => void,
    ): () => void;
}

export class IdeMessenger implements IIdeMessenger {
    private vscode: ReturnType<typeof acquireVsCodeApi>;
    private handlers = new Map<string, Set<(data: any) => void>>();
    private streamHandlers = new Map<string, Set<(data: any) => void>>();
    private responseHandlers = new Map<string, (data: any) => void>();
    private streamBuffers = new Map<string, {
        buffer: any[];
        resolve?: (value: any) => void;
        reject?: (error: any) => void;
    }>();

    constructor(vscodeApi?: ReturnType<typeof acquireVsCodeApi>) {
        // Use provided API or acquire it
        if (vscodeApi) {
            this.vscode = vscodeApi;
        } else if (typeof acquireVsCodeApi !== 'undefined') {
            this.vscode = acquireVsCodeApi();
        } else {
            // Mock for testing
            this.vscode = {
                postMessage: (msg) => console.log('Mock postMessage:', msg),
                getState: () => ({}),
                setState: () => {},
            };
        }

        // Set up message receiving
        if (typeof window !== 'undefined') {
            window.addEventListener('message', (event: MessageEvent) => {
                const message = event.data as Message;
                this.handleMessage(message);
            });
        }
    }

    private _postToIde(
        messageType: string,
        data: any,
        messageId: string = uuidv4(),
    ) {
        const msg: Message = {
            messageId,
            messageType,
            data,
        };

        this.vscode.postMessage(msg);
    }

    post<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
        messageId?: string,
        attempt: number = 0,
    ) {
        try {
            this._postToIde(messageType, data, messageId);
        } catch (error) {
            if (attempt < 5) {
                console.log(`Attempt ${attempt} failed. Retrying...`);
                setTimeout(
                    () => this.post(messageType, data, messageId, attempt + 1),
                    Math.pow(2, attempt) * 1000,
                );
            } else {
                console.error(
                    'Max attempts reached. Message could not be sent.',
                    error,
                );
            }
        }
    }

    respond<T extends ToWebviewMessageType>(
        messageType: T,
        data: ToWebviewProtocol[T][1],
        messageId: string,
    ) {
        this._postToIde(messageType, data, messageId);
    }

    request<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
    ): Promise<FromWebviewProtocol[T][1]> {
        const messageId = uuidv4();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.responseHandlers.delete(messageId);
                reject(new Error(`Request timeout: ${messageType}`));
            }, 30000); // 30 second timeout

            this.responseHandlers.set(messageId, (response: MessageResult<FromWebviewProtocol[T][1]>) => {
                clearTimeout(timeout);
                this.responseHandlers.delete(messageId);
                
                if (response.status === 'error') {
                    reject(new Error(response.error));
                } else {
                    resolve(response.content);
                }
            });

            this.post(messageType, data, messageId);
        });
    }

    async *streamRequest<T extends FromWebviewMessageType>(
        messageType: T,
        data: FromWebviewProtocol[T][0],
        cancelToken?: AbortSignal,
    ): AsyncGenerator<FromWebviewProtocol[T][1], void, unknown> {
        const messageId = uuidv4();

        // Initialize stream buffer
        this.streamBuffers.set(messageId, { buffer: [] });

        // Send the request
        this.post(messageType, data, messageId);

        // Handle abort
        const handleAbort = () => {
            this.post('stream/abort' as FromWebviewMessageType, { requestId: messageId } as any, messageId);
            this.streamBuffers.delete(messageId);
        };
        cancelToken?.addEventListener('abort', handleAbort);

        try {
            let done = false;
            let index = 0;

            while (!done) {
                const bufferInfo = this.streamBuffers.get(messageId);
                if (!bufferInfo) {
                    throw new Error('Stream buffer not found');
                }

                // Check for new data
                if (bufferInfo.buffer.length > index) {
                    const chunks = bufferInfo.buffer.slice(index);
                    index = bufferInfo.buffer.length;

                    for (const chunk of chunks) {
                        if ('error' in chunk) {
                            throw new Error(chunk.error);
                        } else if (chunk.done) {
                            done = true;
                            if (chunk.content !== undefined) {
                                yield chunk.content;
                            }
                        } else {
                            yield chunk.content;
                        }
                    }
                }

                if (!done) {
                    // Wait for more data
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        } finally {
            cancelToken?.removeEventListener('abort', handleAbort);
            this.streamBuffers.delete(messageId);
        }
    }

    on<T extends ToWebviewMessageType>(
        messageType: T,
        handler: (data: ToWebviewProtocol[T][0]) => void,
    ): () => void {
        if (!this.handlers.has(messageType)) {
            this.handlers.set(messageType, new Set());
        }
        
        this.handlers.get(messageType)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(messageType);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.handlers.delete(messageType);
                }
            }
        };
    }

    onStream<T extends ToWebviewMessageType>(
        messageType: T,
        handler: (data: AsyncGenerator<ToWebviewProtocol[T][1], void>) => void,
    ): () => void {
        if (!this.streamHandlers.has(messageType)) {
            this.streamHandlers.set(messageType, new Set());
        }
        
        this.streamHandlers.get(messageType)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.streamHandlers.get(messageType);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.streamHandlers.delete(messageType);
                }
            }
        };
    }

    private handleMessage(message: Message): void {
        const { messageId, messageType, data } = message;

        // Check for response to a request
        if (this.responseHandlers.has(messageId)) {
            this.responseHandlers.get(messageId)!(data);
            return;
        }

        // Check for stream data
        if (this.streamBuffers.has(messageId)) {
            const bufferInfo = this.streamBuffers.get(messageId)!;
            bufferInfo.buffer.push(data);
            return;
        }

        // Check for regular handlers
        const handlers = this.handlers.get(messageType);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }

        // Check for stream start
        const streamHandlers = this.streamHandlers.get(messageType);
        if (streamHandlers && data.messageId) {
            // Initialize stream for this message
            this.streamBuffers.set(data.messageId, { buffer: [] });
            
            // Create async generator for this stream
            const generator = this.createStreamGenerator(data.messageId);
            
            streamHandlers.forEach(handler => {
                try {
                    handler(generator);
                } catch (error) {
                    console.error('Error in stream handler:', error);
                }
            });
        }
    }

    private async *createStreamGenerator(messageId: string): AsyncGenerator<any, void, unknown> {
        const bufferInfo = this.streamBuffers.get(messageId);
        if (!bufferInfo) {
            throw new Error('Stream buffer not found');
        }

        let index = 0;
        let done = false;

        while (!done) {
            if (bufferInfo.buffer.length > index) {
                const chunks = bufferInfo.buffer.slice(index);
                index = bufferInfo.buffer.length;

                for (const chunk of chunks) {
                    if ('error' in chunk) {
                        throw new Error(chunk.error);
                    } else if (chunk.done) {
                        done = true;
                        if (chunk.content !== undefined) {
                            yield chunk.content;
                        }
                    } else {
                        yield chunk.content;
                    }
                }
            }

            if (!done) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        this.streamBuffers.delete(messageId);
    }
}