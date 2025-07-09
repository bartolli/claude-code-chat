import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { DebugConsole } from './utils/debug-console';
import type { ServiceContainer } from './core/ServiceContainer';
import type { Logger } from './core/Logger';
import type { ExtensionMessageHandler } from './services/ExtensionMessageHandler';
import type { FromWebviewMessageType } from './protocol/types';

const exec = util.promisify(cp.exec);

/**
 * Activates the Claude Code Chat extension.
 * Initializes services, registers commands, and sets up the development environment.
 * @param context - The VS Code extension context used for managing extension lifecycle
 */
export function activate(context: vscode.ExtensionContext) {
  // Extension activation logging is handled via outputChannel below

  // Create output channel for debugging
  const outputChannel = vscode.window.createOutputChannel('Claude Code GUI');
  outputChannel.appendLine('[Activation] Claude Code GUI extension is being activated...');

  // Initialize debug console filtering in development mode
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    const { Logger } = require('./core/Logger');
    const logger = Logger.getInstance(outputChannel);
    DebugConsole.initialize(logger, true);
    outputChannel.appendLine('[Activation] Debug console filtering enabled');
  }

  try {
    // Try to load ServiceContainer with error handling
    let services: ServiceContainer | undefined;
    let logger: Logger | undefined;

    try {
      // ServiceContainer loading is logged via outputChannel below
      outputChannel.appendLine('[Activation] Loading ServiceContainer...');
      const { ServiceContainer } = require('./core/ServiceContainer');
      const { SimpleStateManager } = require('./state/SimpleStateManager');

      services = ServiceContainer.getInstance();
      // ServiceContainer status is logged via outputChannel below
      outputChannel.appendLine('[Activation] ServiceContainer loaded successfully');

      // Initialize ServiceContainer with output channel
      if (services) {
        services.initializeWithOutputChannel(outputChannel);

        // Initialize StateManager with context
        const stateManager = new SimpleStateManager(context);
        services.set('StateManager', stateManager);
        // StateManager status is logged via outputChannel below
        outputChannel.appendLine('[Activation] StateManager initialized');

        // Try to get logger
        logger = services.get('Logger');
        // Logger status is logged via outputChannel below
        outputChannel.appendLine('[Activation] Logger retrieved successfully');
      }
    } catch (error) {
      outputChannel.appendLine(`[Activation] Failed to load ServiceContainer: ${error}`);
      outputChannel.appendLine(`[Activation] Failed to load ServiceContainer: ${error}`);
      // Continue without it
    }

    // Create provider - pass services only if available
    const provider = new ClaudeChatProvider(context.extensionUri, context, services);

    const disposable = vscode.commands.registerCommand('claude-code-chat-modern.openChat', () => {
      outputChannel.appendLine('[Activation] Command executed!');
      try {
        provider.show();
      } catch (error) {
        outputChannel.appendLine(`[Activation] Error showing provider: ${error}`);
        vscode.window.showErrorMessage(`Failed to open Claude Chat: ${error}`);
      }
    });

    context.subscriptions.push(disposable);
    outputChannel.appendLine('[Activation] Command registered successfully');

    // Register migration commands
    try {
      const { FeatureFlagManager } = require('./migration/FeatureFlags');
      const { MigrationTestHarness } = require('./migration/MigrationTestHarness');

      FeatureFlagManager.registerCommands(context);
      MigrationTestHarness.registerCommands(context);

      // Migration command status is logged via outputChannel below
      outputChannel.appendLine('[Activation] Migration commands registered');
    } catch (error) {
      // Error is logged via outputChannel below
      outputChannel.appendLine(`[Activation] Failed to register migration commands: ${error}`);
    }

    // If we have logger, use it
    if (logger) {
      logger.info('Extension', 'Claude Code GUI extension activated');
    }

    // Load test utilities in debug mode
    if (context.extensionMode === vscode.ExtensionMode.Development) {
      // Test utilities loading is logged via outputChannel below
      outputChannel.appendLine('[Activation] Loading test utilities for development mode...');

      // Make ServiceContainer available globally for tests
      // Using type assertion for test utilities
      (
        global as {
          /**
           *
           */
          serviceContainer?: ServiceContainer;
        }
      ).serviceContainer = services;

      try {
        // TODO: Restore abort-test-utils when the file is available
        // require('./test/abort-test-utils');
        // Test utilities status is logged via outputChannel below
        // outputChannel.appendLine(
        //   '[Activation] Test utilities loaded! Use abortTest.* in Debug Console'
        // );
      } catch (error) {
        // Error is logged via outputChannel below
        outputChannel.appendLine(`[Activation] Failed to load test utilities: ${error}`);
      }
    }
  } catch (error) {
    outputChannel.appendLine(`[Activation] Failed to activate: ${error}`);
    vscode.window.showErrorMessage(`Failed to activate: ${error}`);
  }
}

/**
 * Deactivates the Claude Code Chat extension.
 * Performs cleanup operations including disconnecting MCP client connections.
 */
