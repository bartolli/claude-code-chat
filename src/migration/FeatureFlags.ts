import * as vscode from 'vscode';

/**
 * Feature flags for safe StateManager migration
 * These flags allow gradual rollout and quick rollback
 */
export interface MigrationFeatureFlags {
  /** Whether to use Redux StateManager instead of SimpleStateManager */
  useReduxStateManager: boolean;
  /** Enable parallel state validation during migration */
  enableParallelStateValidation: boolean;
  /** Log all state transitions for debugging */
  logStateTransitions: boolean;
  /** Enable webview action mapping to Redux actions */
  enableActionMapping: boolean;

  /** Use StateManager for read operations */
  useStateManagerForReads: boolean;
  /** Use StateManager for write operations */
  useStateManagerForWrites: boolean;
  /** Use StateManager for session management */
  useStateManagerForSessions: boolean;
  /** Use StateManager for message handling */
  useStateManagerForMessages: boolean;
  /** Use StateManager for tool operations */
  useStateManagerForTools: boolean;
  /** Use StateManager for token tracking */
  useStateManagerForTokens: boolean;

  /** Log unmapped webview actions */
  logUnmappedActions: boolean;
  /** Log state discrepancies between managers */
  logStateDiscrepancies: boolean;
  /** Enable performance metrics collection */
  enablePerformanceMetrics: boolean;

  /** Rollout percentage for gradual deployment (0-100) */
  rolloutPercentage: number;
}

/**
 * Manages feature flags for safe StateManager migration
 * Provides singleton access and gradual rollout capabilities
 */
export class FeatureFlagManager {
  /** Singleton instance */
  private static instance: FeatureFlagManager;
  /** Current feature flag values */
  private flags: MigrationFeatureFlags;
  /** VS Code extension context */
  private context: vscode.ExtensionContext;
  /** Stable hash for user rollout determination */
  private userHash: string;

