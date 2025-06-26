// Test script to verify command registration
// Run this in the VS Code Debug Console when the extension is loaded

(async () => {
    try {
        // List all commands
        const allCommands = await vscode.commands.getCommands();
        
        // Filter for our extension commands
        const claudeCommands = allCommands.filter(cmd => 
            cmd.includes('claude-code-chat-modern')
        );
        
        console.log('Claude Code GUI Modern Commands:', claudeCommands);
        
        // Check if the main command is registered
        const mainCommand = 'claude-code-chat-modern.openChat';
        const isRegistered = claudeCommands.includes(mainCommand);
        
        console.log(`Command "${mainCommand}" registered:`, isRegistered);
        
        // Try to execute the command
        if (isRegistered) {
            console.log('Attempting to execute command...');
            await vscode.commands.executeCommand(mainCommand);
            console.log('Command executed successfully!');
        } else {
            console.log('Command not found in registered commands');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
})();