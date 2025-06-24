/**
 * Service for managing VS Code configuration
 */

import * as vscode from 'vscode';
import { getLogger } from '../core/Logger';
import { ModelType } from '../types/claude';

export interface ClaudeCodeChatConfig {
  wsl: {
    enabled: boolean;
    distro: string;
    nodePath: string;
    claudePath: string;
  };
  thinking: {
    intensity: 'think' | 'think-hard' | 'think-harder' | 'ultrathink';
  };
}

export class ConfigService {
  private static readonly logger = getLogger();
  private static readonly CONFIG_SECTION = 'claudeCodeChatModern';
  private disposables: vscode.Disposable[] = [];
  private configChangeListeners: ((config: ClaudeCodeChatConfig) => void)[] = [];

  constructor() {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
          ConfigService.logger.info('ConfigService', 'Configuration changed');
          this.notifyConfigChange();
        }
      })
    );
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ClaudeCodeChatConfig {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
    
    return {
      wsl: {
        enabled: config.get<boolean>('wsl.enabled', false),
        distro: config.get<string>('wsl.distro', 'Ubuntu'),
        nodePath: config.get<string>('wsl.nodePath', '/usr/bin/node'),
        claudePath: config.get<string>('wsl.claudePath', '/usr/local/bin/claude')
      },
      thinking: {
        intensity: config.get<'think' | 'think-hard' | 'think-harder' | 'ultrathink'>('thinking.intensity', 'think')
      }
    };
  }

  /**
   * Get a specific configuration value
   */
  public get<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
    return config.get<T>(key, defaultValue);
  }

  /**
   * Update a configuration value
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
   */
  public getWslConfig(): ClaudeCodeChatConfig['wsl'] {
    return this.getConfig().wsl;
  }

  /**
   * Check if WSL is enabled
   */
  public isWslEnabled(): boolean {
    return this.getConfig().wsl.enabled;
  }

  /**
   * Get thinking intensity
   */
  public getThinkingIntensity(): string {
    return this.getConfig().thinking.intensity;
  }

  /**
   * Get the selected model from VS Code settings or return default
   */
  public getSelectedModel(): ModelType {
    // Return 'default' to let Claude Code CLI use its configured model
    // The actual model selection happens through Claude's /model command
    return 'default';
  }

  /**
   * Add a configuration change listener
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
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
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
   * Dispose resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.configChangeListeners = [];
  }

  private notifyConfigChange(): void {
    const config = this.getConfig();
    this.configChangeListeners.forEach(listener => {
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