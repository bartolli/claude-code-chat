---
allowed-tools: all
description: Run comprehensive migration tests with specific scenarios
---

# 🧪 MIGRATION TEST SCENARIOS

Testing migration scenario: $ARGUMENTS

## 🎯 TEST EXECUTION PLAN

### 1. Pre-Test Setup
```bash
# Check current feature flag state
echo "Current migration flags:"
cat .vscode/settings.json | grep -A5 "claude-code-chat.migration"
```

### 2. Core Migration Tests
```bash
# Run migration-specific test suite
npm run test -- --grep migration

# Run with verbose output for debugging
npm run test -- --grep migration --reporter spec
```

### 3. Feature Flag Toggle Testing

#### Test with Redux OFF (Safe Mode)
```typescript
// Verify SimpleStateManager is active
featureFlags.setFlag('useReduxStateManager', false);
// Run tests
// Verify behavior
```

#### Test with Redux ON (Migration Mode)
```typescript
// Enable Redux StateManager
featureFlags.setFlag('useReduxStateManager', true);
// Run same tests
// Compare results
```

### 4. Specific Scenario Tests

Based on the provided arguments, test:
- State persistence across restarts
- Message flow integrity
- Tool execution tracking
- Token counting accuracy
- Thinking block handling

### 5. Parallel State Validation

When `enableParallelStateValidation` is true:
- [ ] Both state managers update correctly
- [ ] Discrepancies are logged
- [ ] No state corruption
- [ ] Performance acceptable

## 🔍 WHAT TO VERIFY

1. **Functionality Unchanged**
   - User sends message → Claude responds
   - Tools execute correctly
   - UI updates properly

2. **Migration Safety**
   - Feature flags control behavior
   - Rollback works instantly
   - No data loss

3. **Performance**
   - No noticeable slowdown
   - Memory usage stable
   - No goroutine/async leaks

## 🚨 IF TESTS FAIL

1. **Check feature flags first** - Wrong flag state is common
2. **Verify test data** - Migration tests may need specific setup
3. **Check logs** - Look for state discrepancies
4. **Run in debug mode** - VS Code debugger helps

## ✅ SUCCESS CRITERIA

Tests pass when:
- All migration tests GREEN
- Both state managers work correctly
- No regression in existing tests
- Performance metrics acceptable

**EXECUTING MIGRATION TEST SCENARIO NOW...**