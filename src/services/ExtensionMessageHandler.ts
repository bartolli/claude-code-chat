import * as vscode from 'vscode';
import * as cp from 'child_process';
import { ServiceContainer } from '../core/ServiceContainer';
import { Logger } from '../core/Logger';
import { SimpleWebviewProtocol } from '../protocol/SimpleWebviewProtocol';
import { FromWebviewMessageType, FromWebviewProtocol } from '../protocol/types';
import { StreamProcessor } from './StreamProcessor';
import { ChunkedJSONParser } from './ChunkedJSONParser';
import { ClaudeStreamMessage } from '../types/claude';
import { Readable } from 'stream';

/**
 * Simplified ExtensionMessageHandler for compilation
 */
export class ExtensionMessageHandler {
    private logger: Logger;
    private outputChannel: vscode.OutputChannel;
    private webviewProtocol: SimpleWebviewProtocol | null = null;
    private streamProcessor: StreamProcessor;
    private jsonParser: ChunkedJSONParser;
    private currentSessionId: string | null = null;
    private currentClaudeProcess: cp.ChildProcess | null = null;
    private pendingPermissionResponses: Map<string, (response: string) => void> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private serviceContainer: ServiceContainer
    ) {
        this.logger = serviceContainer.get('Logger') as Logger;
        this.streamProcessor = serviceContainer.get('StreamProcessor') as StreamProcessor;
        this.jsonParser = serviceContainer.get('ChunkedJSONParser') as ChunkedJSONParser;
        
        // Get or create output channel
        try {
            this.outputChannel = serviceContainer.get('OutputChannel') as vscode.OutputChannel;
        } catch {
            this.outputChannel = vscode.window.createOutputChannel('Claude Code GUI');
        }
    }

    public attach(webviewProtocol: SimpleWebviewProtocol): void {
        this.webviewProtocol = webviewProtocol;
    }

    public async handleMessage<T extends FromWebviewMessageType>(
        type: T,
        data: FromWebviewProtocol[T][0]
    ): Promise<FromWebviewProtocol[T][1]> {
        this.logger.info('ExtensionMessageHandler', `Handling message: ${type}`);

        // Handle messages
        switch (type) {
            case 'chat/sendMessage':
                this.logger.info('ExtensionMessageHandler', 'Sending message to Claude', data);
                await this.handleChatMessage(data as any);
                return undefined as any;
            
            case 'chat/newSession':
                this.logger.info('ExtensionMessageHandler', 'New session requested');
                this.currentSessionId = null;
                this.outputChannel.appendLine(`[DEBUG] Session cleared - next message will start new session`);
                return undefined as any;
            
            case 'settings/get':
                // Return current settings
                return {
                    selectedModel: this.context.workspaceState.get('selectedModel', 'default'),
                    autoSave: this.context.workspaceState.get('autoSave', true),
                    gitBackup: this.context.workspaceState.get('gitBackup', false)
                } as any;
                
            case 'settings/update':
                // Update settings
                const settings = data as any;
                if (settings.selectedModel) {
                    await this.context.workspaceState.update('selectedModel', settings.selectedModel);
                }
                return {} as any;
                
            case 'settings/selectModel':
                // Update selected model
                const { modelId } = data as any;
                await this.context.workspaceState.update('selectedModel', modelId);
                this.logger.info('ExtensionMessageHandler', 'Model selected', { modelId });
                return {} as any;
                
            case 'conversation/getList':
                // Return empty conversation list for now
                this.logger.info('ExtensionMessageHandler', 'Getting conversation list');
                return {
                    conversations: []
                } as any;
            
            case 'permission/response':
                // Handle permission response
                const permissionData = data as any;
                this.logger.info('ExtensionMessageHandler', 'Permission response', permissionData);
                this.handlePermissionResponse(permissionData);
                return undefined as any;
            
            default:
                this.logger.warn('ExtensionMessageHandler', `Unhandled message type: ${type}`);
                return undefined as any;
        }
    }

    private async handleChatMessage(data: { text: string; planMode?: boolean; thinkingMode?: boolean }) {
        try {
            this.logger.info('ExtensionMessageHandler', 'Received chat message', data);
            this.outputChannel.appendLine('\n========== NEW CHAT MESSAGE ==========');
            this.outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
            this.outputChannel.appendLine(`User message: ${data.text}`);
            this.outputChannel.show(true); // Show output panel with focus
            
            // Make sure output channel is visible
            // Use the correct command for focusing on output panel
            vscode.commands.executeCommand('workbench.panel.output.focus');
            
            // Check if this is a slash command
            const isSlashCommand = data.text.trim().startsWith('/');
            if (isSlashCommand) {
                this.outputChannel.appendLine(`[DEBUG] Detected slash command: ${data.text}`);
                this.handleSlashCommand(data.text.trim());
                return;
            }
            
            // Get selected model
            const selectedModel = this.context.workspaceState.get<string>('selectedModel', 'sonnet');
            this.outputChannel.appendLine(`Selected model: ${selectedModel}`);
            
            // Send user message to UI
            if (this.webviewProtocol) {
                this.webviewProtocol.post('message/add', {
                    role: 'user',
                    content: data.text
                });
                this.outputChannel.appendLine(`[DEBUG] Sent user message to UI`);
                
                // Set processing status to true
                this.webviewProtocol.post('status/processing', true);
                this.outputChannel.appendLine(`[DEBUG] Set processing status to true`);
            } else {
                this.outputChannel.appendLine(`[ERROR] WebviewProtocol not initialized!`);
                throw new Error('WebviewProtocol not initialized');
            }
            
            // Get workspace folder for cwd
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
            
            // Build Claude CLI arguments
            // Use -p flag without message (will send via stdin)
            // IMPORTANT: --verbose is required when using --output-format stream-json with -p
            const args = ['-p'];
            
            // If we have an existing session, use --resume
            if (this.currentSessionId) {
                args.push('--resume', this.currentSessionId);
                this.outputChannel.appendLine(`[DEBUG] Resuming session: ${this.currentSessionId}`);
            } else {
                this.outputChannel.appendLine(`[DEBUG] Starting new session`);
            }
            
            args.push('--output-format', 'stream-json', '--verbose');
            
            // Skip permission prompts to avoid blocking the process
            args.push('--dangerously-skip-permissions');
            
            // Note: When using stdin, -p should not have the prompt as argument
            
            // Check if we have an API key for programmatic access
            const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
            if (!hasApiKey) {
                this.logger.info('ExtensionMessageHandler', 'No ANTHROPIC_API_KEY found, will use interactive Claude CLI (requires Pro/Team subscription)');
                this.outputChannel.appendLine('No ANTHROPIC_API_KEY in environment');
                // For interactive mode, we might need to check if the user is logged in
            } else {
                this.logger.info('ExtensionMessageHandler', 'Using API key for programmatic access');
                this.outputChannel.appendLine('Found ANTHROPIC_API_KEY in environment');
            }
            
            // Also check VS Code configuration for API key
            const config = vscode.workspace.getConfiguration('claudeCodeChatModern');
            const apiKey = config.get<string>('apiKey') || process.env.ANTHROPIC_API_KEY;
            this.outputChannel.appendLine(`API key configured: ${apiKey ? 'Yes' : 'No'}`);
            
            // Add model if not default
            if (selectedModel && selectedModel !== 'default') {
                args.push('--model', selectedModel as string);
            }
            
            // Log the full command for debugging
            const fullCommand = `claude ${args.join(' ')}`;
            this.logger.info('ExtensionMessageHandler', `Running command: ${fullCommand}`);
            this.outputChannel.appendLine(`\nExecuting command: ${fullCommand}`);
            this.outputChannel.appendLine(`Working directory: ${cwd}`);
            
            // Setup process environment
            const processEnv: any = { 
                ...process.env,
                FORCE_COLOR: '0', 
                NO_COLOR: '1'
            };
            
            // Add API key if available
            if (apiKey) {
                processEnv.ANTHROPIC_API_KEY = apiKey;
            }
            
            // First, let's verify Claude CLI is available and working
            this.outputChannel.appendLine('\n[DEBUG] Verifying Claude CLI...');
            try {
                const versionCheck = cp.execSync('claude --version', { 
                    encoding: 'utf8',
                    env: processEnv
                });
                this.outputChannel.appendLine(`[DEBUG] Claude version: ${versionCheck.trim()}`);
                
                // Try a simple test command to ensure claude works
                try {
                    this.outputChannel.appendLine(`[DEBUG] Testing claude with simple command...`);
                    // First try the exact command format the SDK docs show
                    const testCommand = 'claude -p "Say hello" --output-format json';
                    this.outputChannel.appendLine(`[DEBUG] Test command: ${testCommand}`);
                    const testResult = cp.execSync(testCommand, { 
                        encoding: 'utf8',
                        env: processEnv,
                        timeout: 30000  // 30 seconds timeout
                    });
                    this.outputChannel.appendLine(`[DEBUG] Test command succeeded`);
                    this.outputChannel.appendLine(`[DEBUG] Test output: ${testResult.substring(0, 200)}...`);
                } catch (testError: any) {
                    this.outputChannel.appendLine(`[ERROR] Test command failed: ${testError.message}`);
                    if (testError.stdout) {
                        this.outputChannel.appendLine(`[ERROR] Test stdout: ${testError.stdout}`);
                    }
                    if (testError.stderr) {
                        this.outputChannel.appendLine(`[ERROR] Test stderr: ${testError.stderr}`);
                    }
                    
                    // Try the old --chat format as fallback
                    try {
                        this.outputChannel.appendLine(`[DEBUG] Trying fallback --chat format...`);
                        const fallbackResult = cp.execSync('echo "test" | claude --chat --output-format json', { 
                            encoding: 'utf8',
                            env: processEnv,
                            timeout: 10000
                        });
                        this.outputChannel.appendLine(`[DEBUG] Fallback command succeeded - using --chat mode`);
                        this.outputChannel.appendLine(`[DEBUG] Fallback output: ${fallbackResult.substring(0, 200)}...`);
                        // If this works, we should use --chat mode
                        args[0] = '--chat';
                        args.splice(1, 0, '--dir', cwd);
                    } catch (fallbackError: any) {
                        this.outputChannel.appendLine(`[ERROR] Fallback also failed: ${fallbackError.message}`);
                    }
                    
                    if (!apiKey && (testError.message.includes('not authenticated') || testError.message.includes('login'))) {
                        this.webviewProtocol?.post('error/show', {
                            message: 'Please authenticate with Claude by running "claude login" in your terminal, or set the ANTHROPIC_API_KEY environment variable.'
                        });
                        return;
                    }
                }
            } catch (error: any) {
                this.outputChannel.appendLine(`[ERROR] Claude CLI check failed: ${error.message}`);
                this.webviewProtocol?.post('error/show', {
                    message: 'Claude CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code'
                });
                return;
            }
            
            // Debug: show exact spawn parameters
            this.outputChannel.appendLine(`\n[DEBUG] === SPAWN PARAMETERS ===`);
            this.outputChannel.appendLine(`[DEBUG] Command: claude`);
            this.outputChannel.appendLine(`[DEBUG] Args: ${JSON.stringify(args)}`);
            this.outputChannel.appendLine(`[DEBUG] CWD: ${cwd}`);
            this.outputChannel.appendLine(`[DEBUG] ANTHROPIC_API_KEY: ${processEnv.ANTHROPIC_API_KEY ? 'Set' : 'Not set'}`);
            this.outputChannel.appendLine(`[DEBUG] PATH: ${processEnv.PATH}`);
            this.outputChannel.appendLine(`[DEBUG] NODE_PATH: ${processEnv.NODE_PATH || 'Not set'}`);
            
            // Try to find claude in PATH
            let claudePath = 'claude';
            try {
                const whichResult = cp.execSync('which claude', { encoding: 'utf8', env: processEnv });
                claudePath = whichResult.trim();
                this.outputChannel.appendLine(`[DEBUG] Claude binary found at: ${claudePath}`);
            } catch (e) {
                this.outputChannel.appendLine(`[DEBUG] Could not find claude in PATH`);
                // Try common locations
                const commonPaths = [
                    '/usr/local/bin/claude',
                    '/opt/homebrew/bin/claude',
                    `${process.env.HOME}/.nvm/versions/node/v22.15.0/bin/claude`
                ];
                for (const path of commonPaths) {
                    try {
                        cp.execFileSync(path, ['--version']);
                        claudePath = path;
                        this.outputChannel.appendLine(`[DEBUG] Found claude at: ${path}`);
                        break;
                    } catch {}
                }
            }
            
            // Use simple spawn like the original extension
            const claudeProcess = cp.spawn(claudePath, args, {
                cwd: cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: processEnv
            });
            
            // Store the current process for permission handling
            this.currentClaudeProcess = claudeProcess;
            
            this.outputChannel.appendLine(`[Process] Spawned with PID: ${claudeProcess.pid}`);
            this.outputChannel.appendLine(`[Process] Connected: ${claudeProcess.connected}`);
            
            // Add timeout to detect hanging process (10 minutes for long operations)
            const PROCESS_TIMEOUT_MS = 600000; // 10 minutes
            let lastActivityTime = Date.now();
            
            const timeout = setTimeout(() => {
                const inactiveTime = Date.now() - lastActivityTime;
                this.outputChannel.appendLine(`[WARNING] Process timeout after ${PROCESS_TIMEOUT_MS/1000} seconds (inactive for ${inactiveTime/1000}s)`);
                if (claudeProcess.killed === false) {
                    this.outputChannel.appendLine(`[WARNING] Killing hanging process`);
                    claudeProcess.kill();
                    this.webviewProtocol?.post('error/show', {
                        message: 'Claude process timed out after 10 minutes. This might indicate an authentication issue or the CLI is waiting for input.'
                    });
                }
            }, PROCESS_TIMEOUT_MS);
            
            // Handle spawn event
            claudeProcess.on('spawn', () => {
                this.outputChannel.appendLine(`[Process] Successfully spawned`);
            });
            
            // Handle errors
            claudeProcess.on('error', (error) => {
                clearTimeout(timeout);
                this.logger.error('ExtensionMessageHandler', 'Failed to spawn claude', error);
                this.outputChannel.appendLine(`[ERROR] Failed to spawn: ${error.message}`);
                this.outputChannel.appendLine(`[ERROR] Error code: ${(error as any).code}`);
                this.outputChannel.appendLine(`[ERROR] Error path: ${(error as any).path}`);
                this.webviewProtocol?.post('error/show', {
                    message: `Failed to start Claude: ${error.message}. Make sure Claude CLI is installed and available in PATH.`
                });
            });
            
            // Set encoding for stderr
            claudeProcess.stderr?.setEncoding('utf8');
            
            // Capture stderr for debugging and permission prompts
            let stderrData = '';
            claudeProcess.stderr?.on('data', (chunk) => {
                receivedData = true;
                lastActivityTime = Date.now(); // Update activity time
                const chunkStr = chunk.toString();
                stderrData += chunkStr;
                this.logger.error('ExtensionMessageHandler', 'Claude stderr:', chunkStr);
                this.outputChannel.appendLine(`[STDERR] ${chunkStr.trim()}`);
                
                // Check if this is a permission prompt
                // Claude might output something like "Allow Bash command? (y/n)"
                if (chunkStr.includes('Allow') && chunkStr.includes('(y/n)')) {
                    this.outputChannel.appendLine(`[Permission] Detected permission prompt in stderr`);
                    // Extract tool name from prompt
                    const match = chunkStr.match(/Allow (\w+).*\?/);
                    const toolName = match ? match[1] : 'unknown';
                    
                    // Send permission request to UI
                    this.webviewProtocol?.post('permission/request', {
                        toolName: toolName,
                        toolId: `perm_${Date.now()}`,
                        toolInput: chunkStr
                    });
                }
            });
            
            // Add event listeners before processing stream
            claudeProcess.stdout?.on('readable', () => {
                const data = claudeProcess.stdout?.read();
                if (data) {
                    this.outputChannel.appendLine(`[DEBUG] Readable event - data available: ${data.length} bytes`);
                }
            });
            
            claudeProcess.stdout?.on('end', () => {
                this.outputChannel.appendLine(`[DEBUG] Stdout stream ended`);
            });
            
            claudeProcess.stdout?.on('close', () => {
                this.outputChannel.appendLine(`[DEBUG] Stdout stream closed`);
            });
            
            // Check if process is still running after a short delay
            setTimeout(() => {
                if (!receivedData && claudeProcess.exitCode === null) {
                    this.outputChannel.appendLine(`[WARNING] No data received after 2 seconds`);
                    this.outputChannel.appendLine(`[WARNING] Process still running: ${!claudeProcess.killed}`);
                    this.outputChannel.appendLine(`[WARNING] Exit code: ${claudeProcess.exitCode}`);
                    this.outputChannel.appendLine(`[WARNING] PID: ${claudeProcess.pid}`);
                    
                    // Check process state
                    if (claudeProcess.stdout) {
                        this.outputChannel.appendLine(`[WARNING] Stdout readable: ${claudeProcess.stdout.readable}`);
                        this.outputChannel.appendLine(`[WARNING] Stdout destroyed: ${claudeProcess.stdout.destroyed}`);
                    }
                }
            }, 2000);
            
            // Send message via stdin like the original extension
            this.outputChannel.appendLine(`[DEBUG] Sending message via stdin`);
            if (claudeProcess.stdin) {
                claudeProcess.stdin.write(data.text + '\n');
                claudeProcess.stdin.end();
                this.outputChannel.appendLine(`[DEBUG] Message sent and stdin closed`);
            } else {
                this.outputChannel.appendLine(`[ERROR] No stdin available`);
                this.webviewProtocol?.post('error/show', {
                    message: 'Failed to communicate with Claude: no stdin available'
                });
                return;
            }
            
            // Add stdin event handlers
            claudeProcess.stdin.on('error', (error) => {
                this.outputChannel.appendLine(`[STDIN ERROR] ${error.message}`);
            });
            
            claudeProcess.stdin.on('finish', () => {
                this.outputChannel.appendLine(`[DEBUG] Stdin finished`);
            });
            
            // Process output using direct stream handling for now
            let assistantContent = '';
            let isStreaming = false;
            let messageId: string | undefined;
            let sessionId: string | undefined;
            let totalCost: number = 0;
            let apiKeySource: string | undefined;
            
            // Set encoding for stdout
            claudeProcess.stdout?.setEncoding('utf8');
            
            // Track if we've received any data
            let receivedData = false;
            let jsonBuffer = '';
            
            // Process output stream
            if (claudeProcess.stdout) {
                this.outputChannel.appendLine(`[DEBUG] Setting up stdout processing`);
                
                // Direct stream handling with data event
                claudeProcess.stdout.on('data', (chunk: string) => {
                    receivedData = true;
                    lastActivityTime = Date.now(); // Update activity time
                    this.outputChannel.appendLine(`[DEBUG] Received chunk: ${chunk.length} chars`);
                    
                    jsonBuffer += chunk;
                    const lines = jsonBuffer.split('\n');
                    jsonBuffer = lines.pop() || ''; // Keep incomplete line
                    
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const json = JSON.parse(line);
                                this.outputChannel.appendLine(`[DEBUG] Parsed JSON type: ${json.type}`);
                                
                                // Process the JSON message
                                const streamingState = { isStreaming };
                                this.processClaudeStreamMessage(json, (content) => {
                                    assistantContent += content;
                                    this.outputChannel.appendLine(`[DEBUG] webviewProtocol status: ${this.webviewProtocol ? 'available' : 'NULL'}`);
                                    
                                    if (!streamingState.isStreaming) {
                                        streamingState.isStreaming = true;
                                        isStreaming = true;
                                        if (this.webviewProtocol) {
                                            this.outputChannel.appendLine(`[DEBUG] Sending message/add for assistant`);
                                            this.webviewProtocol.post('message/add', {
                                                role: 'assistant',
                                                content: assistantContent
                                            });
                                        } else {
                                            this.outputChannel.appendLine(`[ERROR] Cannot send message/add - webviewProtocol is NULL`);
                                        }
                                    } else {
                                        if (this.webviewProtocol) {
                                            this.outputChannel.appendLine(`[DEBUG] Sending message/update`);
                                            this.webviewProtocol.post('message/update', {
                                                role: 'assistant',
                                                content: assistantContent
                                            });
                                        } else {
                                            this.outputChannel.appendLine(`[ERROR] Cannot send message/update - webviewProtocol is NULL`);
                                        }
                                    }
                                }, (metadata) => {
                                    if (metadata.sessionId) sessionId = metadata.sessionId;
                                    if (metadata.messageId) messageId = metadata.messageId;
                                    if (metadata.totalCost !== undefined) totalCost = metadata.totalCost;
                                    if (metadata.apiKeySource) apiKeySource = metadata.apiKeySource;
                                }, streamingState);
                                isStreaming = streamingState.isStreaming;
                            } catch (error) {
                                this.outputChannel.appendLine(`[DEBUG] Failed to parse JSON line: ${line}`);
                            }
                        }
                    }
                });
                
                claudeProcess.stdout.on('end', () => {
                    this.outputChannel.appendLine(`[DEBUG] Stream ended`);
                    // Process any remaining buffer
                    if (jsonBuffer.trim()) {
                        try {
                            const json = JSON.parse(jsonBuffer);
                            this.processClaudeStreamMessage(json, () => {}, () => {}, { isStreaming: true });
                        } catch (error) {
                            this.outputChannel.appendLine(`[DEBUG] Failed to parse remaining buffer: ${jsonBuffer}`);
                        }
                    }
                });
                
                claudeProcess.stdout.on('error', (error) => {
                    this.outputChannel.appendLine(`[ERROR] Stdout error: ${error.message}`);
                });
            } else {
                this.outputChannel.appendLine(`[ERROR] No stdout stream available`);
            }
            
            // Handle process exit
            claudeProcess.on('exit', (code, signal) => {
                clearTimeout(timeout);
                this.outputChannel.appendLine(`\n[Process Exit] Code: ${code}, Signal: ${signal}`);
                if (code !== 0) {
                    this.logger.error('ExtensionMessageHandler', `Claude process exited with code: ${code}`);
                    this.outputChannel.appendLine(`[ERROR] Process failed with exit code ${code}`);
                    if (stderrData) {
                        this.logger.error('ExtensionMessageHandler', `Claude stderr output: ${stderrData}`);
                        
                        // Check for common error patterns
                        if (stderrData.includes('Invalid API key') || stderrData.includes('ANTHROPIC_API_KEY')) {
                            this.webviewProtocol?.post('error/show', {
                                message: 'Invalid or missing API key. Either set ANTHROPIC_API_KEY environment variable or ensure you have an active Claude Pro/Team subscription.'
                            });
                        } else if (stderrData.includes('not authenticated') || stderrData.includes('login')) {
                            this.webviewProtocol?.post('error/show', {
                                message: 'Not authenticated. Please run "claude login" in your terminal to authenticate with your Claude Pro/Team account.'
                            });
                        } else {
                            this.webviewProtocol?.post('error/show', {
                                message: `Claude error: ${stderrData}`
                            });
                        }
                    } else {
                        this.webviewProtocol?.post('error/show', {
                            message: `Claude exited with code ${code}. Please ensure Claude CLI is installed and you either have ANTHROPIC_API_KEY set or are logged in with "claude login".`
                        });
                    }
                } else {
                    // Success case
                    this.outputChannel.appendLine(`[SUCCESS] Claude process completed successfully`);
                    if (!receivedData) {
                        this.outputChannel.appendLine(`[WARNING] No data was received from Claude`);
                    }
                }
                // Always send completion message and set processing to false
                this.webviewProtocol?.post('chat/messageComplete', {});
                this.webviewProtocol?.post('status/processing', false);
                this.outputChannel.appendLine(`[DEBUG] Set processing status to false`);
            });
            
        } catch (error: any) {
            this.logger.error('ExtensionMessageHandler', 'Error handling chat message', error);
            this.webviewProtocol?.post('error/show', {
                message: `Failed to send message: ${error.message || error}`
            });
            // Set processing to false on error
            this.webviewProtocol?.post('status/processing', false);
        }
    }
    
    private processClaudeStreamMessage(
        json: any, 
        onContent: (content: string) => void,
        onMetadata: (metadata: {
            sessionId?: string;
            messageId?: string;
            totalCost?: number;
            apiKeySource?: string;
        }) => void,
        streamingState: { isStreaming: boolean }
    ) {
        // Handle different message types from Claude Code SDK stream-json format
        this.logger.debug('ExtensionMessageHandler', 'Processing stream JSON', { type: json.type });
        this.outputChannel.appendLine(`[JSON] Type: ${json.type}`);
        
        switch (json.type) {
            case 'system':
                if (json.subtype === 'init') {
                    this.outputChannel.appendLine(`[JSON] System init - Model: ${json.model}, Session: ${json.session_id}`);
                    // Store the session ID for future messages
                    if (json.session_id) {
                        this.currentSessionId = json.session_id;
                        this.outputChannel.appendLine(`[DEBUG] Stored session ID: ${this.currentSessionId}`);
                    }
                    onMetadata({
                        sessionId: json.session_id,
                        apiKeySource: json.apiKeySource
                    });
                }
                break;
                
            case 'assistant':
                this.outputChannel.appendLine(`[JSON] Assistant message received`);
                
                // Ensure we have an assistant message to attach tools/thinking to
                if (!streamingState.isStreaming && json.message?.content) {
                    streamingState.isStreaming = true;
                    this.outputChannel.appendLine(`[DEBUG] Creating initial assistant message`);
                    this.webviewProtocol?.post('message/add', {
                        role: 'assistant',
                        content: ''
                    });
                }
                
                // Handle assistant messages from SDK format
                if (json.message?.content) {
                    if (Array.isArray(json.message.content)) {
                        // Handle content blocks
                        for (const block of json.message.content) {
                            if (block.type === 'text' && block.text) {
                                this.outputChannel.appendLine(`[JSON] Text content: ${block.text.substring(0, 50)}...`);
                                this.outputChannel.appendLine(`[DEBUG] Calling onContent callback with text`);
                                onContent(block.text);
                            } else if (block.type === 'thinking' && block.thinking) {
                                this.outputChannel.appendLine(`[JSON] Thinking content: ${block.thinking.substring(0, 50)}...`);
                                // Send thinking update to UI
                                this.webviewProtocol?.post('message/thinking', {
                                    content: block.thinking,
                                    isActive: true
                                });
                            } else if (block.type === 'tool_use') {
                                this.outputChannel.appendLine(`[JSON] Tool use: ${block.name} with id: ${block.id}`);
                                // Send tool use update to UI
                                this.webviewProtocol?.post('message/toolUse', {
                                    toolName: block.name,
                                    toolId: block.id,
                                    input: block.input,
                                    status: 'calling'
                                });
                            }
                        }
                    } else if (typeof json.message.content === 'string') {
                        this.outputChannel.appendLine(`[JSON] String content: ${json.message.content.substring(0, 50)}...`);
                        onContent(json.message.content);
                    }
                }
                if (json.message?.id) {
                    onMetadata({ messageId: json.message.id });
                }
                break;
                
            case 'user':
                // User messages - check for tool results
                this.outputChannel.appendLine(`[JSON] User message`);
                if (json.message?.content && Array.isArray(json.message.content)) {
                    for (const block of json.message.content) {
                        if (block.type === 'tool_result' && block.tool_use_id) {
                            this.outputChannel.appendLine(`[JSON] Tool result for: ${block.tool_use_id}`);
                            
                            // Extract text from MCP tool result content array
                            let resultText = block.text;
                            if (!resultText && Array.isArray(block.content)) {
                                // Handle MCP tool results with content array
                                const textContent = block.content.find((c: any) => c.type === 'text');
                                resultText = textContent?.text || JSON.stringify(block.content);
                                this.outputChannel.appendLine(`[JSON] Extracted MCP result text: ${resultText?.substring(0, 100)}...`);
                            } else if (!resultText && block.content) {
                                // Handle native tool results
                                resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                            }
                            
                            // Send tool result update to UI
                            this.webviewProtocol?.post('message/toolResult', {
                                toolId: block.tool_use_id,
                                result: resultText,
                                isError: block.is_error,
                                status: 'complete'
                            });
                        }
                    }
                }
                break;
                
            case 'result':
                this.outputChannel.appendLine(`[JSON] Result - Success: ${!json.is_error}, Cost: $${json.total_cost_usd}`);
                onMetadata({ totalCost: json.total_cost_usd });
                
                if (json.is_error && json.subtype) {
                    this.webviewProtocol?.post('error/show', {
                        message: `Claude error: ${json.subtype}`
                    });
                }
                
                // Send completion message
                this.webviewProtocol?.post('chat/messageComplete', {
                    sessionId: json.session_id,
                    totalCost: json.total_cost_usd,
                    duration: json.duration_ms
                });
                break;
                
            default:
                this.outputChannel.appendLine(`[JSON] Unknown type: ${json.type}`);
                this.logger.debug('ExtensionMessageHandler', 'Unknown message type', { type: json.type, json });
        }
    }

    /**
     * Check if a tool requires permission
     */
    private toolNeedsPermission(toolName: string): boolean {
        // Tools that typically require permission
        const permissionRequiredTools = [
            'Bash',
            'Write',
            'Edit',
            'MultiEdit',
            'git',
            'npm',
            'yarn'
        ];
        
        return permissionRequiredTools.includes(toolName);
    }

    /**
     * Handle permission response from UI
     */
    private handlePermissionResponse(data: {
        toolId: string;
        approved: boolean;
        toolName: string;
    }): void {
        this.outputChannel.appendLine(`[Permission] User ${data.approved ? 'APPROVED' : 'DENIED'} ${data.toolName} (${data.toolId})`);
        
        // If Claude is waiting for permission input, send the response
        if (this.currentClaudeProcess && this.currentClaudeProcess.stdin) {
            const response = data.approved ? 'y\n' : 'n\n';
            this.currentClaudeProcess.stdin.write(response);
            this.outputChannel.appendLine(`[Permission] Sent response to Claude: ${response.trim()}`);
        }
        
        // If we have a pending promise for this permission, resolve it
        const resolver = this.pendingPermissionResponses.get(data.toolId);
        if (resolver) {
            resolver(data.approved ? 'approved' : 'denied');
            this.pendingPermissionResponses.delete(data.toolId);
        }
    }

    /**
     * Process Claude stream using StreamProcessor service
     */
    private async processStreamWithStreamProcessor(
        stream: Readable,
        onContent: (content: string) => void,
        onMetadata: (metadata: {
            sessionId?: string;
            messageId?: string;
            totalCost?: number;
            apiKeySource?: string;
        }) => void
    ): Promise<void> {
        try {
            this.outputChannel.appendLine('\n[StreamProcessor] Starting stream processing');
            this.outputChannel.appendLine(`[StreamProcessor] Stream readable: ${stream.readable}`);
            this.outputChannel.appendLine(`[StreamProcessor] Stream destroyed: ${stream.destroyed}`);
            
            // Process stream using the StreamProcessor
            const chunks = this.streamProcessor.processClaudeStream(stream);
            this.outputChannel.appendLine('[StreamProcessor] Created async generator');
            
            let chunkCount = 0;
            for await (const chunk of chunks) {
                chunkCount++;
                this.outputChannel.appendLine(`[StreamProcessor] Processing chunk #${chunkCount}`);
                const json = chunk.data;
                
                // Log all messages for debugging
                this.outputChannel.appendLine(`[StreamProcessor] Message type: ${json.type}`);
                this.outputChannel.appendLine(`[StreamProcessor] Raw JSON: ${JSON.stringify(json, null, 2)}`);
                
                switch (json.type) {
                    case 'system':
                        if (json.subtype === 'init') {
                            this.outputChannel.appendLine('[StreamProcessor] System init message received');
                            this.outputChannel.appendLine(`  - Model: ${json.model}`);
                            this.outputChannel.appendLine(`  - Session ID: ${json.session_id}`);
                            this.outputChannel.appendLine(`  - API Key Source: ${json.apiKeySource}`);
                            this.outputChannel.appendLine(`  - Tools: ${json.tools?.join(', ')}`);
                            
                            onMetadata({
                                sessionId: json.session_id,
                                apiKeySource: json.apiKeySource
                            });
                        }
                        break;
                        
                    case 'assistant':
                        this.outputChannel.appendLine('[StreamProcessor] Assistant message received');
                        this.outputChannel.appendLine(`  - Message ID: ${json.message?.id}`);
                        this.outputChannel.appendLine(`  - Model: ${json.message?.model}`);
                        
                        // Extract content from assistant messages
                        if (json.message?.content) {
                            if (Array.isArray(json.message.content)) {
                                for (const block of json.message.content) {
                                    this.outputChannel.appendLine(`  - Content block type: ${block.type}`);
                                    
                                    if (block.type === 'text' && block.text) {
                                        this.outputChannel.appendLine(`  - Text content: ${block.text.substring(0, 100)}...`);
                                        onContent(block.text);
                                    } else if (block.type === 'tool_use') {
                                        this.outputChannel.appendLine(`  - Tool use: ${block.name} (id: ${block.id})`);
                                        this.outputChannel.appendLine(`  - Tool input: ${JSON.stringify(block.input)}`);
                                        // We could emit tool usage events here for visualization
                                    } else if (block.type === 'thinking' && block.thinking) {
                                        this.outputChannel.appendLine(`  - Thinking: ${block.thinking.substring(0, 100)}...`);
                                        // Optionally show thinking in UI
                                    }
                                }
                            } else if (typeof json.message.content === 'string') {
                                this.outputChannel.appendLine(`  - String content: ${json.message.content.substring(0, 100)}...`);
                                onContent(json.message.content);
                            }
                        }
                        
                        // Track usage
                        if (json.message?.usage) {
                            this.outputChannel.appendLine(`  - Token usage: input=${json.message.usage.input_tokens}, output=${json.message.usage.output_tokens}`);
                        }
                        
                        onMetadata({ messageId: json.message?.id });
                        break;
                        
                    case 'user':
                        this.outputChannel.appendLine('[StreamProcessor] User message received');
                        // User messages are typically tool results
                        break;
                        
                    case 'result':
                        this.outputChannel.appendLine('[StreamProcessor] Result message received');
                        this.outputChannel.appendLine(`  - Subtype: ${json.subtype}`);
                        this.outputChannel.appendLine(`  - Duration: ${json.duration_ms}ms`);
                        this.outputChannel.appendLine(`  - Total cost: $${json.total_cost_usd}`);
                        this.outputChannel.appendLine(`  - Error: ${json.is_error}`);
                        
                        if (json.is_error && json.subtype) {
                            this.webviewProtocol?.post('error/show', {
                                message: `Claude error: ${json.subtype}`
                            });
                        }
                        
                        onMetadata({ totalCost: json.total_cost_usd });
                        
                        // Send completion with metadata
                        this.webviewProtocol?.post('chat/messageComplete', {
                            sessionId: json.session_id,
                            totalCost: json.total_cost_usd,
                            duration: json.duration_ms
                        });
                        break;
                        
                    default:
                        this.outputChannel.appendLine(`[StreamProcessor] Unknown message type: ${(json as any).type}`);
                }
            }
            
            this.outputChannel.appendLine(`[StreamProcessor] Stream processing completed. Total chunks: ${chunkCount}`);
            
        } catch (error) {
            this.outputChannel.appendLine(`[StreamProcessor] Error: ${error}`);
            this.outputChannel.appendLine(`[StreamProcessor] Error stack: ${(error as Error).stack}`);
            this.logger.error('ExtensionMessageHandler', 'Stream processing error', error as Error);
            throw error;
        }
    }

    /**
     * Handle slash commands by executing them in a terminal
     */
    private async handleSlashCommand(command: string): Promise<void> {
        this.outputChannel.appendLine(`\n[Slash Command] Executing: ${command}`);
        
        // Send the command to UI first
        if (this.webviewProtocol) {
            this.webviewProtocol.post('message/add', {
                role: 'user',
                content: command
            });
            
            // Send a message about opening terminal
            this.webviewProtocol.post('message/add', {
                role: 'assistant',
                content: `Opening terminal to execute ${command}. Check the terminal for output.`
            });
            
            this.webviewProtocol.post('status/processing', false);
        }
        
        // Get workspace folder for cwd
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
        
        // Extract command name (remove the /)
        const commandName = command.substring(1).split(' ')[0];
        
        // Build command arguments - slash commands are passed directly to claude
        const args = [command];
        
        // Add session resume if we have a current session
        if (this.currentSessionId) {
            args.push('--resume', this.currentSessionId);
            this.outputChannel.appendLine(`[Slash Command] Resuming session: ${this.currentSessionId}`);
        }
        
        // Create terminal with the claude command
        const terminal = vscode.window.createTerminal({
            name: `Claude ${command}`,
            cwd: cwd,
            env: process.env
        });
        terminal.sendText(`claude ${args.join(' ')}`);
        terminal.show();
        
        // Show info message
        vscode.window.showInformationMessage(
            `Executing ${command} command in terminal. Check the terminal output and return when ready.`,
            'OK'
        );
        
        // Send terminal opened message to UI
        if (this.webviewProtocol) {
            this.webviewProtocol.post('terminal/opened', { 
                message: `Executing ${command} command in terminal. Check the terminal output and return when ready.`
            });
        }
        
        this.outputChannel.appendLine(`[Slash Command] Terminal opened for ${command}`);
    }

}