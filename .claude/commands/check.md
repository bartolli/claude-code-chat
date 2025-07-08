---
allowed-tools: all
description: Find and FIX all quality issues using multiple agents
---

# 🔧 FIX ALL QUALITY ISSUES

**THIS IS A FIXING TASK - NOT A REPORTING TASK!**

## 📋 Usage Modes

### Mode 1: Comprehensive Check (no arguments)
`/project:check` - Runs all quality checks and spawns agents to fix everything

### Mode 2: Work Batch Mode (with file argument)
`/project:check /path/to/work-batch.txt` - Focuses agents on specific files/issues from work batch

### 🚀 Generate Work Batches
```bash
# First, generate categorized work batches
.claude/scripts/generate-jsdoc-work-batches.sh

# This creates files like:
# - .claude-work/core.work.txt
# - .claude-work/state-slices.work.txt
# - .claude-work/services.work.txt
# - .claude-work/protocol.work.txt
```

## 🎯 MANDATORY WORKFLOW

### 1. Configure Hooks for Feedback Mode
```bash
# Temporarily disable silent mode so agents see feedback
export CLAUDE_HOOKS_AUTOFIX_SILENT=false
echo "✓ Hook feedback mode enabled - agents will see all issues"
```

### 2. Run All Checks
```bash
# TypeScript compilation
npm run compile

# ESLint with auto-fix attempt
npm run lint

# Run tests
npm test

# Check for empty JSDoc comments
grep -r "^\s*\*\s*$" src/ --include="*.ts" --include="*.tsx" | head -20
```

### 2. IMMEDIATELY Spawn Agents to Fix Issues

When issues are found, I MUST say:
```
"I found [X] issues across [Y] files. I'll spawn multiple agents to fix these in parallel:
- Agent 1: Fix ESLint/JSDoc issues in core modules
- Agent 2: Fix ESLint/JSDoc issues in types
- Agent 3: Fix test failures
- Agent 4: Fix TypeScript compilation errors
Let me tackle all of these simultaneously..."
```

### 3. Agent Task Patterns

**⚡ HOOK AWARENESS**: Our hooks run automatically with silent auto-fix enabled!
- Prettier will auto-format your code
- ESLint will auto-fix simple issues
- Focus on CONTENT, not formatting
- Hooks help you, not block you!

#### When Work Batch File is Provided:
If a work batch file is provided as argument, read it and focus ONLY on those files:
```
# Read the work batch file to understand scope
cat <work-batch-file>

# Spawn agents focused on ONLY the files in the batch
# DO NOT fix files outside the batch!
```

#### For Empty JSDoc Comments:
```
Task: Add meaningful JSDoc comments to:
- src/core/Logger.ts
- src/core/ErrorBoundary.ts
- src/core/Result.ts

IMPORTANT: Hooks are active with auto-fix! This means:
- Don't worry about formatting - Prettier handles it
- Focus on writing meaningful documentation
- The hook will clean up after you

For each empty comment block, add proper documentation describing:
- Purpose of the property/method
- Parameter descriptions
- Return value descriptions
- Any important notes
```

#### For Test Failures:
```
Task: Debug and fix failing tests in:
- src/test/state/StateManager.test.ts
- Any other failing test files

Ensure all tests pass by:
- Fixing assertions
- Updating mocks
- Correcting test data
```

#### For Linting Issues:
```
Task: Fix all ESLint violations in:
- [list specific files]

Run npm run lint -- --fix first, then manually fix remaining issues
```

## 🚨 FORBIDDEN BEHAVIORS

- ❌ "Here are the issues I found" → NO! FIX THEM!
- ❌ "The linter reports these problems" → NO! RESOLVE THEM!
- ❌ "Tests are failing because..." → NO! MAKE THEM PASS!
- ❌ Stopping after listing issues → NO! KEEP WORKING!

## ✅ SUCCESS CRITERIA

The task is ONLY complete when:
- `npm run compile` - ZERO errors
- `npm run lint` - ZERO warnings
- `npm test` - ALL tests pass
- No empty JSDoc comments remain
- Hooks run without blocking

## 🎯 PRACTICAL APPROACH FOR EXISTING CODE

For files with many empty JSDoc comments:
1. **Prioritize public APIs** - External-facing methods first
2. **Be concise** - One-line descriptions are fine
3. **Focus on "why"** - Not just what the code does
4. **Batch similar items** - Group related fixes

Example JSDoc fixes:
```typescript
// Instead of empty:
/**
 *
 */
level: LogLevel;

// Add meaningful comment:
/**
 * Severity level of the log entry
 */
level: LogLevel;
```

## 🔄 REPEAT UNTIL GREEN

After agents complete:
1. Re-run all checks
2. If issues remain, spawn MORE agents
3. Continue until EVERYTHING passes

### 4. Restore Silent Mode (Optional)
```bash
# After all fixes are complete, restore silent mode
export CLAUDE_HOOKS_AUTOFIX_SILENT=true
echo "✓ Restored silent auto-fix mode"
```

**STARTING COMPREHENSIVE CHECK AND FIX NOW...**