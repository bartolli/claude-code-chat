import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceContainer } from '../core/ServiceContainer';
import { Logger } from '../core/Logger';
import { SimpleWebviewProtocol } from '../protocol/SimpleWebviewProtocol';
import { FromWebviewMessageType, FromWebviewProtocol } from '../protocol/types';
import { StreamProcessor } from './StreamProcessor';
import { ChunkedJSONParser } from './ChunkedJSONParser';
import { ClaudeStreamMessage, ModelType } from '../types/claude';
import { Readable } from 'stream';
import { mcpService } from './McpService';
import { mcpClientService } from './McpClientService';
import { ClaudeProcessManager } from './ClaudeProcessManager';
import { ServiceContainer as NewServiceContainer } from './ServiceContainer';
import { ClaudeProcessAdapter } from '../types/process-adapter';

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
    private currentClaudeProcess: ClaudeProcessAdapter | null = null;
    private pendingPermissionResponses: Map<string, (response: string) => void> = new Map();
    private thinkingStartTime: number | null = null;
    private accumulatedThinking: string = '';
    private latestThinkingLine: string = '';
    private waitingForPlan: boolean = false;
    private hasReceivedPlan: boolean = false;
    private isInPlanMode: boolean = false;
    private hasCreatedAssistantMessage: boolean = false;
    private thinkingMessageId: string | null = null;
    private currentAssistantMessageId: string | null = null;
    private isFirstTextBlock: boolean = true; // Track first text block for natural flow
    private hasSeenToolUse: boolean = false; // Track if we've seen a tool use to create new messages
    private pendingToolIds: Set<string> = new Set(); // Track tools that haven't received results
    private processManager: ClaudeProcessManager;
    private currentAbortController: AbortController | null = null; // TODO: Test controller reference is maintained

    constructor(
        private context: vscode.ExtensionContext,
        private serviceContainer: ServiceContainer
    ) {
        this.logger = serviceContainer.get('Logger') as Logger;
        this.streamProcessor = serviceContainer.get('StreamProcessor') as StreamProcessor;
        this.jsonParser = serviceContainer.get('ChunkedJSONParser') as ChunkedJSONParser;
        this.processManager = serviceContainer.get('ClaudeProcessManager') as ClaudeProcessManager;
        
        // Get or create output channel
        try {
            this.outputChannel = serviceContainer.get('OutputChannel') as vscode.OutputChannel;
        } catch {
            this.outputChannel = vscode.window.createOutputChannel('Claude Code GUI');
        }
        
        // Configure hooks for plan mode
        this.configurePlanModeHooks();
        
        // Watch for plan files
        this.watchForPlanFiles();
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
                await this.handleChatMessage(data as FromWebviewProtocol['chat/sendMessage'][0]);
                return;
            
            case 'chat/newSession':
                this.logger.info('ExtensionMessageHandler', 'New session requested');
                this.currentSessionId = null;
                this.outputChannel.appendLine(`[DEBUG] Session cleared - next message will start new session`);
                return;
            
            case 'settings/get':
                // Return current settings
                return {
                    selectedModel: this.context.workspaceState.get('selectedModel', 'default'),
                    autoSave: this.context.workspaceState.get('autoSave', true),
                    gitBackup: this.context.workspaceState.get('gitBackup', false)
                };
                
            case 'settings/update':
                // Update settings
                const settings = data as FromWebviewProtocol['settings/update'][0];
                if (settings.selectedModel) {
                    await this.context.workspaceState.update('selectedModel', settings.selectedModel);
                }
                return {};
                
            case 'settings/selectModel':
                // Update selected model
                const { model } = data as FromWebviewProtocol['settings/selectModel'][0];
                await this.context.workspaceState.update('selectedModel', model);
                this.logger.info('ExtensionMessageHandler', 'Model selected', { model });
                return {};
                
            case 'conversation/getList':
                // Return empty conversation list for now
                this.logger.info('ExtensionMessageHandler', 'Getting conversation list');
                return {
                    conversations: []
                };
                
            case 'mcp/getServers':
                // Get MCP servers and send them to the UI
                this.logger.info('ExtensionMessageHandler', 'Getting MCP servers');
                await this.loadAndSendMcpServers();
                return;
            
            case 'permission/response':
                // Handle permission response
                const permissionData = data as FromWebviewProtocol['permission/response'][0];
                this.logger.info('ExtensionMessageHandler', 'Permission response', permissionData);
                this.handlePermissionResponse(permissionData);
                return;
            
            case 'plan/approve':
                this.logger.info('ExtensionMessageHandler', 'Plan approved', data);
                this.outputChannel.appendLine(`[Plan] User approved plan`);
                
                const { toolId } = data as FromWebviewProtocol['plan/approve'][0];
                // Create approval file for hook
                const approvalPath = `/tmp/claude-plan-approval-${toolId || this.currentSessionId}`;
                await fs.promises.writeFile(approvalPath, '');
                
                // Tell Claude to continue (retry exit_plan_mode)
                await this.handleChatMessage({ 
                    text: "Please continue with the plan.",
                    planMode: true,
                    thinkingMode: false
                });
                
                // Update UI
                this.webviewProtocol?.post('planMode/toggle', false);
                return;
                
            case 'plan/refine':
                this.logger.info('ExtensionMessageHandler', 'Plan refinement requested', data);
                this.outputChannel.appendLine(`[Plan] User requested plan refinement`);
                
                // User will provide refinement instructions
                // Just focus the input
                return;
            
            case 'chat/stopRequest':
                // Handle stop request using AbortController
                this.logger.info('ExtensionMessageHandler', 'Stop requested');
                this.outputChannel.appendLine(`[Stop] User requested to stop Claude`);
                
                if (this.currentAbortController && this.currentClaudeProcess) {
                    // Only abort if we have an active process running
                    this.outputChannel.appendLine(`[Stop] Using AbortController to stop process`);
                    this.currentAbortController.abort();
                    // TODO: Test stop button triggers abort
                    
                    // Clear the controller reference to prevent reuse
                    this.currentAbortController = null;
                    
                    // Update UI to show stopped state
                    this.webviewProtocol?.post('status/processing', false);
                    this.outputChannel.appendLine(`[Stop] Abort signal sent`);
                } else if (this.currentClaudeProcess && this.currentClaudeProcess.stdin) {
                    // Fallback to ESC character if no abort controller
                    this.outputChannel.appendLine(`[Stop] No AbortController, falling back to ESC`);
                    this.currentClaudeProcess.stdin.write('\x1b');
                    this.outputChannel.appendLine(`[Stop] Sent ESC to Claude process`);
                    
                    // Update UI to show stopped state
                    this.webviewProtocol?.post('status/processing', false);
                } else {
                    this.outputChannel.appendLine(`[Stop] No active Claude process to stop`);
                }
                return;
            
            default:
                this.logger.warn('ExtensionMessageHandler', `Unhandled message type: ${type}`);
                return;
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
                
                // Don't create assistant message yet - wait for actual content
                // This prevents the double processing indicator
                this.hasCreatedAssistantMessage = false;
                this.currentAssistantMessageId = null;
                this.isFirstTextBlock = true; // Reset for new message
                this.hasSeenToolUse = false; // Reset tool tracking
                this.outputChannel.appendLine(`[DEBUG] Waiting for content before creating assistant message`);
                
                // Reset message creation flag for new message
                this.thinkingMessageId = null;
            } else {
                this.outputChannel.appendLine(`[ERROR] WebviewProtocol not initialized!`);
                throw new Error('WebviewProtocol not initialized');
            }
            
            // Get workspace folder for cwd
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
            
            // Note: ClaudeProcessManager will build the arguments
            // We just need to ensure we use --resume if we have a session
            if (this.currentSessionId) {
                this.outputChannel.appendLine(`[DEBUG] Resuming session: ${this.currentSessionId}`);
            } else {
                this.outputChannel.appendLine(`[DEBUG] Starting new session`);
            }
            
            // TODO: Add plan mode support to ClaudeProcessOptions
            if (data.planMode) {
                this.outputChannel.appendLine('[DEBUG] Plan mode requested - needs implementation in ClaudeProcessManager');
            }
            
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
            
            // Model will be passed to ClaudeProcessManager
            
            // Log the command info
            this.logger.info('ExtensionMessageHandler', `Using ClaudeProcessManager to spawn Claude`);
            this.outputChannel.appendLine(`\nUsing ClaudeProcessManager to spawn Claude process`);
            this.outputChannel.appendLine(`Working directory: ${cwd}`);
            
            // Test McpService - Log MCP configuration
            this.outputChannel.appendLine('\n========== MCP SERVICE TEST ==========');
            try {
                // Test loading MCP config
                const mcpConfig = await mcpService.loadMcpConfig(cwd);
                if (mcpConfig) {
                    this.outputChannel.appendLine(`[MCP] Found .mcp.json with ${Object.keys(mcpConfig.mcpServers).length} servers:`);
                    Object.entries(mcpConfig.mcpServers).forEach(([name, config]) => {
                        this.outputChannel.appendLine(`[MCP]   - ${name}: ${config.command} ${config.args?.join(' ') || ''}`);
                    });
                } else {
                    this.outputChannel.appendLine(`[MCP] No .mcp.json found in ${cwd}`);
                }
                
                // Test listing all servers with scope precedence
                const allConfigs = await mcpService.loadAllConfigs(cwd);
                this.outputChannel.appendLine('\n[MCP] Configuration scope analysis:');
                this.outputChannel.appendLine(`[MCP]   Local: ${allConfigs.local ? Object.keys(allConfigs.local.mcpServers).length + ' servers' : 'none'}`);
                this.outputChannel.appendLine(`[MCP]   Project: ${allConfigs.project ? Object.keys(allConfigs.project.mcpServers).length + ' servers' : 'none'}`);
                this.outputChannel.appendLine(`[MCP]   User: ${allConfigs.user ? Object.keys(allConfigs.user.mcpServers).length + ' servers' : 'none'}`);
                
                // Test merged configuration
                const mergedServers = mcpService.mergeConfigs(allConfigs.local, allConfigs.project, allConfigs.user);
                this.outputChannel.appendLine(`\n[MCP] Merged configuration (${mergedServers.length} total servers):`);
                mergedServers.forEach(server => {
                    this.outputChannel.appendLine(`[MCP]   - ${server.name} (${server.scope}): ${server.command}`);
                });
                
                // Test getMcpConfigFlag
                const mcpFlags = mcpService.getMcpConfigFlag(cwd);
                this.outputChannel.appendLine(`\n[MCP] CLI flags: ${mcpFlags.length > 0 ? mcpFlags.join(' ') : 'none'}`);
                
            } catch (error) {
                this.outputChannel.appendLine(`[MCP] Error testing McpService: ${error}`);
            }
            this.outputChannel.appendLine('========== END MCP SERVICE TEST ==========\n');
            
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
                        // TODO: Add support for --chat mode in ClaudeProcessManager
                        this.outputChannel.appendLine(`[DEBUG] --chat mode might work better`);
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
            this.outputChannel.appendLine(`[DEBUG] Using ClaudeProcessManager`);
            this.outputChannel.appendLine(`[DEBUG] CWD: ${cwd}`);
            this.outputChannel.appendLine(`[DEBUG] Model: ${selectedModel}`);
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
            
            // Generate session ID if we don't have one
            const sessionId = this.currentSessionId || `session_${Date.now()}`;
            
            // Create AbortController for this session
            const abortController = new AbortController();
            this.currentAbortController = abortController;
            // TODO: Test controller passed to ClaudeProcessManager
            
            // Use ClaudeProcessManager to spawn process
            this.outputChannel.appendLine(`[DEBUG] Using ClaudeProcessManager to spawn Claude`);
            
            // Always use --continue for current session continuity
            let resumeOption: string | undefined = undefined;
            if (this.currentSessionId) {
                // Use --continue for the most recent conversation
                resumeOption = 'continue';
                this.outputChannel.appendLine(`[DEBUG] Using --continue flag for current session`);
            }
            
            const spawnResult = await this.processManager.spawn({
                sessionId: sessionId,
                model: selectedModel as ModelType,
                cwd: cwd,
                resumeSession: resumeOption,
                verbose: true,
                dangerouslySkipPermissions: true,
                abortController: abortController
            });
            
            if (!spawnResult.ok) {
                // Check if this was due to abort
                if (this.currentAbortController?.signal.aborted || 
                    spawnResult.error.message.includes('aborted')) {
                    this.outputChannel.appendLine(`[Stop] Process spawn was aborted`);
                    this.logger.info('ExtensionMessageHandler', 'Spawn aborted by user');
                    this.webviewProtocol?.post('status/processing', false);
                    return;
                }
                
                this.outputChannel.appendLine(`[ERROR] Failed to spawn Claude: ${spawnResult.error.message}`);
                this.webviewProtocol?.post('error/show', {
                    message: `Failed to start Claude: ${spawnResult.error.message}`
                });
                return;
            }
            
            const claudeProcess = spawnResult.value;
            
            // Store the current process for permission handling using adapter
            this.currentClaudeProcess = new ClaudeProcessAdapter(claudeProcess);
            
            this.outputChannel.appendLine(`[Process] Spawned with PID: ${claudeProcess.pid}`);
            this.outputChannel.appendLine(`[Process] Connected: true`);
            
            // Add timeout to detect hanging process (10 minutes for long operations)
            const PROCESS_TIMEOUT_MS = 600000; // 10 minutes
            let lastActivityTime = Date.now();
            
            const timeout = setTimeout(() => {
                const inactiveTime = Date.now() - lastActivityTime;
                this.outputChannel.appendLine(`[WARNING] Process timeout after ${PROCESS_TIMEOUT_MS/1000} seconds (inactive for ${inactiveTime/1000}s)`);
                if (this.currentClaudeProcess && !this.currentClaudeProcess.killed) {
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
                
                // Check if this was due to abort
                if (this.currentAbortController?.signal.aborted || 
                    error.message?.includes('aborted')) {
                    this.outputChannel.appendLine(`[Stop] Process error due to abort`);
                    return;
                }
                
                this.logger.error('ExtensionMessageHandler', 'Failed to spawn claude', error);
                this.outputChannel.appendLine(`[ERROR] Failed to spawn: ${error.message}`);
                if ('code' in error) {
                    this.outputChannel.appendLine(`[ERROR] Error code: ${error.code}`);
                }
                if ('path' in error) {
                    this.outputChannel.appendLine(`[ERROR] Error path: ${error.path}`);
                }
                this.webviewProtocol?.post('error/show', {
                    message: `Failed to start Claude: ${error.message}. Make sure Claude CLI is installed and available in PATH.`
                });
            });
            
            // Set encoding for stderr
            claudeProcess.stderr?.setEncoding('utf8');
            
            // Track if we've received any data
            let receivedData = false;
            let jsonBuffer = '';
            
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
                if (!receivedData && this.currentClaudeProcess && this.currentClaudeProcess.exitCode === null) {
                    this.outputChannel.appendLine(`[WARNING] No data received after 2 seconds`);
                    this.outputChannel.appendLine(`[WARNING] Process still running: ${!this.currentClaudeProcess.killed}`);
                    this.outputChannel.appendLine(`[WARNING] Exit code: ${this.currentClaudeProcess.exitCode}`);
                    this.outputChannel.appendLine(`[WARNING] PID: ${claudeProcess.pid}`);
                    
                    // Check process state
                    if (claudeProcess.stdout && claudeProcess.stdout instanceof Readable) {
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
            let processSessionId: string | undefined; // Renamed to avoid conflict
            let totalCost: number = 0;
            let apiKeySource: string | undefined;
            
            // Initialize stream tracking
            const streamId = `stream_${Date.now()}`;
            
            // Set encoding for stdout
            claudeProcess.stdout?.setEncoding('utf8');
            
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
                                    // Store content for processing
                                    if (content.trim()) {
                                        assistantContent += content;
                                    }
                                }, (metadata) => {
                                    if (metadata.sessionId) processSessionId = metadata.sessionId;
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
                    
                    // Stream ended - natural flow completed
                    this.outputChannel.appendLine(`[DEBUG] Stream ended - first text block updated thinking, subsequent blocks created new messages`);
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
                
                // Check if this was an abort
                const wasAborted = this.currentAbortController?.signal.aborted || false;
                // TODO: Test UI shows stopped state
                
                if (wasAborted || code === 143) {
                    // Handle user-initiated abort differently
                    // Exit code 143 = 128 + 15 (SIGTERM)
                    this.outputChannel.appendLine(`[Process Exit] User aborted the process`);
                    this.logger.info('ExtensionMessageHandler', 'Process aborted by user');
                    
                    // Update UI to show stopped state without error
                    this.webviewProtocol?.post('status/processing', false);
                    // TODO: Test no error shown on manual abort
                    
                    // Don't show error message for user-initiated abort
                    return;
                }
                
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
                
                // Mark any pending tools as timed out or incomplete
                if (this.pendingToolIds.size > 0) {
                    this.outputChannel.appendLine(`[Process Exit] ${this.pendingToolIds.size} tools did not receive results`);
                    this.outputChannel.appendLine(`[Process Exit] Pending tool IDs: ${Array.from(this.pendingToolIds).join(', ')}`);
                    for (const toolId of this.pendingToolIds) {
                        this.outputChannel.appendLine(`[Process Exit] Sending timeout for tool: ${toolId}`);
                        // Send a timeout/no-response status for tools that didn't receive results
                        this.webviewProtocol?.post('message/toolResult', {
                            toolId: toolId,
                            result: '(No response received)',
                            isError: true,
                            status: 'timeout'
                        });
                    }
                    this.pendingToolIds.clear();
                    this.outputChannel.appendLine(`[Process Exit] Cleared all pending tools`);
                }
                
                // Always send completion message and set processing to false
                this.webviewProtocol?.post('chat/messageComplete', {});
                
                this.webviewProtocol?.post('status/processing', false);
                this.outputChannel.appendLine(`[DEBUG] Set processing status to false`);
                
                // Reset message creation flags for next message
                this.hasCreatedAssistantMessage = false;
                this.currentAssistantMessageId = null;
                this.thinkingMessageId = null;
                this.isFirstTextBlock = true; // Reset for next message
                this.hasSeenToolUse = false; // Reset tool tracking
                
                // Clean up process references
                this.currentClaudeProcess = null;
                this.currentAbortController = null;
            });
            
        } catch (error: any) {
            // Check if this was an abort
            if (this.currentAbortController?.signal.aborted || 
                error.message?.includes('aborted')) {
                this.outputChannel.appendLine(`[Stop] Operation aborted`);
                this.logger.info('ExtensionMessageHandler', 'Operation aborted by user');
                this.webviewProtocol?.post('status/processing', false);
                return;
            }
            
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
                    
                    // Handle MCP server status
                    if (json.mcp_servers && Array.isArray(json.mcp_servers)) {
                        this.outputChannel.appendLine(`[JSON] MCP Servers: ${json.mcp_servers.length} servers found`);
                        
                        // Calculate tool counts per server if available
                        const serversWithCounts = json.mcp_servers.map((server: any) => {
                            this.outputChannel.appendLine(`[JSON] MCP Server: ${server.name} - ${server.status}`);
                            
                            // Count tools for this server by checking tool names with mcp__ prefix
                            let toolCount = 0;
                            if (json.tools && Array.isArray(json.tools)) {
                                // MCP tools have format: mcp__servername__toolname
                                const serverPrefix = `mcp__${server.name}__`;
                                toolCount = json.tools.filter((tool: string) => 
                                    tool.startsWith(serverPrefix)
                                ).length;
                                this.outputChannel.appendLine(`[JSON]   - Tool count for ${server.name}: ${toolCount}`);
                            }
                            
                            return {
                                name: server.name,
                                status: server.status, // 'connected' | 'disconnected' | 'error'
                                toolCount: toolCount,
                                promptCount: 0 // TODO: Get prompt count when available
                            };
                        });
                        
                        // Send MCP server status to UI with tool counts
                        this.webviewProtocol?.post('mcp/status', {
                            servers: serversWithCounts
                        });
                    }
                    
                    // Log available tools for debugging
                    if (json.tools && Array.isArray(json.tools)) {
                        this.outputChannel.appendLine(`[JSON] Total tools available: ${json.tools.length}`);
                        const nativeTools = json.tools.filter((t: string) => !t.startsWith('mcp__'));
                        const mcpTools = json.tools.filter((t: string) => t.startsWith('mcp__'));
                        this.outputChannel.appendLine(`[JSON]   - Native tools: ${nativeTools.length}`);
                        this.outputChannel.appendLine(`[JSON]   - MCP tools: ${mcpTools.length}`);
                    }
                    
                    onMetadata({
                        sessionId: json.session_id,
                        apiKeySource: json.apiKeySource
                    });
                    
                    // Mark streaming as started but don't create initial message
                    if (!streamingState.isStreaming) {
                        streamingState.isStreaming = true;
                        this.outputChannel.appendLine(`[DEBUG] Streaming started - waiting for content blocks to create messages`);
                    }
                }
                break;
                
            case 'assistant':
                this.outputChannel.appendLine(`[JSON] Assistant message received`);
                this.outputChannel.appendLine(`[DEBUG] Message structure: ${JSON.stringify(json.message, null, 2).substring(0, 500)}...`);
                
                // Check if we need to set up streaming state
                if (!streamingState.isStreaming && json.message?.content) {
                    streamingState.isStreaming = true;
                    this.outputChannel.appendLine(`[DEBUG] Streaming started`);
                    
                    // Check if this message contains thinking
                    const hasThinking = Array.isArray(json.message.content) && 
                        json.message.content.some((block: any) => block.type === 'thinking');
                    if (hasThinking && !this.thinkingStartTime) {
                        this.thinkingStartTime = Date.now();
                        // Reset accumulated thinking for new message
                        this.accumulatedThinking = '';
                        this.latestThinkingLine = '';
                        // Don't send initial thinking here - already sent in handleChatMessage
                    }
                }
                
                // Handle assistant messages from SDK format
                if (json.message?.content) {
                    if (Array.isArray(json.message.content)) {
                        // Handle content blocks
                        for (const block of json.message.content) {
                            if (block.type === 'text' && block.text) {
                                this.outputChannel.appendLine(`[JSON] Text content: ${block.text.substring(0, 50)}...`);
                                
                                // Update messageId if we have one but the message doesn't
                                if (this.hasCreatedAssistantMessage && !this.currentAssistantMessageId && json.message?.id) {
                                    this.currentAssistantMessageId = json.message.id;
                                    this.webviewProtocol?.post('message/update', {
                                        role: 'assistant',
                                        messageId: json.message.id
                                    });
                                    this.outputChannel.appendLine(`[DEBUG] Updated assistant message with messageId: ${json.message.id}`);
                                }
                                
                                // Check if this message contains a JSON plan
                                const trimmedText = block.text.trim();
                                
                                // First try: Check if the entire message is just JSON
                                if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
                                    try {
                                        const planData = JSON.parse(trimmedText);
                                        if (planData.type === 'plan') {
                                            this.outputChannel.appendLine(`[JSON] Detected plan response (entire message)`);
                                            
                                            // Send plan to UI for approval
                                            this.webviewProtocol?.post('message/planProposal', {
                                                plan: planData,
                                                messageId: json.message?.id
                                            });
                                            
                                            // Don't show the raw JSON to user
                                            onContent(''); // Send empty content to avoid showing JSON
                                            return;
                                        }
                                    } catch (e) {
                                        // Not valid JSON, continue to extract attempt
                                    }
                                }
                                
                                // Second try: Extract JSON from mixed content
                                const jsonMatch = trimmedText.match(/\{"type":"plan"[^}]+\}/);
                                if (jsonMatch) {
                                    try {
                                        const planData = JSON.parse(jsonMatch[0]);
                                        if (planData.type === 'plan') {
                                            this.outputChannel.appendLine(`[JSON] Detected plan response (extracted from text)`);
                                            
                                            // Send plan to UI for approval
                                            this.webviewProtocol?.post('message/planProposal', {
                                                plan: planData,
                                                messageId: json.message?.id
                                            });
                                            
                                            // Show only the non-JSON part to user
                                            const textBeforeJson = trimmedText.substring(0, trimmedText.indexOf(jsonMatch[0]));
                                            const textAfterJson = trimmedText.substring(trimmedText.indexOf(jsonMatch[0]) + jsonMatch[0].length);
                                            onContent(textBeforeJson + textAfterJson);
                                            return;
                                        }
                                    } catch (e) {
                                        this.outputChannel.appendLine(`[JSON] Failed to parse extracted JSON: ${e}`);
                                    }
                                }
                                
                                // Check if this is a plan response (when we're waiting for one)
                                if (this.waitingForPlan && block.text.includes('## Implementation Plan')) {
                                    this.outputChannel.appendLine(`[Plan Mode] Detected plan in response`);
                                    this.hasReceivedPlan = true;
                                    this.waitingForPlan = false;
                                    
                                    // Send the plan content to UI with special formatting
                                    this.webviewProtocol?.post('message/planProposal', {
                                        plan: block.text,
                                        messageId: json.message?.id,
                                        isMarkdown: true
                                    });
                                }
                                
                                // Each text block creates a new message for natural conversation flow
                                if (this.webviewProtocol) {
                                    const newMessageId = json.message?.id ? `${json.message.id}_${Date.now()}` : `msg_${Date.now()}`;
                                    this.webviewProtocol.post('message/add', {
                                        role: 'assistant',
                                        content: block.text,
                                        messageId: newMessageId
                                    });
                                    
                                    this.outputChannel.appendLine(`[DEBUG] Created new assistant message: ${newMessageId}`);
                                    
                                    // Don't track message ID - each message is independent
                                    this.hasCreatedAssistantMessage = true;
                                }
                                
                                // Don't call onContent - we're handling it directly
                                onContent('');
                            } else if (block.type === 'thinking' && block.thinking) {
                                this.outputChannel.appendLine(`[JSON] Thinking content: ${block.thinking.substring(0, 50)}...`);
                                
                                // Create a message if we haven't already
                                if (!this.hasCreatedAssistantMessage || !this.currentAssistantMessageId) {
                                    // Use the message ID from the stream or generate one
                                    const messageId = json.message?.id || `msg_${Date.now()}`;
                                    this.currentAssistantMessageId = messageId;
                                    this.thinkingMessageId = messageId; // Use same ID for thinking tracking
                                    
                                    // Create the message with thinking
                                    if (this.webviewProtocol) {
                                        this.webviewProtocol.post('message/add', {
                                            role: 'assistant',
                                            content: '',
                                            messageId: messageId,
                                            isThinkingActive: true
                                        });
                                        this.hasCreatedAssistantMessage = true;
                                        this.outputChannel.appendLine(`[DEBUG] Created assistant message with thinking: ${messageId}`);
                                    }
                                } else {
                                    // Use existing message for thinking
                                    this.thinkingMessageId = this.currentAssistantMessageId;
                                }
                                
                                // Track thinking start time
                                if (!this.thinkingStartTime) {
                                    this.thinkingStartTime = Date.now();
                                    this.outputChannel.appendLine(`[DEBUG] Thinking started at: ${this.thinkingStartTime}`);
                                }
                                
                                // Store the new thinking chunk
                                const newThinkingContent = block.thinking;
                                
                                // Accumulate thinking content (for internal tracking)
                                this.accumulatedThinking += newThinkingContent;
                                
                                // Extract last line for header display
                                const lines = this.accumulatedThinking.split('\n');
                                this.latestThinkingLine = lines[lines.length - 1] || lines[lines.length - 2] || '';
                                
                                // Send thinking update to UI with only the new content
                                this.outputChannel.appendLine(`[DEBUG] webviewProtocol status: ${this.webviewProtocol ? 'available' : 'not available'}`);
                                if (this.webviewProtocol) {
                                    this.outputChannel.appendLine(`[DEBUG] Sending incremental thinking update to UI with messageId: ${this.thinkingMessageId}`);
                                    this.webviewProtocol.post('message/thinking', {
                                        content: newThinkingContent,  // Send only new content
                                        currentLine: this.latestThinkingLine,
                                        isActive: true,
                                        isIncremental: true,  // Flag to indicate this is incremental
                                        messageId: this.thinkingMessageId
                                    });
                                } else {
                                    this.outputChannel.appendLine(`[ERROR] Cannot send thinking update - webviewProtocol not available`);
                                }
                            } else if (block.type === 'tool_use') {
                                this.outputChannel.appendLine(`[JSON] Tool use: ${block.name} with id: ${block.id}`);
                                this.outputChannel.appendLine(`[JSON] Tool input: ${JSON.stringify(block.input, null, 2)}`);
                                
                                // Mark that we've seen a tool use
                                this.hasSeenToolUse = true;
                                
                                // Track this tool as pending
                                this.pendingToolIds.add(block.id);
                                this.outputChannel.appendLine(`[JSON] Added ${block.id} to pending tools. Total pending: ${this.pendingToolIds.size}`);
                                
                                // Tools attach to the current conversation flow
                                // If no message exists yet, create one for the tools
                                if (!this.hasCreatedAssistantMessage) {
                                    const messageId = `tools_${Date.now()}`;
                                    this.webviewProtocol?.post('message/add', {
                                        role: 'assistant',
                                        content: '', // Empty content - tools will show
                                        messageId: messageId
                                    });
                                    this.hasCreatedAssistantMessage = true;
                                    this.outputChannel.appendLine(`[DEBUG] Created message for tools: ${messageId}`);
                                }
                                
                                // Send tool use to attach to the most recent message
                                this.outputChannel.appendLine(`[JSON] Sending tool use to UI: ${block.name} (${block.id}) with status: calling`);
                                this.webviewProtocol?.post('message/toolUse', {
                                    toolName: block.name,
                                    toolId: block.id,
                                    input: block.input,
                                    status: 'calling',
                                    parentToolUseId: json.parent_tool_use_id || undefined
                                });
                            }
                        }
                    } else if (typeof json.message.content === 'string') {
                        this.outputChannel.appendLine(`[JSON] String content: ${json.message.content.substring(0, 50)}...`);
                        
                        // Check if this is a JSON plan response
                        const trimmedContent = json.message.content.trim();
                        // Check if the entire message is just JSON (no other text)
                        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
                            try {
                                const planData = JSON.parse(trimmedContent);
                                if (planData.type === 'plan') {
                                    this.outputChannel.appendLine(`[JSON] Detected plan response (string format)`);
                                    
                                    // Send plan to UI for approval
                                    this.webviewProtocol?.post('message/planProposal', {
                                        plan: planData,
                                        messageId: json.message?.id
                                    });
                                    
                                    // Don't show the raw JSON to user
                                    return;
                                }
                            } catch (e) {
                                this.outputChannel.appendLine(`[JSON] Failed to parse as plan: ${e}`);
                                // Not valid JSON plan, continue normally
                            }
                        }
                        
                        // Handle string content as a single text block - same pattern as array blocks
                        if (this.webviewProtocol) {
                            // Always create a new message for each text block
                            const newMessageId = `${json.message?.id || 'msg'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            this.webviewProtocol.post('message/add', {
                                role: 'assistant',
                                content: json.message.content,
                                messageId: newMessageId
                            });
                            
                            // Track that we've created messages
                            this.hasCreatedAssistantMessage = true;
                            this.currentAssistantMessageId = newMessageId;
                        }
                        onContent('');
                    }
                }
                if (json.message?.id) {
                    onMetadata({ messageId: json.message.id });
                }
                
                // Track and send token usage if available
                if (json.message?.usage) {
                    this.outputChannel.appendLine(`[JSON] Token usage - input: ${json.message.usage.input_tokens}, output: ${json.message.usage.output_tokens}, thinking: ${json.message.usage.thinking_tokens || 0}`);
                    
                    // Send token usage update to UI
                    this.webviewProtocol?.post('message/tokenUsage', {
                        inputTokens: json.message.usage.input_tokens,
                        outputTokens: json.message.usage.output_tokens,
                        cacheTokens: (json.message.usage.cache_creation_input_tokens || 0) + 
                                     (json.message.usage.cache_read_input_tokens || 0),
                        thinkingTokens: json.message.usage.thinking_tokens || 0
                    });
                }
                break;
                
            case 'user':
                // User messages - check for tool results
                this.outputChannel.appendLine(`[JSON] User message`);
                if (json.message?.content && Array.isArray(json.message.content)) {
                    for (const block of json.message.content) {
                        if (block.type === 'tool_result' && block.tool_use_id) {
                            this.outputChannel.appendLine(`[JSON] Tool result for: ${block.tool_use_id}`);
                            this.outputChannel.appendLine(`[JSON] Tool result block structure: ${JSON.stringify(block, null, 2)}`);
                            
                            // Extract text from various result formats
                            let resultText = block.text;
                            
                            // Try different content extraction methods
                            if (!resultText && block.output) {
                                // Some tools might have 'output' field
                                resultText = typeof block.output === 'string' ? block.output : JSON.stringify(block.output);
                                this.outputChannel.appendLine(`[JSON] Found result in 'output' field: ${resultText?.substring(0, 100)}...`);
                            } else if (!resultText && Array.isArray(block.content)) {
                                // Handle MCP tool results with content array
                                const textContent = block.content.find((c: any) => c.type === 'text');
                                resultText = textContent?.text || JSON.stringify(block.content);
                                this.outputChannel.appendLine(`[JSON] Extracted MCP result text: ${resultText?.substring(0, 100)}...`);
                            } else if (!resultText && block.content) {
                                // Handle native tool results
                                resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                                this.outputChannel.appendLine(`[JSON] Found result in 'content' field: ${resultText?.substring(0, 100)}...`);
                            }
                            
                            // Log if we still don't have result text
                            if (!resultText) {
                                this.outputChannel.appendLine(`[JSON] WARNING: No result text found for tool ${block.tool_use_id}`);
                                resultText = ''; // Set empty string instead of undefined
                            }
                            
                            // Remove from pending tools
                            const wasInPending = this.pendingToolIds.has(block.tool_use_id);
                            this.pendingToolIds.delete(block.tool_use_id);
                            this.outputChannel.appendLine(`[JSON] Tool ${block.tool_use_id} was in pending: ${wasInPending}, remaining pending: ${this.pendingToolIds.size}`);
                            
                            // Send tool result update to UI
                            this.outputChannel.appendLine(`[JSON] Sending tool result to UI for ${block.tool_use_id} with status: complete`);
                            this.webviewProtocol?.post('message/toolResult', {
                                toolId: block.tool_use_id,
                                result: resultText,
                                isError: block.is_error || false,
                                status: 'complete',
                                parentToolUseId: json.parent_tool_use_id || undefined
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
                
                // Check if we're in plan mode and haven't received a plan yet
                if (this.isInPlanMode && !this.hasReceivedPlan && !this.waitingForPlan && !json.is_error) {
                    this.outputChannel.appendLine(`[Plan Mode] Analysis complete, requesting plan`);
                    this.waitingForPlan = true;
                    
                    // Send completion first
                    this.webviewProtocol?.post('chat/messageComplete', {
                        sessionId: json.session_id,
                        totalCost: json.total_cost_usd,
                        duration: json.duration_ms
                    });
                    
                    // Then inject a message asking for the plan
                    setTimeout(() => {
                        this.handleChatMessage({
                            text: "Based on your analysis, please create a detailed implementation plan. Format it as:\n\n## Implementation Plan\n\n**Title:** [Brief description]\n\n**Steps:**\n1. [First change with details]\n2. [Second change with details]\n3. [Continue with all necessary steps]\n\n**Summary:** [What will be accomplished]\n\n**Estimated complexity:** [Low/Medium/High]",
                            planMode: false // Turn off plan mode for the response
                        });
                    }, 500);
                    
                    return; // Don't send duplicate completion message
                }
                
                // Check if result message contains thinking tokens
                if (json.usage?.thinking_tokens) {
                    this.outputChannel.appendLine(`[DEBUG] Result contains thinking tokens: ${json.usage.thinking_tokens}`);
                    // Send final token usage update with thinking tokens
                    this.webviewProtocol?.post('message/tokenUsage', {
                        inputTokens: json.usage.input_tokens || 0,
                        outputTokens: json.usage.output_tokens || 0,
                        cacheTokens: (json.usage.cache_creation_input_tokens || 0) + 
                                     (json.usage.cache_read_input_tokens || 0),
                        thinkingTokens: json.usage.thinking_tokens
                    });
                }
                
                // If we were tracking thinking, send final update with duration
                if (this.thinkingStartTime) {
                    const thinkingDuration = (Date.now() - this.thinkingStartTime) / 1000; // Convert to seconds
                    this.outputChannel.appendLine(`[DEBUG] Thinking completed. Duration: ${thinkingDuration}s`);
                    
                    // Send final thinking update with duration and accumulated content
                    this.webviewProtocol?.post('message/thinking', {
                        content: this.accumulatedThinking,
                        currentLine: this.latestThinkingLine,
                        isActive: false,
                        duration: thinkingDuration,
                        messageId: this.thinkingMessageId
                    });
                    
                    // Reset thinking state
                    this.thinkingStartTime = null;
                    this.accumulatedThinking = '';
                    this.latestThinkingLine = '';
                    this.thinkingMessageId = null;
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
                        this.outputChannel.appendLine(`[StreamProcessor] Unknown message type: ${(json as ClaudeStreamMessage).type || 'undefined'}`);
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
    
    private async loadAndSendMcpServers() {
        try {
            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
            this.outputChannel.appendLine(`[MCP] Loading ALL MCP servers from configuration...`);
            this.outputChannel.appendLine(`[MCP] Working directory: ${cwd}`);
            
            // Load ALL servers from all scopes (user, project, local)
            const configs = await mcpService.loadAllConfigs(cwd);
            const mergedServers = mcpService.mergeConfigs(configs.local, configs.project, configs.user);
            
            if (mergedServers.length === 0) {
                this.outputChannel.appendLine(`[MCP] No MCP servers configured in any scope`);
                this.webviewProtocol?.post('mcp/status', { servers: [] });
                return;
            }
            
            this.outputChannel.appendLine(`[MCP] Found servers from scopes:`);
            this.outputChannel.appendLine(`[MCP]   - User: ${configs.user?.mcpServers ? Object.keys(configs.user.mcpServers).length : 0} servers`);
            this.outputChannel.appendLine(`[MCP]   - Project: ${configs.project?.mcpServers ? Object.keys(configs.project.mcpServers).length : 0} servers`);
            this.outputChannel.appendLine(`[MCP]   - Local: ${configs.local?.mcpServers ? Object.keys(configs.local.mcpServers).length : 0} servers`);
            
            // Load Claude settings to get enabled/disabled servers
            const localSettingsPath = path.join(cwd, '.claude', 'settings.local.json');
            let enabledServers: string[] = [];
            let disabledServers: string[] = [];
            
            try {
                if (fs.existsSync(localSettingsPath)) {
                    const settingsContent = await fs.promises.readFile(localSettingsPath, 'utf-8');
                    const settings = JSON.parse(settingsContent);
                    enabledServers = settings.enabledMcpjsonServers || [];
                    disabledServers = settings.disabledMcpjsonServers || [];
                    this.outputChannel.appendLine(`[MCP] Enabled servers: ${enabledServers.join(', ')}`);
                    this.outputChannel.appendLine(`[MCP] Disabled servers: ${disabledServers.join(', ')}`);
                }
            } catch (error) {
                this.outputChannel.appendLine(`[MCP] Failed to read settings: ${error}`);
            }
            
            // Create server list with enabled status from merged configs
            const servers = mergedServers.map(server => {
                const isEnabled = enabledServers.includes(server.name) || 
                                 (!disabledServers.includes(server.name) && enabledServers.length === 0);
                return {
                    name: server.name,
                    status: 'disconnected' as const,
                    enabled: isEnabled,
                    toolCount: 0,
                    promptCount: 0,
                    command: server.command,
                    args: server.args,
                    env: server.env,
                    scope: server.scope
                };
            });
            
            this.outputChannel.appendLine(`[MCP] Found ${servers.length} total servers after merging`);
            servers.forEach(server => {
                this.outputChannel.appendLine(`[MCP]   - ${server.name} (${server.scope}) - ${server.enabled ? 'enabled' : 'disabled'}`);
            });
            
            // Query resources for enabled servers
            this.outputChannel.appendLine(`[MCP] Querying resources for enabled servers...`);
            for (const server of servers) {
                if (server.enabled) {
                    try {
                        this.outputChannel.appendLine(`[MCP] Querying ${server.name}...`);
                        const resources = await mcpClientService.queryServerResources(server);
                        server.toolCount = resources.tools.length;
                        server.promptCount = resources.prompts.length;
                        this.outputChannel.appendLine(`[MCP]   - ${server.name}: ${server.toolCount} tools, ${server.promptCount} prompts`);
                    } catch (error) {
                        this.outputChannel.appendLine(`[MCP]   - ${server.name}: Failed to query - ${error}`);
                        // Keep toolCount and promptCount as 0
                    }
                }
            }
            
            // Send all servers to UI with resource counts
            this.webviewProtocol?.post('mcp/status', { servers });
            
        } catch (error) {
            this.logger.error('ExtensionMessageHandler', 'Failed to load MCP servers', error as Error);
            this.outputChannel.appendLine(`[MCP] Error loading servers: ${error}`);
            this.webviewProtocol?.post('mcp/status', { servers: [] });
        }
    }
    
    /**
     * Configure hooks for plan mode approval
     */
    private async configurePlanModeHooks(): Promise<void> {
        try {
            // Get the hook script path from extension output directory
            const hookPath = path.join(this.context.extensionPath, 'out', 'hooks', 'plan-approval-hook.js');
            
            // Check if hook file exists
            if (!fs.existsSync(hookPath)) {
                this.outputChannel.appendLine(`[Hooks] Plan approval hook not found at: ${hookPath}`);
                return;
            }
            
            // Make hook executable
            fs.chmodSync(hookPath, '755');
            
            // Read current Claude settings
            const settingsPath = path.join(process.env.HOME || '', '.claude', 'settings.json');
            let settings: any = {};
            
            if (fs.existsSync(settingsPath)) {
                try {
                    const content = fs.readFileSync(settingsPath, 'utf8');
                    settings = JSON.parse(content);
                } catch (e) {
                    this.outputChannel.appendLine(`[Hooks] Error reading Claude settings: ${e}`);
                }
            }
            
            // Ensure hooks structure exists
            if (!settings.hooks) {
                settings.hooks = {};
            }
            if (!settings.hooks.PreToolUse) {
                settings.hooks.PreToolUse = [];
            }
            
            // Check if our hook is already configured
            const hookCommand = `node ${hookPath}`;
            const existingHook = settings.hooks.PreToolUse.find((h: any) => 
                h.matcher === 'exit_plan_mode' && 
                h.hooks?.some((hook: any) => hook.command === hookCommand)
            );
            
            if (!existingHook) {
                // Add our hook configuration
                settings.hooks.PreToolUse.push({
                    matcher: 'exit_plan_mode',
                    hooks: [{
                        type: 'command',
                        command: hookCommand
                    }]
                });
                
                // Create .claude directory if it doesn't exist
                const claudeDir = path.dirname(settingsPath);
                if (!fs.existsSync(claudeDir)) {
                    fs.mkdirSync(claudeDir, { recursive: true });
                }
                
                // Write updated settings
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
                this.outputChannel.appendLine(`[Hooks] Plan approval hook configured successfully`);
            } else {
                this.outputChannel.appendLine(`[Hooks] Plan approval hook already configured`);
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`[Hooks] Error configuring hooks: ${error}`);
        }
    }
    
    /**
     * Watch for plan files created by the hook
     */
    private watchForPlanFiles(): void {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern('/tmp', 'claude-plan-content-*')
        );
        
        watcher.onDidCreate(async (uri) => {
            try {
                const content = await vscode.workspace.fs.readFile(uri);
                const planData = JSON.parse(Buffer.from(content).toString());
                
                // Show plan in UI
                this.webviewProtocol?.post('message/planProposal', {
                    plan: planData.plan,
                    sessionId: planData.session_id,
                    isMarkdown: true
                });
                
                this.outputChannel.appendLine(`[Plan] Detected plan file: ${uri.fsPath}`);
            } catch (e) {
                this.outputChannel.appendLine(`[Plan] Error reading plan file: ${e}`);
            }
        });
        
        // Cleanup watcher on dispose
        this.context.subscriptions.push(watcher);
    }
}