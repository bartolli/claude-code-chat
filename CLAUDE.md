# Claude Code Chat Extension - Development Guide

## 🎯 Project Overview
This is the Claude Code Chat VS Code extension, currently undergoing a safe migration from SimpleStateManager to Redux-based StateManager.

## 📋 Full Migration Plan
**READ THIS FIRST for detailed tasks and current status:**
→ `/docs/statemanager-migration-plan.md`

The plan contains:
- Current phase status and TODO items
- Detailed task breakdowns for each phase
- Risk mitigation strategies
- Success criteria

## 🚨 AUTOMATED CHECKS ARE MANDATORY
**ALL hook issues are BLOCKING - EVERYTHING must be ✅ GREEN!**  
No errors. No formatting issues. No linting problems. Zero tolerance.  
These are not suggestions. Fix ALL issues before continuing.

### Critical Rules
1. **ALWAYS** check current date/time using: `mcp__time__get_current_time`
2. **NEVER** break existing functionality - zero regression tolerance
3. **ALWAYS** use feature flags - all changes must be reversible

### 🚨 When Hooks Report Issues (Exit Code 2)
**You MUST:**
1. **STOP IMMEDIATELY** - Do not continue with other tasks
2. **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN
3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5. **NEVER IGNORE** - There are NO warnings, only requirements

**Recovery Protocol:**
- When interrupted by a hook failure, maintain awareness of your original task
- After fixing all issues and verifying the fix, continue where you left off
- Use TodoWrite tool to track both the fix and your original task

## 🤖 What Hooks Check
The smart-quality-check.sh hook runs automatically and will BLOCK on:
- TypeScript compilation errors
- ESLint violations (including empty JSDoc comments)
- Prettier formatting issues
- Migration safety violations
- Failed tests

Your code must be 100% clean. No exceptions.

## 🧪 Test Automation
Modified files trigger their corresponding tests automatically:
- `ActionMapper.*` → `actionMapper.test.ts`
- `ExtensionMessageHandler.*` → `messageFlow.integration.test.ts`
- `StateManager.*` → `reduxStore.integration.test.ts`

## 🛠️ Key Commands

### Slash Commands (Custom)
```
# Task Execution
/project:migration-next <task>    # Execute next migration task safely
/project:migration-check          # Verify migration safety (and FIX issues!)
/project:test-migration <scenario># Run specific migration test scenarios

# Git Management
/project:checkpoint               # Analyze changes and create smart commit

# Prompt Crafting (Need better instructions? Use these!)
/project:prompt <task>            # Create a perfect prompt for any task
/project:craft-prompt <details>   # Advanced prompt crafting with full context

# Examples:
# /project:prompt implement session persistence
# /project:craft-prompt debug thinking block accumulation with Redux
# /project:prompt research message flow patterns
```

### Shell Commands
```bash
# Run migration tests
npm run test -- --grep migration

# Check TypeScript
npm run compile

# VS Code Commands
- claude-code-chat.migration.showFlags
- claude-code-chat.migration.toggleStateManager
- claude-code-chat.migration.resetFlags
```

## 📁 Key Files
```
docs/statemanager-migration-plan.md  # Full plan with TODOs
src/migration/FeatureFlags.ts        # Feature flag system
src/migration/ActionMapper.ts        # Action mapping layer
src/test/migration/                  # Migration test suite
.claude/hooks/                       # Quality check hooks
```

## 💡 CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement
**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:
1. **Research**: Explore the codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan and verify with you
3. **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, I'll first say: "Let me research the codebase and create a plan before implementing."

### 💡 Need Help Creating Better Prompts?
If you're struggling to create the perfect prompt for a task, use:
- `/project:prompt <your task>` - Quick prompt generation
- `/project:craft-prompt <detailed requirements>` - Advanced prompt with full context

These commands will create comprehensive prompts that include all safety measures, testing requirements, and migration-specific constraints!

### Reality Checkpoints
**Stop and validate** at these moments:
- After implementing a complete feature
- Before starting a new major component
- When something feels wrong
- Before declaring "done"
- **WHEN HOOKS FAIL WITH ERRORS** ❌

### Development Workflow
1. **Read the plan** first: `docs/statemanager-migration-plan.md`
2. **Check feature flags** before making changes
3. **Test incrementally** - don't wait until the end
4. **Log discrepancies** - use `FeatureFlagManager` logging
5. **Validate states** - run both managers in parallel during transition

## 🧠 Working Memory Management

### When context gets long:
- Re-read this CLAUDE.md file
- Check current status in `docs/statemanager-migration-plan.md`
- Use TodoRead/TodoWrite tools to track current work

### Progress Updates Format:
```
✓ Implemented feature flag checks (all tests passing)
✓ Added ActionMapper validation
✗ Found issue with Redux state sync - investigating
```

## ⚠️ Remember
- Hooks enforce quality automatically - no shortcuts
- Empty JSDoc comments = blocked commit
- TypeScript errors = blocked progress
- When stuck, re-read the migration plan
- Current phase work is tracked in the plan's TODO items
- **If this file hasn't been referenced in 30+ minutes, RE-READ IT!**