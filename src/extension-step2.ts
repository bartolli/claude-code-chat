import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import html from './ui';

const exec = util.promisify(cp.exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('STEP2: Claude Code Chat extension is being activated!');
    
    try {
        // Create a minimal provider without ServiceContainer
        const provider = new ClaudeChatProvider(context.extensionUri, context);

        const disposable = vscode.commands.registerCommand('claude-code-chat-modern.openChat', () => {
            console.log('STEP2: Command executed!');
            try {
                provider.show();
            } catch (error) {
                console.error('STEP2: Error showing provider:', error);
                vscode.window.showErrorMessage(`Failed to open Claude Chat: ${error}`);
            }
        });
        
        context.subscriptions.push(disposable);
        console.log('STEP2: Command registered successfully');
        
    } catch (error) {
        console.error('STEP2: Failed to activate:', error);
        vscode.window.showErrorMessage(`Failed to activate: ${error}`);
    }
}

export function deactivate() {
    console.log('STEP2: Deactivating');
}

// Minimal ClaudeChatProvider
class ClaudeChatProvider {
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        console.log('STEP2: ClaudeChatProvider created');
    }

    public show() {
        console.log('STEP2: show() called');
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

        console.log('STEP2: Webview panel created');

        // Use simple HTML for now
        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        console.log('STEP2: Webview setup complete');
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Claude Code Chat</title>
        </head>
        <body>
            <h1>Claude Code Chat - Step 2</h1>
            <p>Basic webview is working!</p>
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