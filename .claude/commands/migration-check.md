---
allowed-tools: all
description: Verify migration safety and run all quality checks
---

# 🔍 MIGRATION SAFETY VERIFICATION

## 🚨 THIS IS A FIXING TASK - NOT JUST REPORTING!

When you run this command, you MUST:
1. **IDENTIFY** all issues
2. **FIX EVERY SINGLE ONE**
3. **VERIFY** the migration is safe

## 📋 MIGRATION-SPECIFIC CHECKS

### 1. Feature Flag Verification
```bash
# Check all feature flags are properly implemented
grep -r "FeatureFlagManager" src/
grep -r "useReduxStateManager" src/
```

Verify:
- [ ] All new code is behind feature flags
- [ ] Flags default to FALSE (safe state)
- [ ] Flag checks at every entry point

### 2. State Manager Safety
- [ ] SimpleStateManager still works when flag is OFF
- [ ] Redux StateManager works when flag is ON
- [ ] No state corruption in either mode
- [ ] Proper state synchronization

### 3. Migration Test Suite
```bash
npm run test -- --grep migration
```

ALL migration tests must pass:
- [ ] actionMapper.test.ts - All mappings verified
- [ ] messageFlow.integration.test.ts - Message flow intact
- [ ] reduxStore.integration.test.ts - Redux integration working

### 4. Hook Compliance
The smart-quality-check.sh will verify:
- [ ] All functions have JSDoc comments
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes with zero warnings
- [ ] Prettier formatting applied
- [ ] No forbidden patterns

### 5. Regression Testing
```bash
# Run full test suite to ensure no regressions
npm test
```

- [ ] ALL existing tests still pass
- [ ] No performance degradation
- [ ] No memory leaks

## 🛠️ WHEN ISSUES ARE FOUND

**DO NOT STOP AT REPORTING!** Instead:

1. **Migration Issues**: Fix feature flag implementation
2. **Test Failures**: Debug and fix the root cause
3. **Hook Failures**: Address immediately (they're BLOCKING)
4. **State Discrepancies**: Add proper logging and handling

## ✅ READY FOR NEXT PHASE WHEN

- All feature flags working correctly
- Zero test failures
- All hooks passing
- Migration plan updated
- No regression in existing functionality

**EXECUTING FULL MIGRATION SAFETY CHECK NOW...**