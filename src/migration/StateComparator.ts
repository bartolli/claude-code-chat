import * as vscode from 'vscode';
import { SimpleStateManager } from '../state/SimpleStateManager';
import { StateManager } from '../state/StateManager';
import { RootState } from '../state/store';
import { FeatureFlagManager } from './FeatureFlags';

/**
 * State discrepancy between SimpleStateManager and Redux
 */
export interface StateDiscrepancy {
  /** Path to the discrepant value */
  path: string;
  /** Value from SimpleStateManager */
  simpleValue: any;
  /** Value from Redux StateManager */
  reduxValue: any;
  /** When discrepancy was detected */
  timestamp: Date;
  /** Severity level of the discrepancy */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Result of state validation
 */
export interface ValidationResult {
  /** Whether states are consistent */
  isValid: boolean;
  /** List of found discrepancies */
  discrepancies: StateDiscrepancy[];
  /** Paths that were validated */
  validatedPaths: string[];
  /** When validation was performed */
  timestamp: Date;
}

/**
 * Utility for comparing state between SimpleStateManager and Redux StateManager
 * This ensures correctness during the migration
 */
export class StateComparator {
  /** SimpleStateManager instance */
  private simpleStateManager: SimpleStateManager;
  /** Redux StateManager instance */
  private reduxStateManager: StateManager;
  /** VS Code output channel for logging */
  private outputChannel: vscode.OutputChannel;
  /** Log of all detected discrepancies */
  private discrepancyLog: StateDiscrepancy[] = [];
  /** Feature flag manager */
  private featureFlags: FeatureFlagManager;

  /**
   * Initialize state comparator
   * @param simpleStateManager SimpleStateManager instance
   * @param reduxStateManager Redux StateManager instance
   * @param context VS Code extension context
   */
  constructor(
    simpleStateManager: SimpleStateManager,
    reduxStateManager: StateManager,
    context: vscode.ExtensionContext
  ) {
    this.simpleStateManager = simpleStateManager;
    this.reduxStateManager = reduxStateManager;
    this.outputChannel = vscode.window.createOutputChannel('Claude Code - State Validation');
    this.featureFlags = FeatureFlagManager.getInstance(context);
  }

  /**
   * Compare complete state between both managers
   * @returns Validation result with discrepancies
   */
  compareStates(): ValidationResult {
    const simpleState = this.simpleStateManager.getState();
    const reduxState = this.reduxStateManager.getState();

    const discrepancies: StateDiscrepancy[] = [];
    const validatedPaths: string[] = [];

    // Compare session data
    this.compareSessionData(simpleState, reduxState, discrepancies, validatedPaths);

    // Compare UI state
    this.compareUIState(simpleState, reduxState, discrepancies, validatedPaths);

    // Compare configuration
    this.compareConfiguration(simpleState, reduxState, discrepancies, validatedPaths);

    // Log results if enabled
    if (this.featureFlags.isEnabled('logStateDiscrepancies') && discrepancies.length > 0) {
      this.logDiscrepancies(discrepancies);
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies,
      validatedPaths,
      timestamp: new Date(),
    };
  }

  /**
   * Compare session-related state
   * @param _simpleState Simple state manager state (unused)
   * @param reduxState Redux state to compare
   * @param discrepancies Array to collect discrepancies
   * @param validatedPaths Array to track validated paths
   */
  private compareSessionData(
    _simpleState: any,
    reduxState: RootState,
    discrepancies: StateDiscrepancy[],
    validatedPaths: string[]
  ): void {
    // Current session ID
    const path = 'currentSessionId';
    validatedPaths.push(path);

    const simpleSessionId = this.simpleStateManager.getCurrentSessionId();
    const reduxSessionId = reduxState.session.currentSessionId;

    if (simpleSessionId !== reduxSessionId) {
      discrepancies.push({
        path,
        simpleValue: simpleSessionId,
        reduxValue: reduxSessionId,
        timestamp: new Date(),
        severity: 'critical',
      });
    }

    // Session list
    const sessionsPath = 'sessions';
    validatedPaths.push(sessionsPath);

    // Compare session counts (SimpleStateManager doesn't store full sessions)
    const reduxSessionCount = Object.keys(reduxState.session.sessions).length;
    if (simpleSessionId && reduxSessionCount === 0) {
      discrepancies.push({
        path: 'sessions.count',
        simpleValue: 1,
        reduxValue: 0,
        timestamp: new Date(),
        severity: 'high',
      });
    }
  }

