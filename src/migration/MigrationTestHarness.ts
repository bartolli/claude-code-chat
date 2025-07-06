import * as vscode from 'vscode';
import { ActionMapper } from './ActionMapper';
import { StateComparator } from './StateComparator';
import { FeatureFlagManager } from './FeatureFlags';
import { SimpleStateManager } from '../state/SimpleStateManager';
import { StateManager } from '../state/StateManager';

/**
 * Test harness for safely testing the migration components
 * This allows us to validate the migration without affecting production
 */
export class MigrationTestHarness {
    private context: vscode.ExtensionContext;
    private featureFlags: FeatureFlagManager;
    private actionMapper: ActionMapper;
    private stateComparator?: StateComparator;
    private outputChannel: vscode.OutputChannel;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.featureFlags = FeatureFlagManager.getInstance(context);
        this.actionMapper = new ActionMapper(context);
        this.outputChannel = vscode.window.createOutputChannel('Claude Code - Migration Test');
    }
    
    /**
     * Run a test scenario with migration components
     */
    async runTestScenario(scenarioName: string): Promise<TestResult> {
        this.outputChannel.appendLine(`\n=== Running Test Scenario: ${scenarioName} ===`);
        this.outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
        
        try {
            switch (scenarioName) {
                case 'action-mapping':
                    return await this.testActionMapping();
                case 'comprehensive-actions':
                    return await this.testComprehensiveActions();
                case 'state-comparison':
                    return await this.testStateComparison();
                case 'feature-flags':
                    return await this.testFeatureFlags();
                case 'performance':
                    return await this.testPerformance();
                default:
                    return { success: false, message: 'Unknown test scenario' };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`ERROR: ${message}`);
            return { success: false, message };
        }
    }
    
    /**
     * Test action mapping without affecting production
     */
    private async testActionMapping(): Promise<TestResult> {
        this.outputChannel.appendLine('Testing action mapping...');
        
        // Enable action mapping temporarily
        const originalFlag = this.featureFlags.isEnabled('enableActionMapping');
        await this.featureFlags.setFlag('enableActionMapping', true);
        
        try {
            // Test various action types
            const testActions = [
                { type: 'session/messageAdded', payload: { content: 'test' } },
                { type: 'session/tokensUpdated', payload: { input: 10, output: 5 } },
                { type: 'ui/setReady', payload: { ready: true } },
                { type: 'unknown/action', payload: {} }
            ];
            
            const results: string[] = [];
            
            for (const action of testActions) {
                const result = this.actionMapper.mapAction(action);
                const status = result.success ? '✅' : '❌';
                results.push(`${status} ${action.type}: ${result.success ? 'mapped' : result.error || 'unmapped'}`);
                this.outputChannel.appendLine(`  ${results[results.length - 1]}`);
            }
            
            // Get statistics
            const stats = this.actionMapper.getStatistics();
            this.outputChannel.appendLine(`\nStatistics:`);
            this.outputChannel.appendLine(`  Total actions: ${stats.totalActions}`);
            this.outputChannel.appendLine(`  Success rate: ${stats.successRate.toFixed(1)}%`);
            this.outputChannel.appendLine(`  Unmapped types: ${stats.unmappedActionTypes.join(', ')}`);
            
            return {
                success: true,
                message: 'Action mapping test completed',
                details: { results, stats }
            };
            
        } finally {
            // Restore original flag
            await this.featureFlags.setFlag('enableActionMapping', originalFlag);
            this.actionMapper.clearLog();
        }
    }
    
    /**
     * Test state comparison
     */
    private async testStateComparison(): Promise<TestResult> {
        this.outputChannel.appendLine('Testing state comparison...');
        
        // This requires both state managers to be initialized
        const simpleStateManager = this.context.workspaceState.get<SimpleStateManager>('simpleStateManager');
        const reduxStateManager = StateManager.getInstance();
        
        if (!simpleStateManager) {
            return { 
                success: false, 
                message: 'SimpleStateManager not available in context' 
            };
        }
        
        // Create comparator
        this.stateComparator = new StateComparator(
            simpleStateManager,
            reduxStateManager,
            this.context
        );
        
        // Run comparison
        const result = this.stateComparator.compareStates();
        
        this.outputChannel.appendLine(`\nComparison Results:`);
        this.outputChannel.appendLine(`  Valid: ${result.isValid ? '✅' : '❌'}`);
        this.outputChannel.appendLine(`  Discrepancies: ${result.discrepancies.length}`);
        
        for (const discrepancy of result.discrepancies) {
            this.outputChannel.appendLine(
                `    - ${discrepancy.path} [${discrepancy.severity}]: ` +
                `Simple=${JSON.stringify(discrepancy.simpleValue)} ` +
                `Redux=${JSON.stringify(discrepancy.reduxValue)}`
            );
        }
        
        return {
            success: true,
            message: `State comparison completed with ${result.discrepancies.length} discrepancies`,
            details: {
                isValid: result.isValid,
                discrepancyCount: result.discrepancies.length,
                discrepancies: result.discrepancies,
                timestamp: result.timestamp
            }
        };
    }
    
    /**
     * Test feature flag functionality
     */
    private async testFeatureFlags(): Promise<TestResult> {
        this.outputChannel.appendLine('Testing feature flags...');
        
        const flags = this.featureFlags.getAllFlags();
        this.outputChannel.appendLine('\nCurrent flags:');
        
        for (const [key, value] of Object.entries(flags)) {
            this.outputChannel.appendLine(`  ${key}: ${value}`);
        }
        
        // Test flag toggle
        const testFlag = 'logStateTransitions';
        const original = flags[testFlag];
        await this.featureFlags.setFlag(testFlag, !original);
        const updated = this.featureFlags.isEnabled(testFlag);
        
        this.outputChannel.appendLine(`\nFlag toggle test:`);
        this.outputChannel.appendLine(`  ${testFlag}: ${original} → ${updated}`);
        
        // Restore
        await this.featureFlags.setFlag(testFlag, original);
        
        return {
            success: true,
            message: 'Feature flag test completed',
            details: { flags }
        };
    }
    
    /**
     * Test comprehensive action mapping based on StateManager_Comparison_Analysis.md
     */
    private async testComprehensiveActions(): Promise<TestResult> {
        this.outputChannel.appendLine('Testing comprehensive action mapping...');
        
        // Enable action mapping temporarily
        const originalFlag = this.featureFlags.isEnabled('enableActionMapping');
        await this.featureFlags.setFlag('enableActionMapping', true);
        
        try {
            // Test all actions from the analysis document
            const criticalActions = [
            // Session actions marked with ✅
            { type: 'session/messageAdded', payload: { role: 'user', content: 'test' } },
            { type: 'session/messageUpdated', payload: { content: 'updated' } },
            { type: 'session/messageCompleted', payload: {} },
            { type: 'session/thinkingUpdated', payload: { content: 'thinking...', isActive: true } },
            { type: 'session/toolUseAdded', payload: { toolName: 'test', toolId: 't1', input: {} } },
            { type: 'session/toolResultAdded', payload: { toolId: 't1', result: 'success' } },
            { type: 'session/tokenUsageUpdated', payload: { inputTokens: 10, outputTokens: 5 } },
            
            // Other session actions
            { type: 'session/tokensUpdated', payload: { input: 10, output: 5 } },
            { type: 'session/resumed', payload: { sessionId: 'test-123' } },
            { type: 'session/cleared', payload: { sessionId: 'test-123' } },
            { type: 'session/messageAppended', payload: { content: 'appended' } },
            { type: 'session/modelSelected', payload: { model: 'claude-3' } },
            
            // UI actions
            { type: 'ui/setReady', payload: { ready: true } },
            { type: 'ui/showPermissionRequest', payload: { toolName: 'cmd', toolId: 't1', toolInput: {} } },
            { type: 'ui/showError', payload: { message: 'error' } },
            { type: 'ui/showNotification', payload: { message: 'notify' } },
            { type: 'ui/showPlanProposal', payload: { plan: {} } },
            
            // Claude actions
            { type: 'claude/setProcessing', payload: { processing: true } },
            
            // Other actions
            { type: 'stream/messageReceived', payload: { chunk: {} } },
            { type: 'config/initializeConfig', payload: { config: {} } },
            { type: 'mcp/updateConnectedServers', payload: { servers: [] } }
        ];
        
        const results = {
            mapped: [] as string[],
            customHandler: [] as string[],
            unmapped: [] as string[],
            failed: [] as string[]
        };
        
        for (const action of criticalActions) {
            const result = this.actionMapper.mapAction(action);
            
            if (result.success) {
                results.mapped.push(action.type);
                this.outputChannel.appendLine(`  ✅ ${action.type}: mapped to ${result.mappedAction?.type}`);
            } else if (result.unmapped) {
                results.unmapped.push(action.type);
                this.outputChannel.appendLine(`  ⚠️  ${action.type}: unmapped`);
            } else if (result.error === 'No handler produced action') {
                results.customHandler.push(action.type);
                this.outputChannel.appendLine(`  🔧 ${action.type}: needs custom handler`);
            } else {
                results.failed.push(action.type);
                this.outputChannel.appendLine(`  ❌ ${action.type}: failed - ${result.error}`);
            }
        }
        
            this.outputChannel.appendLine(`\nSummary:`);
            this.outputChannel.appendLine(`  Mapped: ${results.mapped.length} actions`);
            this.outputChannel.appendLine(`  Need custom handler: ${results.customHandler.length} actions`);
            this.outputChannel.appendLine(`  Unmapped: ${results.unmapped.length} actions`);
            this.outputChannel.appendLine(`  Failed: ${results.failed.length} actions`);
            
            const stats = this.actionMapper.getStatistics();
            
            return {
                success: results.failed.length === 0,
                message: `Tested ${criticalActions.length} actions: ${results.mapped.length} mapped, ${results.customHandler.length} need handlers, ${results.unmapped.length} unmapped`,
                details: { results, stats }
            };
        } finally {
            // Restore original flag
            await this.featureFlags.setFlag('enableActionMapping', originalFlag);
        }
    }
    
    /**
     * Test performance impact
     */
    private async testPerformance(): Promise<TestResult> {
        this.outputChannel.appendLine('Testing performance impact...');
        
        // Enable action mapping
        await this.featureFlags.setFlag('enableActionMapping', true);
        
        const iterations = 1000;
        const testAction = { type: 'session/messageAdded', payload: { content: 'perf test' } };
        
        // Measure without mapping
        await this.featureFlags.setFlag('enableActionMapping', false);
        const startWithout = Date.now();
        for (let i = 0; i < iterations; i++) {
            this.actionMapper.mapAction(testAction);
        }
        const timeWithout = Date.now() - startWithout;
        
        // Measure with mapping
        await this.featureFlags.setFlag('enableActionMapping', true);
        const startWith = Date.now();
        for (let i = 0; i < iterations; i++) {
            this.actionMapper.mapAction(testAction);
        }
        const timeWith = Date.now() - startWith;
        
        const overhead = ((timeWith - timeWithout) / timeWithout) * 100;
        
        this.outputChannel.appendLine(`\nPerformance Results:`);
        this.outputChannel.appendLine(`  Without mapping: ${timeWithout}ms (${iterations} actions)`);
        this.outputChannel.appendLine(`  With mapping: ${timeWith}ms (${iterations} actions)`);
        this.outputChannel.appendLine(`  Overhead: ${overhead.toFixed(1)}%`);
        
        // Cleanup
        await this.featureFlags.setFlag('enableActionMapping', false);
        this.actionMapper.clearLog();
        
        return {
            success: true,
            message: `Performance test completed - ${overhead.toFixed(1)}% overhead`,
            details: { timeWithout, timeWith, overhead, iterations }
        };
    }
    
    /**
     * Show test results in output channel
     */
    showOutput(): void {
        this.outputChannel.show();
    }
    
    /**
     * Register test commands
     */
    static registerCommands(context: vscode.ExtensionContext): void {
        const harness = new MigrationTestHarness(context);
        
        // Command to run all tests
        context.subscriptions.push(
            vscode.commands.registerCommand('claude-code-chat.migration.runTests', async () => {
                harness.showOutput();
                
                const scenarios = ['action-mapping', 'feature-flags', 'performance'];
                const results: TestResult[] = [];
                
                for (const scenario of scenarios) {
                    const result = await harness.runTestScenario(scenario);
                    results.push(result);
                }
                
                const successful = results.filter(r => r.success).length;
                const message = `Migration tests completed: ${successful}/${results.length} passed`;
                
                vscode.window.showInformationMessage(message);
            })
        );
        
        // Command to test specific scenario
        context.subscriptions.push(
            vscode.commands.registerCommand('claude-code-chat.migration.testScenario', async () => {
                const scenarios = [
                    { label: 'Action Mapping (Basic)', value: 'action-mapping' },
                    { label: 'Comprehensive Actions Test', value: 'comprehensive-actions' },
                    { label: 'State Comparison', value: 'state-comparison' },
                    { label: 'Feature Flags', value: 'feature-flags' },
                    { label: 'Performance', value: 'performance' }
                ];
                
                const selected = await vscode.window.showQuickPick(scenarios, {
                    placeHolder: 'Select test scenario'
                });
                
                if (selected) {
                    harness.showOutput();
                    const result = await harness.runTestScenario(selected.value);
                    
                    if (result.success) {
                        vscode.window.showInformationMessage(`✅ ${result.message}`);
                    } else {
                        vscode.window.showErrorMessage(`❌ ${result.message}`);
                    }
                }
            })
        );
    }
}

/**
 * Test result interface
 */
export interface TestResult {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}