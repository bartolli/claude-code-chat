---
allowed-tools: all
description: Execute next migration task with safety-first approach
---

# 🚨 MIGRATION TASK: SAFETY-FIRST IMPLEMENTATION 🚨

You are implementing the next migration task: $ARGUMENTS

## 📋 MANDATORY SEQUENCE

1. **CHECK CURRENT STATUS**
   - Read `/docs/statemanager-migration-plan.md` to understand current phase
   - Use `mcp__time__get_current_time` to check current date
   - Review completed work and identify next TODO

2. **RESEARCH PHASE** 
   Say: "Let me research the codebase to understand the current implementation before proceeding with migration."
   - Understand existing SimpleStateManager patterns
   - Identify all affected files
   - Map dependencies and interactions
   - Check existing tests

3. **SAFETY PLANNING**
   - Identify ALL feature flags needed
   - Plan parallel state validation approach
   - Design rollback mechanism
   - List all test scenarios

4. **IMPLEMENTATION WITH CHECKPOINTS**
   - Enable feature flag(s) first
   - Implement with parallel state tracking
   - Add comprehensive logging
   - Validate at EVERY step

## 🚨 HOOKS ARE WATCHING

The smart-quality-check.sh hook will BLOCK if you:
- Leave empty JSDoc comments
- Have TypeScript errors
- Violate migration safety patterns
- Skip tests

**When hooks fail:** STOP and fix ALL issues immediately!

## ✅ MIGRATION SAFETY CHECKLIST

Before declaring done, verify:
- [ ] Feature flag controls the change
- [ ] Old functionality still works when flag is OFF
- [ ] New functionality works when flag is ON
- [ ] State discrepancies are logged
- [ ] Rollback tested and documented
- [ ] All migration tests pass
- [ ] No regression in existing tests

## 🎯 SUCCESS CRITERIA

The task is complete when:
- ✅ Zero regression - existing functionality unchanged
- ✅ Feature flag tested in both states
- ✅ All hooks pass (TypeScript, ESLint, tests)
- ✅ Migration plan updated with progress
- ✅ Ready for gradual rollout

**STARTING NOW** with research phase...