  /**
   * Compare UI state
   * @param _simpleState Simple state manager state (unused)
   * @param reduxState Redux state to compare
   * @param discrepancies Array to collect discrepancies
   * @param validatedPaths Array to track validated paths
   */
  private compareUIState(
    _simpleState: any,
    reduxState: RootState,
    discrepancies: StateDiscrepancy[],
    validatedPaths: string[]
  ): void {
    // Webview ready state
    const readyPath = 'ui.webviewReady';
    validatedPaths.push(readyPath);

    const simpleReady = this.simpleStateManager.isWebviewReady();
    const reduxReady = reduxState.ui.isWebviewReady;

    if (simpleReady !== reduxReady) {
      discrepancies.push({
        path: readyPath,
        simpleValue: simpleReady,
        reduxValue: reduxReady,
        timestamp: new Date(),
        severity: 'medium',
      });
    }

    // Claude running state
    const runningPath = 'ui.claudeRunning';
    validatedPaths.push(runningPath);

    const reduxRunning = reduxState.ui.isClaudeRunning;
    // SimpleStateManager doesn't track this, so we only validate if Redux has it set
    if (reduxRunning === true) {
      discrepancies.push({
        path: runningPath,
        simpleValue: undefined,
        reduxValue: reduxRunning,
        timestamp: new Date(),
        severity: 'low',
      });
    }
  }

  /**
   * Compare configuration state
   * @param _simpleState Simple state manager state (unused)
   * @param reduxState Redux state to compare
   * @param discrepancies Array to collect discrepancies
   * @param validatedPaths Array to track validated paths
   */
  private compareConfiguration(
    _simpleState: any,
    reduxState: RootState,
    discrepancies: StateDiscrepancy[],
    validatedPaths: string[]
  ): void {
    // Selected model
    const modelPath = 'config.selectedModel';
    validatedPaths.push(modelPath);

    const simpleModel = this.simpleStateManager.getSelectedModel();
    const reduxModel = reduxState.config?.selectedModel;

    if (simpleModel !== reduxModel) {
      discrepancies.push({
        path: modelPath,
        simpleValue: simpleModel,
        reduxValue: reduxModel,
        timestamp: new Date(),
        severity: 'high',
      });
    }
  }

  /**
   * Log discrepancies to output channel
   * @param discrepancies Array of discrepancies to log
   */
  logDiscrepancies(discrepancies: StateDiscrepancy[]): void {
    this.outputChannel.appendLine(`\n[${new Date().toISOString()}] State Validation Results`);
    this.outputChannel.appendLine(`Found ${discrepancies.length} discrepancies:`);

    for (const discrepancy of discrepancies) {
      const severity = discrepancy.severity.toUpperCase();
      this.outputChannel.appendLine(
        `  [${severity}] ${discrepancy.path}: ` +
          `Simple=${JSON.stringify(discrepancy.simpleValue)} ` +
          `Redux=${JSON.stringify(discrepancy.reduxValue)}`
      );
    }

    // Store in log for later analysis
    this.discrepancyLog.push(...discrepancies);
  }

  /**
   * Create a state snapshot for debugging
   * @returns State snapshot with metadata
   */
  createSnapshot(): StateSnapshot {
    const simpleState = this.simpleStateManager.getState();
    const reduxState = this.reduxStateManager.getState();

    return {
      timestamp: new Date(),
      simpleState: this.sanitizeState(simpleState),
      reduxState: this.sanitizeState(reduxState),
      metadata: {
        simpleSessionId: this.simpleStateManager.getCurrentSessionId(),
        reduxSessionId: reduxState.session.currentSessionId || null,
        simpleWebviewReady: this.simpleStateManager.isWebviewReady(),
        reduxWebviewReady: reduxState.ui.isWebviewReady,
      },
    };
  }

  /**
   * Sanitize state for safe logging (remove sensitive data)
   * @param state State object to sanitize
   * @returns Sanitized state object
   */
  private sanitizeState(state: any): any {
    const sanitized = { ...state };

    // Remove API keys and sensitive data
    if (sanitized.config?.apiKey) {
      sanitized.config.apiKey = '[REDACTED]';
    }

    // Remove message content if needed
    if (sanitized.sessions) {
      // Deep clone and sanitize
      sanitized.sessions = JSON.parse(JSON.stringify(sanitized.sessions));
      // You could remove message content here if needed
    }

    return sanitized;
  }

