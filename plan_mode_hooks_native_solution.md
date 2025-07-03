# Plan Mode Using Native --permission-mode plan with Hooks

## Overview
Combine Claude's native `--permission-mode plan` with PreToolUse hooks to intercept the `exit_plan_mode` tool and control when Claude sees approval.

## How It Works

1. **Use native plan mode**: `claude --permission-mode plan`
2. **Claude calls exit_plan_mode**: When ready to show plan
3. **PreToolUse hook intercepts**: Blocks the tool and shows plan to user
4. **User approves/refines**: Extension handles the UI
5. **Hook allows tool**: Only after user approval

## Implementation

### 1. PreToolUse Hook Configuration
Add to settings.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "exit_plan_mode",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/plan-approval-handler.py"
          }
        ]
      }
    ]
  }
}
```

### 2. Plan Approval Handler Script
```python
#!/usr/bin/env python3
import json
import sys
import os
import time

# Read hook input
input_data = json.load(sys.stdin)
session_id = input_data.get('session_id')
tool_input = input_data.get('tool_input', {})
plan_content = tool_input.get('plan', '')

# State files
approval_file = f'/tmp/claude-plan-approval-{session_id}'
plan_file = f'/tmp/claude-plan-content-{session_id}'

# Save the plan for the extension to display
with open(plan_file, 'w') as f:
    json.dump({
        'plan': plan_content,
        'timestamp': time.time(),
        'session_id': session_id
    }, f)

# Check if user has approved
if os.path.exists(approval_file):
    # User approved - allow the tool to proceed
    # Clean up the files
    os.unlink(approval_file)
    os.unlink(plan_file)
    sys.exit(0)  # Allow tool to proceed

# Block the tool and request user approval
output = {
    "decision": "block",
    "reason": "Plan is awaiting user approval. Please review the plan in the UI and click Approve or Refine."
}

print(json.dumps(output))
sys.exit(0)
```

### 3. Extension Integration

```typescript
// Watch for plan files
const planWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern('/tmp', 'claude-plan-content-*')
);

planWatcher.onDidCreate(async (uri) => {
    // Read plan content
    const content = await fs.readFile(uri.fsPath, 'utf-8');
    const planData = JSON.parse(content);
    
    // Show plan in UI
    this.webviewProtocol?.post('message/planProposal', {
        plan: planData.plan,
        sessionId: planData.session_id
    });
});

// Handle approval
async function approvePlan(sessionId: string) {
    // Create approval file
    await fs.writeFile(`/tmp/claude-plan-approval-${sessionId}`, '');
    
    // Tell Claude to retry the exit_plan_mode tool
    await this.handleChatMessage({
        text: "Please continue with the plan.",
        planMode: true // Keep plan mode active
    });
    
    // Turn off plan mode in UI
    this.webviewProtocol?.post('planMode/toggle', false);
}

// Handle refine
async function refinePlan(sessionId: string) {
    // Delete the plan file so hook knows we're refining
    await fs.unlink(`/tmp/claude-plan-content-${sessionId}`);
    
    // Let user type refinement
    // Claude will create a new plan with exit_plan_mode
}
```

### 4. Simple System Prompt
Since we're using native plan mode, we just need:

```typescript
if (data.planMode) {
    args.push('--permission-mode', 'plan');
    // No custom system prompt needed!
}
```

## Benefits

1. **Native plan mode** - Claude handles the plan flow naturally
2. **Clean interception** - Hook blocks before Claude sees approval
3. **No message parsing** - Plan comes through tool parameters
4. **Simple state** - Just temp files for approval status
5. **Reliable** - Hooks ensure deterministic behavior

## User Experience

1. User enables plan mode toggle
2. Claude analyzes and calls `exit_plan_mode` with plan
3. Hook blocks it, saves plan to file
4. Extension shows plan with Approve/Refine buttons
5. Approve: Creates approval file, tells Claude to continue
6. Claude retries `exit_plan_mode`, hook sees approval, allows it
7. Claude proceeds with implementation

## Edge Cases Handled

- **Multiple attempts**: Hook checks approval file each time
- **Refinement**: Delete plan file, user provides feedback
- **Session cleanup**: Extension cleans up temp files
- **Concurrent sessions**: Session ID prevents conflicts

This is the perfect combination of native features and custom control!