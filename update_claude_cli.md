# Updating Claude CLI for Hooks Support

## Current Version
Your package.json shows: `"@anthropic-ai/claude-code": "^1.0.31"`

## Latest Version
Latest available: `1.0.41`

## Update Steps

### 1. Update the Package
```bash
# Update to latest version
npm update @anthropic-ai/claude-code

# Or explicitly install latest
npm install @anthropic-ai/claude-code@latest
```

### 2. Verify Hooks Support
After updating, verify hooks are supported:

```bash
# Check CLI version
npx claude --version

# Test hooks work
npx claude /hooks
```

### 3. Update package.json
The package.json should automatically update, but verify it shows:
```json
"@anthropic-ai/claude-code": "^1.0.41"
```

### 4. Important: Global vs Local CLI

The extension might be using the globally installed Claude CLI rather than the package version. Check:

```bash
# Check global version
claude --version

# Update global if needed
npm install -g @anthropic-ai/claude-code@latest
```

### 5. Extension CLI Detection

In `ExtensionMessageHandler.ts`, the extension tries to find Claude in PATH first:
- Lines 404-425: It looks for `claude` in PATH
- Falls back to common locations like `/usr/local/bin/claude`

Make sure your global Claude CLI is updated since that's what the extension will likely use.

## Hooks Changelog

According to Anthropic's docs, hooks were introduced in:
- Version 1.0.35: Initial hooks support
- Version 1.0.37: Improved hook handling
- Version 1.0.40+: Stable hooks implementation

Your version (1.0.31) predates hooks, so updating is essential.

## After Updating

1. Restart VS Code
2. Run `/hooks` command to verify it works
3. Test the plan approval hook implementation

## Alternative: Force Extension to Use Package Version

If you want to ensure the extension uses the npm package version, modify the Claude path detection in ExtensionMessageHandler.ts to prioritize the local node_modules version:

```typescript
// Add this before the PATH search
const localClaudePath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'claude');
if (fs.existsSync(localClaudePath)) {
    claudePath = localClaudePath;
    this.outputChannel.appendLine(`[DEBUG] Using local Claude from node_modules: ${claudePath}`);
} else {
    // ... existing PATH search logic
}
```