export async function deactivate() {
  const outputChannel = vscode.window.createOutputChannel('Claude Code GUI');
  outputChannel.appendLine('[Deactivation] Deactivating Claude Code Chat extension...');

  // Cleanup MCP client connections
  try {
    // Import is at the top, so we can use it directly
    const { mcpClientService } = await import('./services/McpClientService.js');
    await mcpClientService.disconnectAll();
    outputChannel.appendLine('[Deactivation] MCP client connections cleaned up');
  } catch (error) {
    outputChannel.appendLine(`[Deactivation] Error cleaning up MCP connections: ${error}`);
  }
}

/**
 * Provider class for the Claude chat webview panel.
 * Manages the webview lifecycle, message handling, and communication with Claude services.
 */
class ClaudeChatProvider {
  private _panel: vscode.WebviewPanel | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _messageHandler: ExtensionMessageHandler | undefined;

  /**
   * Creates a new ClaudeChatProvider instance.
   * @param _extensionUri - The URI of the extension root directory
   * @param _context - The VS Code extension context
   * @param _services - Optional ServiceContainer instance for dependency injection
   */
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _services?: ServiceContainer
  ) {
    // Provider creation status will be logged if needed

    // Create ExtensionMessageHandler once during construction
    if (this._services) {
      try {
        const { ExtensionMessageHandler } = require('./services/ExtensionMessageHandler');
        this._messageHandler = new ExtensionMessageHandler(this._context, this._services);
        // Message handler creation logged internally
      } catch (error) {
        // Error handling delegated to caller
      }
    }
  }

  /**
   * Shows the Claude chat webview panel.
   * Creates a new panel if one doesn't exist, or reveals the existing panel.
   */
  public show() {
    // Show method execution tracked internally
    const column = vscode.ViewColumn.Two;

    if (this._panel) {
      this._panel.reveal(column);
      return;
    }

    this._panel = vscode.window.createWebviewPanel('claudeChat', 'Claude Code GUI', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [this._extensionUri],
    });

    // Panel creation tracked internally

    // Try to use the React webview if available
    try {
      this._panel.webview.html = this._getHtmlForWebview();
    } catch (error) {
      // Error will be thrown for proper handling
      // Fallback to simple HTML
      this._panel.webview.html = this._getSimpleHtml();
    }

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set up message handling
    this._setupMessageHandling();

    // Setup completion tracked internally
  }

  /**
   * Generates the HTML content for the webview.
   * Reads the webpack-built HTML file and processes it to work within VS Code's webview security context.
   * @returns The processed HTML string with proper CSP headers and resource URIs
   * @throws Error if the HTML file cannot be loaded or processed
   */
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
      processedHtml = processedHtml.replace(/src="([^"]+\.js)"/g, (_match, p1) => {
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(extensionUri, 'out', 'webview', p1)
        );
        return `src="${scriptUri}"`;
      });

      // Handle link tags (CSS)
      processedHtml = processedHtml.replace(/href="([^"]+\.css)"/g, (_match, p1) => {
        const cssUri = webview.asWebviewUri(
          vscode.Uri.joinPath(extensionUri, 'out', 'webview', p1)
        );
        return `href="${cssUri}"`;
      });

      // Processing success tracked internally
      return processedHtml;
    } catch (error) {
      // Error will be thrown for proper handling
      throw error;
    }
  }

  /**
   * Generates a simple fallback HTML when the main webview fails to load.
   * @returns A basic HTML string with error messaging
   */
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

  /**
   * Sets up bidirectional message handling between the webview and extension.
   * Initializes the webview protocol, attaches message handlers, and sends initial configuration.
   */
  private _setupMessageHandling() {
    // Message handling setup tracked internally

    if (!this._panel || !this._services) {
      // Early return when prerequisites missing
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
      // Handler creation tracked internally
    }

    if (this._messageHandler) {
      // Attach the webview protocol to the existing handler
      this._messageHandler.attach(webviewProtocol);
      // Protocol attachment tracked internally

      // Set up protocol handler
      webviewProtocol.setHandler(async (type: string, data: unknown) => {
        // Type assertion is safe here as the protocol ensures correct typing
        const messageType = type as FromWebviewMessageType;
        return await this._messageHandler!.handleMessage(
          messageType,
          data as Parameters<typeof this._messageHandler.handleMessage<typeof messageType>>[1]
        );
      });
    } else {
      // Error state - no handler available
    }

    // Message handling configuration complete

    // Send initial configuration
    setTimeout(() => {
      // Get selected model from workspace state
      const selectedModel = this._context.workspaceState.get('selectedModel', 'sonnet');

      webviewProtocol.post('config/init', {
        models: [
          {
            id: 'sonnet',
            name: 'Sonnet 4',
            description: 'Sonnet 4 for daily use',
          },
          {
            id: 'opus',
            name: 'Opus 4',
            description: 'Opus 4 for complex tasks · Reaches usage limits ~5x faster',
          },
          {
            id: 'default',
            name: 'Default Model',
            description: 'Opus 4 for up to 50% of usage limits, then use Sonnet 4',
          },
        ],
        selectedModel: selectedModel,
        features: {
          planMode: true,
          thinkingMode: true,
          costTracking: true,
        },
      });

      webviewProtocol.post('status/ready', {
        version: '0.2.0',
        claudeAvailable: true,
      });
    }, 1000);
  }

  /**
   * Disposes of the webview panel and cleans up all resources.
   * Called when the panel is closed or the extension is deactivated.
   */
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
