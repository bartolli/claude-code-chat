# Plan Mode Final Implementation Guide - Complete Reference

## Overview
Implement plan mode using native `--permission-mode plan` with PreToolUse hooks to intercept `exit_plan_mode` before Claude sees approval. The hook is bundled with the extension and configured automatically - no user setup required.

## Files to Modify

### 1. ExtensionMessageHandler.ts
**Path**: `/src/services/ExtensionMessageHandler.ts`

#### Remove These Lines (31-33):
```typescript
private isInPlanMode: boolean = false;
private hasReceivedPlan: boolean = false;
private waitingForPlan: boolean = false;
```

#### Simplify Plan Mode Setup (lines 227-243):
```typescript
// REPLACE lines 227-243 with:
if (data.planMode) {
    args.push('--permission-mode', 'plan');
    this.outputChannel.appendLine('[DEBUG] Plan mode enabled');
}
```

#### Remove Complex JSON Detection (lines 810-859):
Delete the entire block that tries to extract JSON from messages.

#### Remove Plan Detection in Messages (lines 860-872):
Delete the block checking for "## Implementation Plan".

#### Simplify plan/approve Handler (lines 117-135):
```typescript
case 'plan/approve':
    this.logger.info('ExtensionMessageHandler', 'Plan approved', data);
    this.outputChannel.appendLine(`[Plan] User approved plan`);
    
    const { sessionId } = data as any;
    // Create approval file for hook
    const approvalPath = `/tmp/claude-plan-approval-${sessionId || this.currentSessionId}`;
    await fs.promises.writeFile(approvalPath, '');
    
    // Tell Claude to continue (retry exit_plan_mode)
    await this.handleChatMessage({ 
        text: "Please continue with the plan.",
        planMode: true
    });
    
    // Update UI
    this.webviewProtocol?.post('planMode/toggle', false);
    return undefined as any;
```

#### Simplify plan/refine Handler (lines 137-153):
```typescript
case 'plan/refine':
    this.logger.info('ExtensionMessageHandler', 'Plan refinement requested', data);
    this.outputChannel.appendLine(`[Plan] User requested plan refinement`);
    
    // User will provide refinement instructions
    // Just focus the input
    return undefined as any;
```

#### Remove Result Handler Plan Logic (lines 994-1016):
Delete the entire block checking for plan mode in result handler.

#### Constructor Changes (lines 50-54):
```typescript
// Configure hooks for plan mode
this.configurePlanModeHooks();

// Watch for plan files
this.watchForPlanFiles();
```

#### Hook Configuration Method (added at end of class):
```typescript
private async configurePlanModeHooks(): Promise<void> {
    try {
        // Get the hook script path from extension output directory
        const hookPath = path.join(this.context.extensionPath, 'out', 'hooks', 'plan-approval-hook.js');
        
        // Check if hook file exists
        if (!fs.existsSync(hookPath)) {
            this.outputChannel.appendLine(`[Hooks] Plan approval hook not found at: ${hookPath}`);
            return;
        }
        
        // Make hook executable
        fs.chmodSync(hookPath, '755');
        
        // Read current Claude settings
        const settingsPath = path.join(process.env.HOME || '', '.claude', 'settings.json');
        let settings: any = {};
        
        if (fs.existsSync(settingsPath)) {
            try {
                const content = fs.readFileSync(settingsPath, 'utf8');
                settings = JSON.parse(content);
            } catch (e) {
                this.outputChannel.appendLine(`[Hooks] Error reading Claude settings: ${e}`);
            }
        }
        
        // Ensure hooks structure exists
        if (!settings.hooks) {
            settings.hooks = {};
        }
        if (!settings.hooks.PreToolUse) {
            settings.hooks.PreToolUse = [];
        }
        
        // Check if our hook is already configured
        const hookCommand = `node ${hookPath}`;
        const existingHook = settings.hooks.PreToolUse.find((h: any) => 
            h.matcher === 'exit_plan_mode' && 
            h.hooks?.some((hook: any) => hook.command === hookCommand)
        );
        
        if (!existingHook) {
            // Add our hook configuration
            settings.hooks.PreToolUse.push({
                matcher: 'exit_plan_mode',
                hooks: [{
                    type: 'command',
                    command: hookCommand
                }]
            });
            
            // Create .claude directory if it doesn't exist
            const claudeDir = path.dirname(settingsPath);
            if (!fs.existsSync(claudeDir)) {
                fs.mkdirSync(claudeDir, { recursive: true });
            }
            
            // Write updated settings
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            this.outputChannel.appendLine(`[Hooks] Plan approval hook configured successfully`);
        } else {
            this.outputChannel.appendLine(`[Hooks] Plan approval hook already configured`);
        }
        
    } catch (error) {
        this.outputChannel.appendLine(`[Hooks] Error configuring hooks: ${error}`);
    }
}

private watchForPlanFiles(): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern('/tmp', 'claude-plan-content-*')
    );
    
    watcher.onDidCreate(async (uri) => {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const planData = JSON.parse(Buffer.from(content).toString());
            
            // Show plan in UI
            this.webviewProtocol?.post('message/planProposal', {
                plan: planData.plan,
                sessionId: planData.session_id,
                isMarkdown: true
            });
            
            this.outputChannel.appendLine(`[Plan] Detected plan file: ${uri.fsPath}`);
        } catch (e) {
            this.outputChannel.appendLine(`[Plan] Error reading plan file: ${e}`);
        }
    });
    
    // Cleanup watcher on dispose
    this.context.subscriptions.push(watcher);
}
```