  /**
   * Private constructor for singleton pattern
   * @param context VS Code extension context
   */
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.userHash = this.generateUserHash();
    this.flags = this.loadFlags();
  }

  /**
   * Get singleton instance
   * @param context VS Code extension context (required for first call)
   * @returns FeatureFlagManager instance
   */
  static getInstance(context?: vscode.ExtensionContext): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      if (!context) {
        throw new Error('Context required for first initialization');
      }
      FeatureFlagManager.instance = new FeatureFlagManager(context);
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Load flags from VS Code settings and workspace state
   * @returns Merged feature flag configuration
   */
  private loadFlags(): MigrationFeatureFlags {
    const config = vscode.workspace.getConfiguration('claude-code-chat.migration');
    const workspaceOverrides = this.context.workspaceState.get<Partial<MigrationFeatureFlags>>(
      'migrationFlags',
      {}
    );

    // Default flags (all disabled for safety)
    const defaults: MigrationFeatureFlags = {
      useReduxStateManager: false,
      enableParallelStateValidation: false,
      logStateTransitions: false,
      enableActionMapping: false,
      useStateManagerForReads: false,
      useStateManagerForWrites: false,
      useStateManagerForSessions: false,
      useStateManagerForMessages: false,
      useStateManagerForTools: false,
      useStateManagerForTokens: false,
      logUnmappedActions: true,
      logStateDiscrepancies: true,
      enablePerformanceMetrics: true,
      rolloutPercentage: 0,
    };

    // Merge configuration sources
    return {
      ...defaults,
      ...this.getConfigFlags(config),
      ...workspaceOverrides,
    };
  }

  /**
   * Get flags from VS Code configuration
   * @param config VS Code workspace configuration
   * @returns Partial feature flags from configuration
   */
  private getConfigFlags(config: vscode.WorkspaceConfiguration): Partial<MigrationFeatureFlags> {
    const flags: Partial<MigrationFeatureFlags> = {};

    // Read each flag from config
    const flagKeys = Object.keys(this.getDefaultFlags()) as (keyof MigrationFeatureFlags)[];
    for (const key of flagKeys) {
      const value = config.get(key);
      if (value !== undefined) {
        (flags as any)[key] = value;
      }
    }

    return flags;
  }

  /**
   * Get default flag values
   * @returns Default feature flag configuration
   */
  private getDefaultFlags(): MigrationFeatureFlags {
    return {
      useReduxStateManager: false,
      enableParallelStateValidation: false,
      logStateTransitions: false,
      enableActionMapping: false,
      useStateManagerForReads: false,
      useStateManagerForWrites: false,
      useStateManagerForSessions: false,
      useStateManagerForMessages: false,
      useStateManagerForTools: false,
      useStateManagerForTokens: false,
      logUnmappedActions: true,
      logStateDiscrepancies: true,
      enablePerformanceMetrics: true,
      rolloutPercentage: 0,
    };
  }

  /**
   * Generate a stable hash for the current user
   * @returns Hexadecimal hash string
   */
  private generateUserHash(): string {
    const machineId = vscode.env.machineId;
    const sessionId = vscode.env.sessionId;
    const combined = `${machineId}-${sessionId}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Check if a feature is enabled
   * @param flag Feature flag to check
   * @returns Whether the feature is enabled
   */
  isEnabled(flag: keyof MigrationFeatureFlags): boolean {
    // Check rollout percentage first
    if (flag === 'useReduxStateManager' && !this.isInRollout()) {
      return false;
    }

    return this.flags[flag] as boolean;
  }

  /**
   * Check if user is in the rollout percentage
   * @returns Whether user is included in rollout
   */
  private isInRollout(): boolean {
    const userHashNum = parseInt(this.userHash.slice(0, 8), 16);
    const userPercentage = (userHashNum % 100) + 1;
    return userPercentage <= this.flags.rolloutPercentage;
  }

  /**
   * Get all current flag values
   * @returns Copy of all feature flags
   */
  getAllFlags(): MigrationFeatureFlags {
    return { ...this.flags };
  }

  /**
   * Update a flag value (for testing/debugging)
   * @param flag Feature flag to update
   * @param value New value for the flag
   */
  async setFlag(flag: keyof MigrationFeatureFlags, value: boolean | number): Promise<void> {
    (this.flags as any)[flag] = value;

    // Save to workspace state
    await this.context.workspaceState.update('migrationFlags', this.flags);

    // Log flag change
    this.logFlagChange(flag, value);
  }

  /**
   * Reset all flags to defaults
   */
  async resetFlags(): Promise<void> {
    this.flags = this.getDefaultFlags();
    await this.context.workspaceState.update('migrationFlags', undefined);
  }

  /**
   * Enable gradual rollout
   * @param percentage Rollout percentage (0-100)
   */
  async enableGradualRollout(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    await this.setFlag('rolloutPercentage', percentage);

    // Log rollout change through proper channel
    const channel = vscode.window.createOutputChannel('Claude Code Chat - Migration');
    channel.appendLine(`StateManager migration rollout set to ${percentage}%`);
  }

  /**
   * Log flag changes for monitoring
   * @param flag Name of the changed flag
   * @param value New value of the flag
   */
  private logFlagChange(flag: string, value: boolean | number): void {
    const channel = vscode.window.createOutputChannel('Claude Code Chat - Migration');
    channel.appendLine(`[${new Date().toISOString()}] Feature flag changed: ${flag} = ${value}`);

    // Also log to telemetry if available
    if (this.flags.enablePerformanceMetrics) {
      // TODO: Add telemetry logging
    }
  }

  /**
   * Create VS Code commands for flag management
   * @param context VS Code extension context for command registration
   */
  static registerCommands(context: vscode.ExtensionContext): void {
    const flags = FeatureFlagManager.getInstance(context);

    // Command to show current flags
    context.subscriptions.push(
      vscode.commands.registerCommand('claude-code-chat.migration.showFlags', () => {
        const currentFlags = flags.getAllFlags();
        vscode.window.showInformationMessage(
          `Migration Flags: ${JSON.stringify(currentFlags, null, 2)}`
        );
      })
    );

    // Command to enable/disable StateManager
    context.subscriptions.push(
      vscode.commands.registerCommand('claude-code-chat.migration.toggleStateManager', async () => {
        const current = flags.isEnabled('useReduxStateManager');
        await flags.setFlag('useReduxStateManager', !current);
        vscode.window.showInformationMessage(
          `Redux StateManager ${!current ? 'enabled' : 'disabled'}`
        );
      })
    );

    // Command to reset flags
    context.subscriptions.push(
      vscode.commands.registerCommand('claude-code-chat.migration.resetFlags', async () => {
        await flags.resetFlags();
        vscode.window.showInformationMessage('Migration flags reset to defaults');
      })
    );
  }
}

/**
 * Helper function to check feature flags
 * @param flag Feature flag to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(flag: keyof MigrationFeatureFlags): boolean {
  try {
    return FeatureFlagManager.getInstance().isEnabled(flag);
  } catch {
    // If not initialized, return false (safe default)
    return false;
  }
}
