# StateManager Migration Plan - Test Infrastructure Update

## 🚀 New Test Infrastructure (Added July 2025)

### Overview
We've implemented a tiered testing strategy to support rapid TDD during the migration:

1. **Unit Tests (Vitest)** - Sub-second execution for Redux logic
2. **Integration Tests (VS Code)** - Full extension validation
3. **Automated Hooks** - Run appropriate tests based on file changes

### What's Changed

#### Phase 0, Task 0.1.4: Automated Test Runner ✅ ENHANCED
Previously:
- All tests ran through VS Code test runner (slow)
- Tests mapped to source files via hooks

Now:
- **Vitest Unit Tests**: 
  - Redux slices, store, and pure logic: ~250ms execution
  - Run via `npm run test:unit` or `npm run test:unit:watch`
- **VS Code Integration Tests**:
  - Extension lifecycle, message flows, VS Code API interactions
  - Run via `npm run test:integration`
- **Hooks Updated**:
  - Automatically choose test runner based on file type
  - Redux changes → Vitest (fast feedback)
  - Extension changes → VS Code tests (comprehensive validation)

### Test Migration Status

#### ✅ Migrated to Vitest (Fast Tests)
- `configSlice.test.ts` - 14 tests
- `sessionSlice.test.ts` - 15 tests  
- `uiSlice.test.ts` - 14 tests
- `processesSlice.test.ts` - 10 tests
- `store.test.ts` - 8 tests
- `StateManager.test.ts` - 15 tests
- **Total: 76 tests running in ~250ms**

#### 🔄 Ready for Migration (With Mocks)
- ✅ `StateManager.test.ts` - COMPLETED (15 tests)
- `actionMapper.test.ts` - Can use feature flag mocks
- State comparison tests (Phase 0, Task 0.3)

#### 🔴 Keep in VS Code Runner
- `messageFlow.integration.test.ts` - Real message flow validation
- `extension.test.ts` - Extension lifecycle
- `services.test.ts` - VS Code service integration

### Updated Testing Strategy for Each Phase

#### Phase 0: Pre-Migration Safety Net
- **StateComparator utility** → Write unit tests with Vitest
- **Feature flag tests** → Unit tests with mocked config
- **Performance benchmarks** → Can use Node.js timers

#### Phase 1: Action Mapping Layer ✅ 
- **ActionMapper logic** → Already has VS Code tests, can add Vitest unit tests
- **Payload validators** → Perfect for unit testing
- **Action sequence validation** → Unit testable

#### Phase 2: ExtensionMessageHandler Integration
- **State comparison logic** → Unit tests
- **Sync mechanisms** → Unit tests with mocked dependencies
- **Full integration** → Keep VS Code tests

#### Phase 4: Testing and Validation (UPDATED)
Split into two tracks:

**4.1 Unit Testing (Vitest - Fast Feedback)**
- [ ] Test ActionMapper with all actions
- [ ] Test state synchronization logic
- [ ] Test loop prevention mechanisms  
- [ ] Test feature flag toggles
- [ ] Test rollback scenarios

**4.2 Integration Testing (VS Code - Comprehensive)**
- [ ] Test complete conversation flow
- [ ] Test manual stop/resume bug fix
- [ ] Test state persistence across restarts
- [ ] Test concurrent operations
- [ ] Test error recovery

### Benefits for Migration

1. **Rapid TDD Cycle**: Change Redux logic → Test in 250ms → Iterate
2. **Parallel Testing**: Run unit and integration tests independently
3. **Better Debugging**: Native Node.js debugging for unit tests
4. **CI/CD Ready**: Fast unit tests can run on every commit

### Recommended Workflow

1. **During Development**:
   ```bash
   npm run test:unit:watch  # Keep running for instant feedback
   ```

2. **Before Committing**:
   ```bash
   npm run test:fast       # Quick validation
   npm run test:integration # Full validation
   ```

3. **CI Pipeline**:
   - Run unit tests first (fail fast)
   - Run integration tests if units pass

### Next Steps

1. **Migrate StateManager tests** to Vitest with mocks
2. **Create StateComparator** with TDD using Vitest
3. **Update hooks** to run appropriate test tier
4. **Document** mock patterns for VS Code APIs

This infrastructure significantly reduces the feedback loop for Redux migration work while maintaining comprehensive test coverage.