### 2. Hook Handler Scripts (Already Created)
**Path**: These files are bundled with the extension:
- `/src/hooks/plan-approval-hook.ts` - TypeScript source
- `/src/hooks/plan-approval-hook.js` - JavaScript executable

The hook is automatically configured when the extension starts - no manual creation needed.

**Hook Logic**:
```javascript
// Reads input from stdin
// Saves plan to /tmp/claude-plan-content-{sessionId}
// Checks for approval file /tmp/claude-plan-approval-{sessionId}
// Blocks or approves based on file existence
```

### 3. Automatic Hook Configuration
The extension automatically configures hooks on startup via `configurePlanModeHooks()` method.

**No manual user configuration required!**

The extension will:
1. Check if hook is already configured
2. Add configuration to `~/.claude/settings.json` if needed
3. Point to the bundled hook in the extension directory

### 4. Webpack Configuration Update
**Path**: `/webpack.extension.config.js`

Add copy plugin to bundle hooks:
```javascript
const CopyPlugin = require('copy-webpack-plugin');

// In plugins array:
plugins: [
    new CopyPlugin({
        patterns: [
            { 
                from: 'src/hooks', 
                to: 'hooks',
                globOptions: {
                    ignore: ['**/*.ts'] // Only copy JS files
                }
            }
        ]
    })
]
```

### 5. Package.json Update
Add to devDependencies:
```json
"copy-webpack-plugin": "^12.0.2"
```

### 6. Files to DELETE

1. `/src/services/PlanApprovalService.ts` - Entire file
2. `/src/mcp/plan-approval-server.ts` - Entire file
3. All temporary plan_mode_*.md files in root (except this guide)

### 7. Protocol Types to Update
**Path**: `/src/protocol/types.ts`

Update the plan/approve message to include sessionId:
```typescript
'plan/approve': {
    toolId?: string;
    sessionId?: string;
};
```

## Build & Testing Checklist

1. [ ] Install dependencies: `npm install`
2. [ ] Build extension: `npm run build:extension`
3. [ ] Delete old plan-related files
4. [ ] Verify hook files exist in `out/hooks/`
5. [ ] Test plan mode:
   - Enable plan mode toggle
   - Ask Claude to make changes
   - Verify hook blocks exit_plan_mode
   - Verify plan appears in UI
   - Test approve flow
   - Test refine flow
6. [ ] Check output channel for hook configuration messages

## Key Benefits of This Approach

1. **Zero user configuration** - Hook is bundled and auto-configured
2. **TypeScript consistency** - Hook written in same language as extension
3. **Native integration** - Uses Claude's built-in plan mode
4. **Reliable control** - Hooks guarantee interception
5. **Clean state** - Just temp files, no complex tracking
6. **Easy debugging** - Can test hook independently
7. **Cross-platform** - Works anywhere Node.js runs

## Session Management Note

Since we're using file watchers and temp files, make sure to clean up on session end:

```typescript
// Add to cleanup logic
const sessionFiles = [
    `/tmp/claude-plan-approval-${sessionId}`,
    `/tmp/claude-plan-content-${sessionId}`
];
for (const file of sessionFiles) {
    await fs.promises.unlink(file).catch(() => {});
}
```

## Installation for End Users

End users just need to:
1. Install the extension
2. Enable plan mode in the UI
3. That's it! The hook is configured automatically on first run.

No manual hook creation or settings editing required!