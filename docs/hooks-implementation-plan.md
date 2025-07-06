# Claude Code Hooks Implementation Plan

## Overview
This document outlines the implementation plan for Claude Code hooks to improve code quality and maintain context during our StateManager migration project.

## Hook Categories

### 1. General TypeScript Quality Hooks (Cross-Project)
These hooks can be used in any TypeScript project for maintaining code quality.

### 2. Project-Specific Migration Hooks
These hooks are specific to our StateManager migration project.

## General TypeScript Quality Hooks

### 1.1 **typescript-quality-check.sh**
**Trigger**: PostToolUse on Edit/Write operations for .ts/.tsx files
**Purpose**: Ensure TypeScript code quality before moving to another file

**Features**:
- Run TypeScript compiler (`tsc --noEmit`) on changed files
- Check for forbidden patterns:
  - No `as any` usage
  - No `@ts-ignore` comments
  - No missing return types on exported functions
  - No unused imports (via ESLint)
- Validate consistent import ordering
- Check for proper error handling patterns
- Ensure JSDoc on all exported functions

**Exit Codes**:
- 0: All checks passed
- 2: Issues found (blocking)

### 1.2 **typescript-test-check.sh**
**Trigger**: PostToolUse when .test.ts files are modified
**Purpose**: Ensure tests are properly written and pass

**Features**:
- Run tests for modified test files
- Check test coverage for files under test
- Validate test descriptions are meaningful
- Ensure no `.only` or `.skip` in tests
- Check for proper async/await usage in tests

### 1.3 **typescript-format.sh**
**Trigger**: PreToolUse before any file operation
**Purpose**: Auto-format TypeScript files

**Features**:
- Run Prettier on TypeScript files
- Fix ESLint auto-fixable issues
- Organize imports
- Remove trailing whitespace
- Ensure consistent line endings

## Project-Specific Migration Hooks

### 2.1 **migration-safety-guard.sh**
**Trigger**: PreToolUse on any state-related file changes
**Purpose**: Ensure migration changes don't affect production

**Features**:
- Verify all StateManager changes are behind feature flags
- Check that SimpleStateManager remains unchanged
- Validate no direct imports of StateManager in production code
- Ensure migration code includes corresponding tests
- Block if feature flags are enabled by default

**Configuration**:
```bash
# .claude-hooks-config.sh
export MIGRATION_FEATURE_FLAGS=(
  "useReduxStateManager"
  "enableActionMapping"
  "enableParallelStateValidation"
)
export MIGRATION_PROTECTED_FILES=(
  "src/state/SimpleStateManager.ts"
  "src/extension.ts"  # Only allow feature-flagged changes
)
```

### 2.2 **redux-pattern-validator.sh**
**Trigger**: PostToolUse on Redux slice modifications
**Purpose**: Ensure Redux best practices

**Features**:
- Validate action names match our conventions
- Check reducers are pure (no Date.now(), Math.random(), etc.)
- Ensure proper TypeScript types for all actions
- Validate selectors follow naming conventions
- Check that new actions are added to ActionMapper

### 2.3 **action-mapper-validator.sh**
**Trigger**: PostToolUse on ActionMapper changes
**Purpose**: Ensure all actions are properly mapped

**Features**:
- Compare actions in StateManager_Comparison_Analysis.md with ActionMapper
- Validate all webview actions have mappings or are marked as unmapped
- Check payload transformations have proper type guards
- Ensure comprehensive test exists for new mappings

### 2.4 **test-coverage-guard.sh**
**Trigger**: Stop hook (when Claude finishes)
**Purpose**: Ensure adequate test coverage

**Features**:
- Run coverage report for changed files
- Block if coverage drops below threshold (80%)
- Generate coverage summary
- Highlight untested code paths

## Context Preservation Hooks

### 3.1 **context-save.sh**
**Trigger**: Stop hook
**Purpose**: Save context for next session

**Features**:
- Update TODO.md with current progress
- Save list of modified files
- Record any pending tasks from hook failures
- Create session summary in PROGRESS.md

### 3.2 **context-restore.sh**
**Trigger**: Notification hook (on startup)
**Purpose**: Restore context from previous session

**Features**:
- Display TODO.md contents
- Show recently modified files
- Highlight any pending hook fixes
- Suggest next actions

## Implementation Priority

### Phase 1 (Immediate):
1. `typescript-quality-check.sh` - Core quality enforcement
2. `migration-safety-guard.sh` - Protect production code
3. `context-save.sh` - Preserve work between sessions

### Phase 2 (Next Session):
1. `redux-pattern-validator.sh` - Redux best practices
2. `action-mapper-validator.sh` - Action mapping validation
3. `typescript-test-check.sh` - Test quality

### Phase 3 (Later):
1. `test-coverage-guard.sh` - Coverage enforcement
2. `typescript-format.sh` - Auto-formatting
3. `context-restore.sh` - Session continuity

## Installation Guide

### 1. Create hooks directory:
```bash
mkdir -p ~/.claude/hooks
```

### 2. Copy hook scripts:
```bash
cp hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

### 3. Configure Claude Code settings:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/typescript-quality-check.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/migration-safety-guard.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/context-save.sh"
          }
        ]
      }
    ]
  }
}
```

### 4. Create project configuration:
```bash
# .claude-hooks-config.sh in project root
export TYPESCRIPT_STRICT_MODE=true
export MIGRATION_SAFETY_ENABLED=true
export MIN_TEST_COVERAGE=80
```

## Benefits

1. **Immediate Feedback** - Catch issues before they accumulate
2. **Context Preservation** - Never lose track of what we were doing
3. **Quality Enforcement** - Maintain high code standards automatically
4. **Migration Safety** - Protect production while making changes
5. **Reduced Cognitive Load** - Let hooks handle the checklist

## Next Steps

1. Review and approve this plan
2. Create the first three hooks (Phase 1)
3. Test hooks in development
4. Deploy and iterate based on experience
5. Add more hooks as needed

## Notes for Next Session

If we run out of context:
1. This plan is in `/docs/hooks-implementation-plan.md`
2. Start by implementing Phase 1 hooks
3. The reference hooks are in `/docs/reference/claude-code-hooks-reference/`
4. Current migration status: Phase 2 ready to start (see TODO.md)