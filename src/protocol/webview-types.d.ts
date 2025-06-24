/**
 * Type declarations for webview environment
 */

declare global {
    interface Window {
        addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
        removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    }

    const window: Window | undefined;
}

export {};