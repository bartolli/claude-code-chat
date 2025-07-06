import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { DebugConsole } from './utils/debug-console';

const exec = util.promisify(cp.exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('STEP3: Claude Code GUI extension is being activated!');
    
    // Create output channel for debugging
    const outputChannel = vscode.window.createOutputChannel('Claude Code GUI');
    outputChannel.appendLine('[Activation] Claude Code GUI extension is being activated...');
    
    // Initialize debug console filtering in development mode
    if (context.extensionMode === vscode.ExtensionMode.Development) {
        const { Logger } = require('./core/Logger');
        const logger = Logger.getInstance(outputChannel);
        DebugConsole.initialize(logger, true);
        console.log('STEP3: Debug console filtering enabled');
    }
    
    try {
        // Try to load ServiceContainer with error handling
        let services: any = null;
        let logger: any = null;
        
        try {
            console.log('STEP3: Loading ServiceContainer...');
            outputChannel.appendLine('[Activation] Loading ServiceContainer...');
            const { ServiceContainer } = require('./core/ServiceContainer');
            const { SimpleStateManager } = require('./state/SimpleStateManager');
            
            services = ServiceContainer.getInstance();
            console.log('STEP3: ServiceContainer loaded successfully');
            outputChannel.appendLine('[Activation] ServiceContainer loaded successfully');
            
            // Initialize ServiceContainer with output channel
            services.initializeWithOutputChannel(outputChannel);
            
            // Initialize StateManager with context
            const stateManager = new SimpleStateManager(context);
            services.set('StateManager', stateManager);
            console.log('STEP3: StateManager initialized');
            outputChannel.appendLine('[Activation] StateManager initialized');
            
            // Try to get logger
            logger = services.get('Logger');
            console.log('STEP3: Logger retrieved successfully');
            outputChannel.appendLine('[Activation] Logger retrieved successfully');
        } catch (error) {
            console.error('STEP3: Failed to load ServiceContainer:', error);
            outputChannel.appendLine(`[Activation] Failed to load ServiceContainer: ${error}`);
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
            logger.info('Extension', 'Claude Code GUI extension activated');
        }
        
        // Load test utilities in debug mode
        if (context.extensionMode === vscode.ExtensionMode.Development) {
            console.log('STEP3: Loading test utilities for development mode...');
            outputChannel.appendLine('[Activation] Loading test utilities for development mode...');
            
            // Make ServiceContainer available globally for tests
            (global as any).serviceContainer = services;
            
            try {
                require('./test/abort-test-utils');
                console.log('STEP3: Test utilities loaded! Use abortTest.* in Debug Console');
                outputChannel.appendLine('[Activation] Test utilities loaded! Use abortTest.* in Debug Console');
            } catch (error) {
                console.error('STEP3: Failed to load test utilities:', error);
                outputChannel.appendLine(`[Activation] Failed to load test utilities: ${error}`);
            }
        }
        
    } catch (error) {
        console.error('STEP3: Failed to activate:', error);
        vscode.window.showErrorMessage(`Failed to activate: ${error}`);
    }
}

export async function deactivate() {
    console.log('STEP3: Deactivating');
    
    // Cleanup MCP client connections
    try {
        // Import is at the top, so we can use it directly
        const { mcpClientService } = await import('./services/McpClientService.js');
        await mcpClientService.disconnectAll();
        console.log('STEP3: MCP client connections cleaned up');
    } catch (error) {
        console.error('STEP3: Error cleaning up MCP connections:', error);
    }
}

// ClaudeChatProvider with optional ServiceContainer
class ClaudeChatProvider {
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _messageHandler: any | undefined;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private readonly _services?: any
    ) {
        console.log('STEP3: ClaudeChatProvider created, services available:', !!_services);
        
        // Create ExtensionMessageHandler once during construction
        if (this._services) {
            try {
                const { ExtensionMessageHandler } = require('./services/ExtensionMessageHandler');
                this._messageHandler = new ExtensionMessageHandler(this._context, this._services);
                console.log('STEP3: ExtensionMessageHandler created during construction');
            } catch (error) {
                console.error('STEP3: Failed to create ExtensionMessageHandler:', error);
            }
        }
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
            'Claude Code GUI',
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
        
        // Set up message handling
        this._setupMessageHandling();
        
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
            let processedHtml = htmlContent.replace(/\${cspSource}/g, cspSource);
            
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
            <title>Claude Code GUI</title>
        </head>
        <body>
            <h1>ServiceContainer issue detected.</h1>
            <p>Check the console for error details.</p>
        </body>
        </html>`;
    }

    private _setupMessageHandling() {
        console.log('STEP3: _setupMessageHandling called', {
            hasPanel: !!this._panel,
            hasServices: !!this._services
        });
        
        if (!this._panel || !this._services) {
            console.log('STEP3: Skipping message handling setup - missing panel or services');
            return;
        }

        // Import required modules
        const { SimpleWebviewProtocol } = require('./protocol/SimpleWebviewProtocol');
        
        // Create SimpleWebviewProtocol
        const webviewProtocol = new SimpleWebviewProtocol(this._panel.webview);
        
        // Use existing message handler or create one if needed
        if (!this._messageHandler && this._services) {
            const { ExtensionMessageHandler } = require('./services/ExtensionMessageHandler');
            this._messageHandler = new ExtensionMessageHandler(this._context, this._services);
            console.log('STEP3: Created ExtensionMessageHandler in setupMessageHandling');
        }
        
        if (this._messageHandler) {
            // Attach the webview protocol to the existing handler
            this._messageHandler.attach(webviewProtocol);
            console.log('STEP3: Attached webviewProtocol to existing ExtensionMessageHandler');
            
            // Set up protocol handler
            webviewProtocol.setHandler(async (type: any, data: any) => {
                return await this._messageHandler.handleMessage(type, data);
            });
        } else {
            console.error('STEP3: No ExtensionMessageHandler available!');
        }
        
        console.log('STEP3: Message handling set up');
        
        // Send initial configuration
        setTimeout(() => {
            // Get selected model from workspace state
            const selectedModel = this._context.workspaceState.get('selectedModel', 'sonnet');
            
            webviewProtocol.post('config/init', {
                models: [
                    { 
                        id: 'sonnet', 
                        name: 'Sonnet 4', 
                        description: 'Sonnet 4 for daily use'
                    },
                    { 
                        id: 'opus', 
                        name: 'Opus 4', 
                        description: 'Opus 4 for complex tasks · Reaches usage limits ~5x faster'
                    },
                    { 
                        id: 'default', 
                        name: 'Default Model', 
                        description: 'Opus 4 for up to 50% of usage limits, then use Sonnet 4'
                    }
                ],
                selectedModel: selectedModel,
                features: {
                    planMode: true,
                    thinkingMode: true,
                    costTracking: true
                }
            });
            
            webviewProtocol.post('status/ready', {
                version: '0.2.0',
                claudeAvailable: true
            });
        }, 1000);
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