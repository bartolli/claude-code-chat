/**
 * Type declarations for webview environment
 */

declare global {
  interface Window {
    /** Add event listener for message events */
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    /** Remove event listener for message events */
    removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  }

  const window: Window | undefined;
}

export {};
