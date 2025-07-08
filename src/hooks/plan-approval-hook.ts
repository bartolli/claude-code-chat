#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

/**
 * Input structure for the plan approval hook
 */
interface HookInput {
  /** Unique session identifier */
  session_id: string;
  /** Name of the tool being executed */
  tool_name: string;
  /** Tool input parameters */
  tool_input: {
    /** Optional plan content to be approved */
    plan?: string;
    [key: string]: any;
  };
}

/**
 * Output structure for the plan approval hook
 */
interface HookOutput {
  /** Decision to approve or block the plan */
  decision: 'approve' | 'block';
  /** Human-readable reason for the decision */
  reason: string;
}

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input: HookInput = JSON.parse(inputData);
    const sessionId = input.session_id;
    const planContent = input.tool_input.plan || '';

    // State files
    const approvalFile = `/tmp/claude-plan-approval-${sessionId}`;
    const planFile = `/tmp/claude-plan-content-${sessionId}`;

    // Save the plan for the extension to display
    await fs.promises.writeFile(
      planFile,
      JSON.stringify({
        plan: planContent,
        timestamp: Date.now(),
        session_id: sessionId,
      })
    );

    // Check if user has approved
    if (fs.existsSync(approvalFile)) {
      // User approved - allow the tool to proceed
      // Clean up the files
      await fs.promises.unlink(approvalFile);
      await fs.promises.unlink(planFile);

      const output: HookOutput = {
        decision: 'approve',
        reason: 'User has approved the plan',
      };

      console.log(JSON.stringify(output));
      process.exit(0);
    }

    // Block the tool and request user approval
    const output: HookOutput = {
      decision: 'block',
      reason:
        'Plan is awaiting user approval. Please review the plan in the UI and click Approve or Refine.',
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    // On error, allow the tool to proceed to avoid blocking Claude
    const output: HookOutput = {
      decision: 'approve',
      reason: `Hook error: ${error}`,
    };
    console.log(JSON.stringify(output));
    process.exit(1);
  }
});
