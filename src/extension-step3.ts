import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import html from './ui';

const exec = util.promisify(cp.exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('STEP3: Claude Code Chat extension is being activated!');
    
    try {
        // Try to load ServiceContainer with error handling
        let services: any = null;
        let logger: any = null;
        
        try {
            console.log('STEP3: Loading ServiceContainer...');
            const { ServiceContainer } = require('./core/ServiceContainer');
            services = ServiceContainer.getInstance();
            console.log('STEP3: ServiceContainer loaded successfully');
            
            // Try to get logger
            logger = services.get('Logger');
            console.log('STEP3: Logger retrieved successfully');
        } catch (error) {
            console.error('STEP3: Failed to load ServiceContainer:', error);
            // Continue without it
        }

        // Create provider - pass services only if available
        const provider = new ClaudeChatProvider(context.extensionUri, context, services);

        const disposable = vscode.commands.registerCommand('claude-code-chat-modern.openChat', () => {
            console.log('STEP3: Command executed!');
            try {
                provider.show();
            } catch (error) {
                console.error('STEP3: Error showing provider:', error);
                vscode.window.showErrorMessage(`Failed to open Claude Chat: ${error}`);
            }
        });
        
        context.subscriptions.push(disposable);
        console.log('STEP3: Command registered successfully');
        
        // If we have logger, use it
        if (logger) {
            logger.info('Extension', 'Claude Code Chat extension activated');
        }
        
    } catch (error) {
        console.error('STEP3: Failed to activate:', error);
        vscode.window.showErrorMessage(`Failed to activate: ${error}`);
    }
}

export function deactivate() {
    console.log('STEP3: Deactivating');
}

// ClaudeChatProvider with optional ServiceContainer
class ClaudeChatProvider {
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private readonly _services?: any
    ) {
        console.log('STEP3: ClaudeChatProvider created, services available:', !!_services);
    }

    public show() {
        console.log('STEP3: show() called');
        const column = vscode.ViewColumn.Two;

        if (this._panel) {
            this._panel.reveal(column);
            return;
        }

        this._panel = vscode.window.createWebviewPanel(
            'claudeChat',
            'Claude Code Chat',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        console.log('STEP3: Webview panel created');

        // Try to use the React webview if available
        try {
            this._panel.webview.html = this._getHtmlForWebview();
        } catch (error) {
            console.error('STEP3: Failed to load webview HTML:', error);
            // Fallback to simple HTML
            this._panel.webview.html = this._getSimpleHtml();
        }

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        console.log('STEP3: Webview setup complete');
    }

    private _getHtmlForWebview(): string {
        const webview = this._panel!.webview;
        const extensionUri = this._extensionUri;

        // Path to the built webview HTML
        const htmlPath = vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'index.html');
        
        try {
            // Read the webpack-built HTML file
            const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
            
            // Get the webview's CSP source
            const cspSource = webview.cspSource;
            
            // Replace CSP placeholder with actual CSP source
            let processedHtml = htmlContent.replace(/<%= cspSource %>/g, cspSource);
            
            // Replace resource URIs with webview URIs
            // Handle script tags
            processedHtml = processedHtml.replace(
                /src="([^"]+\.js)"/g,
                (_match, p1) => {
                    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', p1));
                    return `src="${scriptUri}"`;
                }
            );
            
            // Handle link tags (CSS)
            processedHtml = processedHtml.replace(
                /href="([^"]+\.css)"/g,
                (_match, p1) => {
                    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview', p1));
                    return `href="${cssUri}"`;
                }
            );
            
            console.log('STEP3: Webview HTML processed successfully');
            return processedHtml;
            
        } catch (error) {
            console.error('STEP3: Failed to load webview HTML:', error);
            throw error;
        }
    }

    private _getSimpleHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Claude Code Chat</title>
        </head>
        <body>
            <h1>Claude Code Chat - Step 3</h1>
            <p>ServiceContainer issue detected. Using fallback UI.</p>
            <p>Check the console for error details.</p>
        </body>
        </html>`;
    }

    public dispose() {
        this._panel = undefined;
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}