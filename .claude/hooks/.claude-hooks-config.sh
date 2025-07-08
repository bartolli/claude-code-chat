#!/usr/bin/env bash
# .claude-hooks-config.sh - Configuration for smart-quality-check.sh
#
# This file allows project-specific customization of the quality checks.
# Place this in your project root to override default behavior.

# Enable/disable specific checks
export CLAUDE_HOOKS_TYPESCRIPT_ENABLED=true
export CLAUDE_HOOKS_ESLINT_ENABLED=true
export CLAUDE_HOOKS_PRETTIER_ENABLED=true
export CLAUDE_HOOKS_MIGRATION_SAFETY_ENABLED=true
export CLAUDE_HOOKS_TEST_RUNNER_ENABLED=false

# Auto-fix settings - VERY helpful for Claude!
export CLAUDE_HOOKS_PRETTIER_AUTOFIX=true  # Auto-format code
export CLAUDE_HOOKS_ESLINT_AUTOFIX=true    # Auto-fix ESLint issues
export CLAUDE_HOOKS_AUTOFIX_SILENT=true    # Don't report as error if auto-fixed successfully

# Project-specific patterns to ignore
export CLAUDE_HOOKS_IGNORE_PATTERNS=(
    "*.config.js"
    "*.config.ts"
    "dist/*"
    "out/*"
    "build/*"
    "node_modules/*"
)

# Custom error messages for this project
export CLAUDE_HOOKS_MIGRATION_MESSAGE="Remember: We're migrating from SimpleStateManager to Redux. Always use feature flags!"
export CLAUDE_HOOKS_TYPESCRIPT_MESSAGE="TypeScript errors break the extension. Fix them immediately!"
export CLAUDE_HOOKS_JSDOC_MESSAGE="Use JSDoc comments (/** */) for better documentation and hook compatibility!"

# Test command override (if different from npm test)
export CLAUDE_HOOKS_TEST_COMMAND="npm test"

# Migration-specific test configuration
export CLAUDE_HOOKS_MIGRATION_TESTS_ENABLED=false
export CLAUDE_HOOKS_MIGRATION_TEST_COMMAND="npm run test -- --grep migration"
export CLAUDE_HOOKS_MIGRATION_CRITICAL_PATTERNS="migration/|StateManager|ExtensionMessageHandler|state/slices/"

# Debug mode for troubleshooting
export CLAUDE_HOOKS_DEBUG=false

# Additional file type detection patterns
export CLAUDE_HOOKS_REDUX_PATTERNS="store/|slices/|reducers/|actions/"
export CLAUDE_HOOKS_MIGRATION_PATTERNS="migration/|StateManager|state-manager"