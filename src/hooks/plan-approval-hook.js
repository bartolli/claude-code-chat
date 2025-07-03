#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
    inputData += chunk;
});

process.stdin.on('end', async () => {
    try {
        const input = JSON.parse(inputData);
        const sessionId = input.session_id;
        const planContent = input.tool_input?.plan || '';
        
        // State files
        const approvalFile = `/tmp/claude-plan-approval-${sessionId}`;
        const planFile = `/tmp/claude-plan-content-${sessionId}`;
        
        // Save the plan for the extension to display
        await fs.promises.writeFile(planFile, JSON.stringify({
            plan: planContent,
            timestamp: Date.now(),
            session_id: sessionId
        }));
        
        // Check if user has approved
        if (fs.existsSync(approvalFile)) {
            // User approved - allow the tool to proceed
            // Clean up the files
            await fs.promises.unlink(approvalFile);
            await fs.promises.unlink(planFile);
            
            const output = {
                decision: 'approve',
                reason: 'User has approved the plan'
            };
            
            console.log(JSON.stringify(output));
            process.exit(0);
        }
        
        // Block the tool and request user approval
        const output = {
            decision: 'block',
            reason: 'Plan is awaiting user approval. Please review the plan in the UI and click Approve or Refine.'
        };
        
        console.log(JSON.stringify(output));
        process.exit(0);
        
    } catch (error) {
        // On error, allow the tool to proceed to avoid blocking Claude
        const output = {
            decision: 'approve',
            reason: `Hook error: ${error.message || error}`
        };
        console.log(JSON.stringify(output));
        process.exit(1);
    }
});