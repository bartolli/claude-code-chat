/**
 * Manages the webview content for React-based UI
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class WebviewManager {
    private static getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public static getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        isDevelopment: boolean = false
    ): string {
        // Get paths to resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'webview.js')
        );
        const vendorUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'vendor.js')
        );
        const reactUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'react.js')
        );

        // Generate nonce for Content Security Policy
        const nonce = WebviewManager.getNonce();

        // CSP source
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${cspSource} 'unsafe-inline';
        script-src ${cspSource} 'nonce-${nonce}';
        img-src ${cspSource} https: data:;
        font-src ${cspSource};
        connect-src ${cspSource};
    ">
    <title>Claude Code GUI</title>
    <style nonce="${nonce}">
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
        }
        
        #root {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        /* Initial loading state */
        .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .loading-container.fade-out {
            opacity: 0;
        }
        
        .loading-content {
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading-title {
            font-size: 18px;
            margin-bottom: 8px;
            color: var(--vscode-editor-foreground);
        }
        
        .loading-subtitle {
            font-size: 13px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading-container" id="loading">
            <div class="loading-content">
                <div class="loading-title">Claude Code GUI</div>
                <div class="loading-subtitle">Initializing interface...</div>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}">
        // Acquire VS Code API immediately
        const vscode = acquireVsCodeApi();
        
        // Make it available globally
        window.vscode = vscode;
        
        // Remove loading screen when React mounts
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const loading = document.getElementById('loading');
                if (loading) {
                    loading.classList.add('fade-out');
                    setTimeout(() => loading.remove(), 300);
                }
            }, 100);
        });
    </script>
    
    <!-- Load bundled scripts -->
    <script nonce="${nonce}" src="${vendorUri}"></script>
    <script nonce="${nonce}" src="${reactUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    public static getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
        return {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'out', 'webview'),
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'gui', 'public', 'fonts')
            ]
        };
    }
}