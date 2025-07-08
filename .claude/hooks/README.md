# Smart Quality Check Hook for Claude Code

A single intelligent hook that automatically runs quality checks on modified files in the claude-code-chat extension project.

## Overview

Following best practices from the reference implementation, this hook:
- Automatically detects modified files using git
- Runs appropriate checks based on file type
- Provides clear, actionable error messages
- Blocks on ANY quality issues (exit code 2)
- Auto-fixes issues when possible (configurable)

## Features

### TypeScript/JavaScript Files
- ✅ TypeScript compilation check (`tsc --noEmit`)
- ✅ ESLint validation (with auto-fix)
- ✅ Prettier formatting (with auto-fix)
- ✅ Common issues detection (no `as any`, no console statements)
- ✅ Related test execution
- ✅ JSDoc enforcement via ESLint (when `eslint-plugin-jsdoc` is configured)

### Migration Files
- ✅ All TypeScript checks above
- ✅ Migration safety validation (feature flag usage)
- ✅ StateManager usage patterns

### Test Files
- ✅ All standard checks
- ✅ Automatic test execution
- ✅ Console statements allowed in tests

### Auto-fix Capabilities (NEW! 🎉)
- 🔧 **Prettier Auto-formatting**: Automatically formats code to match project style
- 🔧 **ESLint Auto-fixing**: Automatically fixes fixable linting issues
- 🔧 **Silent Mode**: When enabled, auto-fixes don't block - perfect for Claude!
- 🔧 **Configurable**: Enable/disable auto-fix per tool via `.claude-hooks-config.sh`

## Installation

1. Make the hook executable:
   ```bash
   chmod +x ./hooks/smart-quality-check.sh
   ```

2. Copy to Claude hooks directory:
   ```bash
   mkdir -p ~/.claude/hooks
   cp ./hooks/smart-quality-check.sh ~/.claude/hooks/
   ```

