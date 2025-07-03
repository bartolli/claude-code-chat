#!/usr/bin/env node
/**
 * MCP Server for Plan Approval
 * 
 * This server provides a permission tool that Claude uses to check
 * if a plan has been approved by the user before proceeding with implementation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Schema for the approval state file
const ApprovalStateSchema = z.object({
  approvals: z.record(z.object({
    planHash: z.string(),
    status: z.enum(['pending', 'approved', 'rejected', 'refine']),
    timestamp: z.number(),
    message: z.string().optional(),
  }))
});

type ApprovalState = z.infer<typeof ApprovalStateSchema>;

class PlanApprovalServer {
  private server: Server;
  private stateFilePath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'plan-approval',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Get workspace root from command line argument
    const workspaceRoot = process.argv[2] || process.cwd();
    this.stateFilePath = path.join(workspaceRoot, '.claude-plan-approval.json');

    this.setupHandlers();
  }

  private async readState(): Promise<ApprovalState> {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      return ApprovalStateSchema.parse(JSON.parse(content));
    } catch {
      // Return empty state if file doesn't exist
      return { approvals: {} };
    }
  }

  private async writeState(state: ApprovalState): Promise<void> {
    await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2));
  }

  private hashPlan(plan: string): string {
    // Simple hash function for plan identification
    // In production, use a proper hash like SHA256
    return Buffer.from(plan).toString('base64').substring(0, 16);
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'check_plan_approval',
          description: 'Check if the user has approved a plan for execution',
          inputSchema: {
            type: 'object',
            properties: {
              tool_name: {
                type: 'string',
                description: 'The tool being checked (should be exit_plan_mode)',
              },
              input: {
                type: 'object',
                properties: {
                  plan: {
                    type: 'string',
                    description: 'The plan content to check approval for',
                  },
                },
                required: ['plan'],
              },
            },
            required: ['tool_name', 'input'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'check_plan_approval') {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const args = request.params.arguments as any;
      const plan = args.input?.plan;

      if (!plan) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                behavior: 'deny',
                message: 'No plan provided to check',
              }),
            },
          ],
        };
      }

      // Check approval state
      const state = await this.readState();
      const planHash = this.hashPlan(plan);
      const approval = state.approvals[planHash];

      console.error(`[MCP Plan] Checking approval for plan hash: ${planHash}`);
      console.error(`[MCP Plan] Current status: ${approval?.status || 'not found'}`);

      if (!approval) {
        // No approval record - plan hasn't been presented to user yet
        // Create a pending approval
        state.approvals[planHash] = {
          planHash,
          status: 'pending',
          timestamp: Date.now(),
        };
        await this.writeState(state);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                behavior: 'deny',
                message: 'Plan is awaiting user approval. Please review the plan in the UI.',
              }),
            },
          ],
        };
      }

      switch (approval.status) {
        case 'approved':
          // Clean up the approval record
          delete state.approvals[planHash];
          await this.writeState(state);

          console.error(`[MCP Plan] Plan approved, allowing execution`);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  behavior: 'allow',
                  updatedInput: args.input,
                }),
              },
            ],
          };

        case 'rejected':
          // Clean up the approval record
          delete state.approvals[planHash];
          await this.writeState(state);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  behavior: 'deny',
                  message: approval.message || 'Plan was rejected by user',
                }),
              },
            ],
          };

        case 'refine':
          // Keep the record for tracking but deny execution
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  behavior: 'deny',
                  message: approval.message || 'User requested plan refinement. Please wait for further instructions.',
                }),
              },
            ],
          };

        case 'pending':
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  behavior: 'deny',
                  message: 'Plan is still awaiting user approval. Please review the plan in the UI.',
                }),
              },
            ],
          };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCP Plan] Plan approval server started');
  }
}

// Start the server
const server = new PlanApprovalServer();
server.run().catch(console.error);