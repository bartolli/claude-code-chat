import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('SIMPLE: Claude Code Chat extension is being activated!');
    
    // Register a simple command first
    const disposable = vscode.commands.registerCommand('claude-code-chat-modern.openChat', () => {
        console.log('SIMPLE: Command executed!');
        vscode.window.showInformationMessage('Claude Code Chat command works!');
    });
    
    context.subscriptions.push(disposable);
    
    console.log('SIMPLE: Command registered');
    
    // List all registered commands to verify
    vscode.commands.getCommands().then(commands => {
        const ourCommand = commands.find(cmd => cmd.includes('claude-code-chat-modern'));
        console.log('SIMPLE: Found our command?', ourCommand);
    });
}

export function deactivate() {
    console.log('SIMPLE: Deactivating');
}