/**
 * Service for managing VS Code configuration
 */

import * as vscode from 'vscode';
import { getLogger } from '../core/Logger';
import { ModelType } from '../types/claude';

/**
 * Configuration interface for Claude Code Chat extension
 */
export interface ClaudeCodeChatConfig {
  /**
   * WSL (Windows Subsystem for Linux) configuration
   */
  wsl: {
    /**
     * Whether WSL mode is enabled for running Claude commands
     */
    enabled: boolean;
    /**
     * The name of the WSL distribution to use (e.g., 'Ubuntu', 'Debian')
     */
    distro: string;
    /**
     * Path to Node.js executable within the WSL distribution
     */
    nodePath: string;
    /**
     * Path to Claude CLI executable within the WSL distribution
     */
    claudePath: string;
  };
  /**
   * Thinking mode configuration
   */
  thinking: {
    /**
     * The intensity level for Claude's thinking mode
     * - 'think': Standard thinking mode
     * - 'think-hard': Enhanced thinking mode
     * - 'think-harder': Deep thinking mode
     * - 'ultrathink': Maximum thinking mode
     */
    intensity: 'think' | 'think-hard' | 'think-harder' | 'ultrathink';
  };
}

/**
 * Service for managing VS Code configuration for the Claude Code Chat extension.
 * Handles reading, writing, and validating extension settings.
 */
export class ConfigService {
  private static readonly logger = getLogger();
  private static readonly CONFIG_SECTION = 'claudeCodeChatModern';
  private disposables: vscode.Disposable[] = [];
  private configChangeListeners: ((config: ClaudeCodeChatConfig) => void)[] = [];

  /**
   * Creates a new ConfigService instance and sets up configuration change listeners
   */
  constructor() {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
          ConfigService.logger.info('ConfigService', 'Configuration changed');
          this.notifyConfigChange();
        }
      })
    );
  }

  /**
   * Get the current configuration
   * @returns The complete configuration object for the extension
   */
  public getConfig(): ClaudeCodeChatConfig {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

    return {
      wsl: {
        enabled: config.get<boolean>('wsl.enabled', false),
        distro: config.get<string>('wsl.distro', 'Ubuntu'),
        nodePath: config.get<string>('wsl.nodePath', '/usr/bin/node'),
        claudePath: config.get<string>('wsl.claudePath', '/usr/local/bin/claude'),
      },
      thinking: {
        intensity: config.get<'think' | 'think-hard' | 'think-harder' | 'ultrathink'>(
          'thinking.intensity',
          'think'
        ),
      },
    };
  }

  /**
   * Get a specific configuration value
   * @param key - The configuration key to retrieve
   * @param defaultValue - The default value to return if the key is not found
   * @returns The configuration value or the default value
   */
  public get<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
    return config.get<T>(key, defaultValue);
  }

  /**
   * Update a configuration value
   * @param key - The configuration key to update
   * @param value - The new value to set
   * @param global - Whether to update the global configuration (true) or workspace configuration (false)
   * @returns A promise that resolves when the configuration is updated
   */
  public async update(key: string, value: any, global = true): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

    await config.update(
      key,
      value,
      global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace
    );

    ConfigService.logger.info('ConfigService', 'Configuration updated', { key, value, global });
  }

  /**
   * Get WSL configuration
   * @returns The WSL configuration object containing enabled state, distro, and paths
   */
  public getWslConfig(): ClaudeCodeChatConfig['wsl'] {
    return this.getConfig().wsl;
  }

  /**
   * Check if WSL is enabled
   * @returns True if WSL mode is enabled, false otherwise
   */
  public isWslEnabled(): boolean {
    return this.getConfig().wsl.enabled;
  }

  /**
   * Get thinking intensity
   * @returns The current thinking intensity level as a string
   */
  public getThinkingIntensity(): string {
    return this.getConfig().thinking.intensity;
  }

  /**
   * Get the selected model from VS Code settings or return default
   * @returns The selected model type, always returns 'default' to let Claude CLI use its configured model
   */
  public getSelectedModel(): ModelType {
    // Return 'default' to let Claude Code CLI use its configured model
    // The actual model selection happens through Claude's /model command
    return 'default';
  }

  /**
   * Add a configuration change listener
   * @param listener - Callback function to be called when configuration changes
   * @returns A disposable to remove the listener
   */
  public onConfigChange(listener: (config: ClaudeCodeChatConfig) => void): vscode.Disposable {
    this.configChangeListeners.push(listener);

    return new vscode.Disposable(() => {
      const index = this.configChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.configChangeListeners.splice(index, 1);
      }
    });
  }

  /**
   * Validate configuration
   * @returns An object containing validation status and any error messages
   */
  public validateConfig(): {
    /**
     * Whether the configuration is valid
     */
    valid: boolean;
    /**
     * Array of validation error messages
     */
    errors: string[];
  } {
    const config = this.getConfig();
    const errors: string[] = [];

    // Validate WSL configuration if enabled
    if (config.wsl.enabled) {
      if (!config.wsl.distro || config.wsl.distro.trim() === '') {
        errors.push('WSL distro name is required when WSL is enabled');
      }

      if (!config.wsl.nodePath || config.wsl.nodePath.trim() === '') {
        errors.push('WSL Node.js path is required when WSL is enabled');
      }

      if (!config.wsl.claudePath || config.wsl.claudePath.trim() === '') {
        errors.push('WSL Claude path is required when WSL is enabled');
      }
    }

    // Validate thinking intensity
    const validIntensities = ['think', 'think-hard', 'think-harder', 'ultrathink'];
    if (!validIntensities.includes(config.thinking.intensity)) {
      errors.push(`Invalid thinking intensity: ${config.thinking.intensity}`);
    }

    const valid = errors.length === 0;

    if (!valid) {
      ConfigService.logger.warn('ConfigService', 'Configuration validation failed', { errors });
    }

    return { valid, errors };
  }

  /**
   * Reset configuration to defaults
   * @returns A promise that resolves when all configuration values are reset
   */
  public async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

    // Get all keys
    const inspection = config.inspect('');
    if (inspection) {
      // Clear workspace and global values
      for (const key of Object.keys(inspection)) {
        await config.update(key, undefined, vscode.ConfigurationTarget.Global);
        await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
      }
    }

    ConfigService.logger.info('ConfigService', 'Configuration reset to defaults');
  }

  /**
   * Dispose resources and clean up listeners
   */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.configChangeListeners = [];
  }

  /**
   * Notify all registered listeners about configuration changes
   */
  private notifyConfigChange(): void {
    const config = this.getConfig();
    this.configChangeListeners.forEach((listener) => {
      try {
        listener(config);
      } catch (error) {
        ConfigService.logger.error(
          'ConfigService',
          'Error in config change listener',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }
}
