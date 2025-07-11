# Test Infrastructure Migration Plan

## 🎯 Goal
Create a fast, tiered testing system for Redux migration development while preserving the existing VS Code integration test safety net.

## 📊 Current Situation
- All tests run through VS Code Test CLI (slow - launches full VS Code instance)
- Mix of unit tests and integration tests in same structure
- Tests take too long for TDD during Redux migration
- Some tests don't need VS Code API but still run in VS Code environment

## 🚀 Target Architecture

### Three-Tier Testing Strategy
1. **Unit Tests (Fast)** - Pure logic, mocked dependencies, run in milliseconds
2. **Mock Integration Tests (Medium)** - Mock VS Code API, test integrations
3. **Full Integration Tests (Slow)** - Real VS Code instance, full E2E validation

## 📋 Implementation Tasks

### Phase 1: Setup Infrastructure ⏱️ ~2 hours ✅ COMPLETED

- [x] **1.1 Install Vitest and dependencies**
  ```bash
  npm install --save-dev vitest @vitest/ui happy-dom
  npm install --save-dev @types/jest jest-mock-vscode
  ```

- [x] **1.2 Create new directory structure**
  ```
  tests/
  ├── unit/              # Vitest tests (fast)
  │   ├── state/
  │   │   ├── slices/
  │   │   └── store/
  │   ├── migration/
  │   └── setup.ts
  ├── integration/       # VS Code tests (existing)
  └── vitest.config.ts
  ```

- [x] **1.3 Create Vitest configuration**
  - Create `vitest.config.ts` with proper aliases
  - Set up globals and environment
  - Configure test paths

- [x] **1.4 Create mock setup file**
  - Mock VS Code API in `tests/unit/setup.ts`
  - Mock Extension Context
  - Mock workspace configuration

- [x] **1.5 Update package.json scripts**
  ```json
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:integration": "vscode-test",
  "test:fast": "npm run test:unit"
  ```

### Phase 2: Proof of Concept ⏱️ ~1 hour ✅ COMPLETED

- [x] **2.1 Migrate simplest Redux test**
  - Start with `configSlice.test.ts`
  - Convert from Mocha to Vitest syntax
  - Verify it runs fast

- [x] **2.2 Verify both test suites work**
  - Run unit tests with Vitest
  - Run integration tests with VS Code
  - Ensure no conflicts

- [x] **2.3 Document timing improvements**
  - **Unit tests (Vitest):** 194ms test execution, 0.518s total
  - **VS Code integration tests:** Minutes per test file
  - **Speed improvement:** ~100x faster for unit tests!

### Phase 3: Migration ⏱️ ~3 hours

- [ ] **3.1 Identify tests to migrate**
  - All Redux slice tests
  - StateManager tests (with mocked context)
  - Pure utility/logic tests

- [ ] **3.2 Batch migrate Redux tests**
  - `sessionSlice.test.ts`
  - `uiSlice.test.ts`
  - `processesSlice.test.ts`
  - `store.test.ts`

- [ ] **3.3 Create ActionMapper unit tests**
  - Test action mapping logic
  - Test validation logic
  - Mock VS Code context

- [ ] **3.4 Update existing integration tests**
  - Move to `tests/integration/`
  - Keep using VS Code Test CLI
  - No changes to test logic

### Phase 4: CI/CD Integration ⏱️ ~1 hour

- [ ] **4.1 Update GitHub Actions**
  - Add unit test step
  - Keep integration test step
  - Run unit tests first (fail fast)

- [ ] **4.2 Update hooks**
  - Modify smart-quality-check.sh
  - Run appropriate test tier based on changes
  - Unit tests for Redux changes

- [ ] **4.3 Update documentation**
  - README test section
  - CLAUDE.md test commands
  - Contributing guidelines

### Phase 5: Cleanup ⏱️ ~30 min

- [ ] **5.1 Remove migrated test files**
  - Delete old unit test files from src/test
  - Keep only integration tests

- [ ] **5.2 Remove unnecessary configs**
  - Clean up tsconfig.test.json if not needed
  - Update .gitignore

- [ ] **5.3 Final verification**
  - All tests pass
  - Documentation updated
  - Team notified

## 📈 Success Metrics

- Unit tests run in < 5 seconds total
- Integration tests unchanged (still slow but comprehensive)
- Redux TDD cycle time reduced from minutes to seconds
- No loss of test coverage
- Clear separation of test types

## 🔄 Rollback Plan

If issues arise:
1. Tests remain in original location (not deleted until Phase 5)
2. Package.json scripts can revert to original
3. Git history preserves all changes
4. No production code affected

## 📝 Notes

- Vitest chosen over Jest for better TypeScript support and speed
- Keeping Mocha for integration tests to minimize changes
- GUI tests already use Vitest - good precedent
- This plan allows incremental migration with validation at each step

## 🏁 Getting Started

Ready to begin? Start with Phase 1, Task 1.1:
```bash
npm install --save-dev vitest @vitest/ui happy-dom @types/jest jest-mock-vscode
```