  /**
   * Validate a specific operation occurred correctly in both states
   * @param operation Operation to execute and validate
   * @param validationChecks Array of validation checks to run
   * @returns Whether all validations passed
   */
  async validateOperation(
    operation: () => Promise<void>,
    validationChecks: ValidationCheck[]
  ): Promise<boolean> {
    // Take before snapshot
    const beforeSnapshot = this.createSnapshot();

    // Execute operation
    await operation();

    // Allow state to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take after snapshot
    const afterSnapshot = this.createSnapshot();

    // Run validation checks
    let allValid = true;
    for (const check of validationChecks) {
      const result = check(beforeSnapshot, afterSnapshot);
      if (!result.valid) {
        this.outputChannel.appendLine(`Validation failed for ${check.name}: ${result.message}`);
        allValid = false;
      }
    }

    return allValid;
  }

  /**
   * Get discrepancy statistics
   * @returns Statistics about detected discrepancies
   */
  getDiscrepancyStats(): DiscrepancyStats {
    const stats: DiscrepancyStats = {
      total: this.discrepancyLog.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byPath: {},
    };

    for (const discrepancy of this.discrepancyLog) {
      stats.bySeverity[discrepancy.severity]++;

      if (!stats.byPath[discrepancy.path]) {
        stats.byPath[discrepancy.path] = 0;
      }
      stats.byPath[discrepancy.path]++;
    }

    return stats;
  }

  /**
   * Clear discrepancy log
   */
  clearLog(): void {
    this.discrepancyLog = [];
  }

  /**
   * Export validation report
   * @returns JSON string with validation report
   */
  exportReport(): string {
    const stats = this.getDiscrepancyStats();
    const report = {
      generated: new Date().toISOString(),
      stats,
      recentDiscrepancies: this.discrepancyLog.slice(-100),
      recommendations: this.generateRecommendations(stats),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate migration recommendations based on discrepancies
   * @param stats Discrepancy statistics
   * @returns Array of recommendation strings
   */
  private generateRecommendations(stats: DiscrepancyStats): string[] {
    const recommendations: string[] = [];

    if (stats.bySeverity.critical > 0) {
      recommendations.push(
        'CRITICAL: Address critical discrepancies before proceeding with migration'
      );
    }

    if (stats.bySeverity.high > 5) {
      recommendations.push(
        'HIGH: Multiple high-severity discrepancies detected - review state sync logic'
      );
    }

    if (stats.byPath['currentSessionId'] > 0) {
      recommendations.push(
        'Session management needs attention - session IDs are not syncing correctly'
      );
    }

    if (stats.total === 0) {
      recommendations.push('✅ No discrepancies found - safe to proceed with migration');
    }

    return recommendations;
  }
}

/**
 * State snapshot for debugging
 */
export interface StateSnapshot {
  /** When snapshot was taken */
  timestamp: Date;
  /** SimpleStateManager state */
  simpleState: any;
  /** Redux state */
  reduxState: any;
  /** Additional metadata for comparison */
  metadata: {
    /** Session ID from SimpleStateManager */
    simpleSessionId: string | null;
    /** Session ID from Redux */
    reduxSessionId: string | null;
    /** Webview ready state from SimpleStateManager */
    simpleWebviewReady: boolean;
    /** Webview ready state from Redux */
    reduxWebviewReady: boolean;
  };
}

/**
 * Validation check function
 */
export interface ValidationCheck {
  /** Name of the validation check */
  name: string;
  (
    before: StateSnapshot,
    after: StateSnapshot
  ): {
    /** Whether validation passed */
    valid: boolean;
    /** Optional validation message */
    message?: string;
  };
}

/**
 * Discrepancy statistics
 */
export interface DiscrepancyStats {
  /** Total number of discrepancies */
  total: number;
  /** Discrepancies grouped by severity */
  bySeverity: {
    /** Low severity discrepancies */
    low: number;
    /** Medium severity discrepancies */
    medium: number;
    /** High severity discrepancies */
    high: number;
    /** Critical severity discrepancies */
    critical: number;
  };
  /** Discrepancies grouped by path */
  byPath: { [path: string]: number };
}

/**
 * Pre-built validation checks
 */
export const ValidationChecks = {
  sessionCreated: (before: StateSnapshot, after: StateSnapshot) => {
    const beforeSessionId = before.metadata.simpleSessionId;
    const afterSessionId = after.metadata.simpleSessionId;
    const reduxSessionId = after.metadata.reduxSessionId;

    return {
      valid: afterSessionId !== null && afterSessionId === reduxSessionId,
      message: `Session IDs don't match: Simple=${afterSessionId}, Redux=${reduxSessionId}`,
    };
  },

  webviewReady: (_before: StateSnapshot, after: StateSnapshot) => {
    return {
      valid: after.metadata.simpleWebviewReady === after.metadata.reduxWebviewReady,
      message: `Webview ready states don't match`,
    };
  },
};
