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

## Exit Codes

- `0`: Success - all checks passed ✅
- `1`: Setup error - missing dependencies
- `2`: **BLOCKING** - quality issues found ❌

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