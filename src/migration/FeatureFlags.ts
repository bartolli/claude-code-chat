import * as vscode from 'vscode';

/**
 * Feature flags for safe StateManager migration
 * These flags allow gradual rollout and quick rollback
 */
export interface MigrationFeatureFlags {
    // Core migration flags
    useReduxStateManager: boolean;
    enableParallelStateValidation: boolean;
    logStateTransitions: boolean;
    enableActionMapping: boolean;
    
    // Granular feature flags
    useStateManagerForReads: boolean;
    useStateManagerForWrites: boolean;
    useStateManagerForSessions: boolean;
    useStateManagerForMessages: boolean;
    useStateManagerForTools: boolean;
    useStateManagerForTokens: boolean;
    
    // Debug flags
    logUnmappedActions: boolean;
    logStateDiscrepancies: boolean;
    enablePerformanceMetrics: boolean;
    
    // Rollout percentage (0-100)
    rolloutPercentage: number;
}

export class FeatureFlagManager {
    private static instance: FeatureFlagManager;
    private flags: MigrationFeatureFlags;
    private context: vscode.ExtensionContext;
    private userHash: string;
    
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.userHash = this.generateUserHash();
        this.flags = this.loadFlags();
    }
    
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
     */
    private loadFlags(): MigrationFeatureFlags {
        const config = vscode.workspace.getConfiguration('claude-code-chat.migration');
        const workspaceOverrides = this.context.workspaceState.get<Partial<MigrationFeatureFlags>>('migrationFlags', {});
        
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
            rolloutPercentage: 0
        };
        
        // Merge configuration sources
        return {
            ...defaults,
            ...this.getConfigFlags(config),
            ...workspaceOverrides
        };
    }
    
    /**
     * Get flags from VS Code configuration
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
            rolloutPercentage: 0
        };
    }
    
    /**
     * Generate a stable hash for the current user
     */
    private generateUserHash(): string {
        const machineId = vscode.env.machineId;
        const sessionId = vscode.env.sessionId;
        const combined = `${machineId}-${sessionId}`;
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }
    
    /**
     * Check if a feature is enabled
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
     */
    private isInRollout(): boolean {
        const userHashNum = parseInt(this.userHash.slice(0, 8), 16);
        const userPercentage = (userHashNum % 100) + 1;
        return userPercentage <= this.flags.rolloutPercentage;
    }
    
    /**
     * Get all current flag values
     */
    getAllFlags(): MigrationFeatureFlags {
        return { ...this.flags };
    }
    
    /**
     * Update a flag value (for testing/debugging)
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
     */
    async enableGradualRollout(percentage: number): Promise<void> {
        if (percentage < 0 || percentage > 100) {
            throw new Error('Rollout percentage must be between 0 and 100');
        }
        
        await this.setFlag('rolloutPercentage', percentage);
        console.log(`StateManager migration rollout set to ${percentage}%`);
    }
    
    /**
     * Log flag changes for monitoring
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
 */
export function isFeatureEnabled(flag: keyof MigrationFeatureFlags): boolean {
    try {
        return FeatureFlagManager.getInstance().isEnabled(flag);
    } catch {
        // If not initialized, return false (safe default)
        return false;
    }
}