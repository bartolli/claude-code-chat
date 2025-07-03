import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../core/Logger';

interface ApprovalRecord {
    planHash: string;
    status: 'pending' | 'approved' | 'rejected' | 'refine';
    timestamp: number;
    message?: string;
}

interface ApprovalState {
    approvals: Record<string, ApprovalRecord>;
}

/**
 * Service to manage plan approvals for the MCP server
 */
export class PlanApprovalService {
    private stateFilePath: string;
    private logger: Logger;
    private outputChannel: vscode.OutputChannel;

    constructor(
        private workspaceRoot: string,
        logger: Logger,
        outputChannel: vscode.OutputChannel
    ) {
        this.stateFilePath = path.join(workspaceRoot, '.claude-plan-approval.json');
        this.logger = logger;
        this.outputChannel = outputChannel;
    }

    /**
     * Generate MCP configuration including the plan approval server
     */
    async generateMcpConfig(existingServers?: any): Promise<string> {
        const config = {
            mcpServers: {
                'plan-approval': {
                    command: 'node',
                    args: [
                        path.join(__dirname, '..', 'mcp', 'plan-approval-server.js'),
                        this.workspaceRoot
                    ]
                },
                // Include any existing MCP servers
                ...(existingServers || {})
            }
        };

        const configPath = path.join(this.workspaceRoot, '.claude-code-mcp-temp.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        this.outputChannel.appendLine(`[PlanApproval] Generated MCP config at: ${configPath}`);
        return configPath;
    }

    /**
     * Hash a plan for identification
     */
    private hashPlan(plan: string): string {
        // Simple hash - in production use crypto.createHash('sha256')
        return Buffer.from(plan).toString('base64').substring(0, 16);
    }

    /**
     * Read the current approval state
     */
    private async readState(): Promise<ApprovalState> {
        try {
            const content = await fs.readFile(this.stateFilePath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return { approvals: {} };
        }
    }

    /**
     * Write the approval state
     */
    private async writeState(state: ApprovalState): Promise<void> {
        await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2));
    }

    /**
     * Record that a plan is pending approval
     */
    async recordPendingPlan(plan: string): Promise<string> {
        const planHash = this.hashPlan(plan);
        const state = await this.readState();
        
        state.approvals[planHash] = {
            planHash,
            status: 'pending',
            timestamp: Date.now()
        };
        
        await this.writeState(state);
        this.outputChannel.appendLine(`[PlanApproval] Recorded pending plan: ${planHash}`);
        
        return planHash;
    }

    /**
     * Approve a plan
     */
    async approvePlan(plan: string): Promise<void> {
        const planHash = this.hashPlan(plan);
        const state = await this.readState();
        
        if (state.approvals[planHash]) {
            state.approvals[planHash].status = 'approved';
            state.approvals[planHash].timestamp = Date.now();
            await this.writeState(state);
            
            this.outputChannel.appendLine(`[PlanApproval] Approved plan: ${planHash}`);
        } else {
            // Create approval if it doesn't exist (shouldn't happen normally)
            state.approvals[planHash] = {
                planHash,
                status: 'approved',
                timestamp: Date.now()
            };
            await this.writeState(state);
            
            this.outputChannel.appendLine(`[PlanApproval] Created and approved plan: ${planHash}`);
        }
    }

    /**
     * Reject a plan
     */
    async rejectPlan(plan: string, message?: string): Promise<void> {
        const planHash = this.hashPlan(plan);
        const state = await this.readState();
        
        state.approvals[planHash] = {
            planHash,
            status: 'rejected',
            timestamp: Date.now(),
            message
        };
        
        await this.writeState(state);
        this.outputChannel.appendLine(`[PlanApproval] Rejected plan: ${planHash}`);
    }

    /**
     * Mark a plan for refinement
     */
    async refinePlan(plan: string, message?: string): Promise<void> {
        const planHash = this.hashPlan(plan);
        const state = await this.readState();
        
        state.approvals[planHash] = {
            planHash,
            status: 'refine',
            timestamp: Date.now(),
            message: message || 'User requested refinement'
        };
        
        await this.writeState(state);
        this.outputChannel.appendLine(`[PlanApproval] Marked plan for refinement: ${planHash}`);
    }

    /**
     * Clean up old approvals (older than 1 hour)
     */
    async cleanupOldApprovals(): Promise<void> {
        const state = await this.readState();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        let cleaned = 0;
        for (const [hash, approval] of Object.entries(state.approvals)) {
            if (approval.timestamp < oneHourAgo) {
                delete state.approvals[hash];
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            await this.writeState(state);
            this.outputChannel.appendLine(`[PlanApproval] Cleaned up ${cleaned} old approvals`);
        }
    }

    /**
     * Get CLI arguments for plan mode with MCP
     */
    async getPlanModeArgs(): Promise<string[]> {
        // Clean up old approvals first
        await this.cleanupOldApprovals();
        
        // Generate MCP config
        const mcpConfigPath = await this.generateMcpConfig();
        
        return [
            '--permission-mode', 'plan',
            '--mcp-config', mcpConfigPath,
            '--permission-prompt-tool', 'mcp__plan-approval__check_plan_approval',
            '--allowedTools', 'exit_plan_mode,mcp__plan-approval__check_plan_approval'
        ];
    }
}