3. Configure Claude Code:
   ```bash
   cp ./hooks/claude-settings.json ~/.claude/settings.json
   ```

   Or manually add to your existing settings:
   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Edit|Write",
           "hooks": [
             {
               "type": "command",
               "command": "~/.claude/hooks/smart-quality-check.sh",
               "description": "Smart quality checks"
             }
           ]
         }
       ]
     }
   }
   ```

## How It Works

1. **Automatic Triggering**: The matcher in `settings.local.json` triggers the hook on Edit/Write/MultiEdit
2. **Modified File Detection**: Uses git to find recently modified TypeScript/JavaScript files
3. **Smart Routing**: Based on file type, runs only relevant checks
4. **Parallel Checking**: Runs TypeScript compilation once, then checks each file individually
5. **Error Collection**: All issues are collected and reported together
6. **Auto-fixing**: Optionally fixes formatting and linting issues automatically

## Manual Testing with Echo Pipeline

You can manually test the hooks using echo to provide JSON input. Here are practical examples using real files from our codebase:

### Basic Testing
```bash
# Test with a service file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/services/ClaudeService.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test with a state management file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/state/StateManager.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test with a test file (different rules apply)
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/test/migration/actionMapper.test.ts"}}' | .claude/hooks/single-file-quality-check.sh
```

### Testing Different Tool Types
```bash
# Edit tool - simulating a file edit
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/core/Logger.ts","old_string":"debug(","new_string":"info("}}' | .claude/hooks/single-file-quality-check.sh

# Write tool - simulating file creation
echo '{"tool_name":"Write","tool_input":{"file_path":"src/services/NewService.ts","content":"export class NewService {}"}}' | .claude/hooks/single-file-quality-check.sh

# MultiEdit tool - simulating multiple edits
echo '{"tool_name":"MultiEdit","tool_input":{"file_path":"src/protocol/WebviewProtocol.ts","edits":[{"old_string":"console.log","new_string":"this.logger.debug"}]}}' | .claude/hooks/single-file-quality-check.sh
```

### Using Heredoc for Complex JSON
```bash
# More readable format for complex tool inputs
cat <<EOF | .claude/hooks/single-file-quality-check.sh
{
  "tool_name": "MultiEdit",
  "tool_input": {
    "file_path": "src/state/slices/sessionSlice.ts",
    "edits": [
      {
        "old_string": "console.log('Session created')",
        "new_string": "// Session created"
      },
      {
        "old_string": "any",
        "new_string": "unknown"
      }
    ]
  }
}
EOF
```

### Debugging Hook Execution
```bash
# Enable debug mode to see detailed processing
export CLAUDE_HOOKS_DEBUG=true
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/migration/StateComparator.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Check exit code
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/extension.ts"}}' | .claude/hooks/single-file-quality-check.sh
echo "Exit code: $?"

# Capture and analyze output
OUTPUT=$(echo '{"tool_name":"Edit","tool_input":{"file_path":"src/webview/WebviewManager.ts"}}' | .claude/hooks/single-file-quality-check.sh 2>&1)
echo "$OUTPUT"

# Test with a non-existent file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/does-not-exist.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test with invalid JSON (should show error)
echo 'invalid json' | .claude/hooks/single-file-quality-check.sh
```

### Common Test Scenarios
```bash
# Test migration-critical file (extra safety checks)
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/state/SimpleStateManager.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test Redux slice file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/state/slices/claudeSlice.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test protocol file
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/protocol/IdeMessenger.ts"}}' | .claude/hooks/single-file-quality-check.sh

# Test with auto-fix enabled (check your config)
export CLAUDE_HOOKS_PRETTIER_AUTOFIX=true
export CLAUDE_HOOKS_ESLINT_AUTOFIX=true
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/services/FileService.ts"}}' | .claude/hooks/single-file-quality-check.sh
```

## Exit Codes

- `0`: Success - all checks passed ✅
- `1`: Setup error - missing dependencies
- `2`: **BLOCKING** - quality issues found ❌

## Critical: Output Stream Handling (stdout vs stderr)

⚠️ **This is crucial for hook visibility in Claude Code!**

### The Problem We Discovered
Our hook was sending ALL output to stderr (`>&2`), including success messages. This caused success messages to be invisible in the Claude Code interface because:

1. **Exit code 0 (success)**: Claude Code displays **stdout** to the user
2. **Exit code 2 (blocking)**: Claude Code shows **stderr** to Claude for processing
3. **Other exit codes**: stderr shown to user, execution continues

### The Solution
- **Success messages** → Send to **stdout** (no `>&2`)
- **Error messages** → Send to **stderr** (use `>&2`)

### Example Implementation
```bash
# ❌ WRONG - Success message to stderr (invisible to user)
echo -e "${GREEN}✅ Quality check passed${NC}" >&2

# ✅ CORRECT - Success message to stdout (visible to user)
echo -e "${GREEN}✅ Quality check passed${NC}"

# ✅ CORRECT - Error message to stderr (for exit code 2)
echo -e "${RED}❌ TypeScript errors found${NC}" >&2
```

### Why This Matters
- Without proper stream handling, hooks appear to "fail silently" on success
- Users (and Claude) won't see confirmation that checks passed
- This can lead to confusion about whether hooks are running

### Best Practices
1. **Always test hook output** by manually running: `echo '{}' | ./your-hook.sh`
2. **Use stdout for success** - Remove `>&2` from success messages
3. **Use stderr for errors** - Keep `>&2` for error messages
4. **Be consistent** - All success to stdout, all errors to stderr

## Benefits of This Approach

1. **No JSON Parsing**: More robust, doesn't depend on Claude Code's internal structure
2. **Git-Aware**: Only checks files you've actually modified
3. **Project-Wide Safety**: TypeScript compilation checks the whole project
4. **Auto-fix Capability**: Can fix issues automatically without interrupting flow
5. **Fast**: Only runs necessary checks on relevant files
6. **Clear Output**: Consolidated error reporting with actionable fixes

## Customization

The hook is designed specifically for the claude-code-chat project but can be customized:

1. **Add new file types**: Extend the `detect_file_type` function
2. **Add new checks**: Create new check functions following the pattern
3. **Modify rules**: Adjust the validation logic in existing check functions

### Auto-fix Configuration

Edit `.claude/hooks/.claude-hooks-config.sh` to enable auto-fixing:

```bash
# Enable auto-fixing (highly recommended for Claude!)
export CLAUDE_HOOKS_PRETTIER_AUTOFIX=true  # Auto-format code
export CLAUDE_HOOKS_ESLINT_AUTOFIX=true    # Auto-fix ESLint issues
export CLAUDE_HOOKS_AUTOFIX_SILENT=true    # Don't block on auto-fixed issues
```

When `AUTOFIX_SILENT=true`:
- Auto-fixes are applied silently
- Hook continues without blocking
- Shows "✨ Auto-fixes Applied" summary
- Perfect for maintaining flow while coding!

When `AUTOFIX_SILENT=false`:
- Auto-fixes are applied
- Hook still reports as error (for review)
- Useful when you want to verify changes

## For Claude (Me!)

When this hook fails with exit code 2:
1. **STOP** what you're doing
2. **READ** all error messages carefully
3. **FIX** every issue listed (they're ALL blocking)
4. **VERIFY** the fix worked (the hook will run again)
5. **CONTINUE** with your original task

Remember: ALL issues are blocking. No exceptions!

## Recommended: JSDoc Enforcement

For better documentation standards, install `eslint-plugin-jsdoc`:

```bash
npm install --save-dev eslint-plugin-jsdoc
```

Then add to your `.eslintrc.json`:
```json
{
  "plugins": ["@typescript-eslint", "jsdoc"],
  "extends": [
    "plugin:jsdoc/recommended-typescript"
  ],
  "rules": {
    "jsdoc/require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": true,
        "ClassDeclaration": true
      }
    }]
  }
}
```

This will enforce JSDoc comments on all functions, methods, and classes, maintaining consistent documentation standards across the codebase.