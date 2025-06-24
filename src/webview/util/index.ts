// Utility functions for the webview

export const getFontSize = (delta: number = 0): number => {
    // Get VS Code's font size or default to 13px
    const baseFontSize = parseInt(
        getComputedStyle(document.documentElement)
            .getPropertyValue('--vscode-font-size')
            ?.replace('px', '') || '13'
    );
    return baseFontSize + delta;
};

export const isMetaEquivalentKeyPressed = (event: KeyboardEvent): boolean => {
    // Check for Cmd on Mac or Ctrl on Windows/Linux
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? event.metaKey : event.ctrlKey;
};