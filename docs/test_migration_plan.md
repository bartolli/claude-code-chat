# Test Migration Plan: VS Code Tests → Vitest

## 🎯 Objective
Migrate tests from VS Code Test Runner to Vitest for faster TDD cycles during Redux migration, while maintaining integration test coverage.

## 📊 Current Test Analysis

### Total Test Files: 14
- **Pure Unit Tests:** 6 files (43%)
- **Mock-able Tests:** 5 files (36%)
- **Integration Tests:** 3 files (21%)

## 🚀 Migration Phases

### Phase 1: Redux Pure Unit Tests (Week 1)
**Goal:** Enable fast TDD for Redux development

#### Files to Migrate:
1. ✅ `src/test/state/slices/configSlice.test.ts` - COMPLETED
2. ✅ `src/test/state/slices/sessionSlice.test.ts` - COMPLETED
3. ✅ `src/test/state/slices/uiSlice.test.ts` - COMPLETED
4. ✅ `src/test/state/slices/processesSlice.test.ts` - COMPLETED
5. ✅ `src/test/state/store.test.ts` - COMPLETED
6. ⬜ `src/test/stream-processing.test.ts`

#### Migration Steps:
```bash
# For each test file:
1. Copy to tests/unit/state/slices/
2. Replace 'suite' → 'describe'
3. Replace 'test' → 'it'
4. Replace 'assert.*' → 'expect().*'
5. Update imports to use '@/' aliases
6. Run and verify
```

### Phase 2: Mock-able Migration Tests (Week 2)
**Goal:** Fast validation of StateManager migration safety

#### Files to Migrate:
1. ✅ `src/test/state/StateManager.test.ts` - COMPLETED
2. ⬜ `src/test/migration/actionMapper.test.ts`
3. ⬜ `src/test/migration/reduxStore.integration.test.ts`
4. ⬜ `src/test/migration/reduxActions.integration.test.ts`
5. ⬜ `src/test/migration/messageFlow.integration.test.ts`

#### Required Mocks:
- `vscode.ExtensionContext` ✅ (already created)
- `vscode.workspace.getConfiguration` ✅ (already created)
- WebviewProtocol mock (needs creation)
- ExtensionMessageHandler mock (needs creation)

### Phase 3: Keep in VS Code Test Runner
**Goal:** Maintain integration test coverage

#### Files to Keep:
1. 🔴 `src/test/extension.test.ts` - Tests actual extension activation
2. 🔴 `src/test/services.test.ts` - Tests VS Code service integrations
3. 🔴 `src/test/phase1.test.ts` - Integration test suite

## 📝 Conversion Guide

### Syntax Conversion
```typescript
// VS Code Test (Mocha)
suite('Test Suite', () => {
  test('should work', () => {
    assert.strictEqual(actual, expected);
  });
});

// Vitest
describe('Test Suite', () => {
  it('should work', () => {
    expect(actual).toBe(expected);
  });
});
```

### Assert → Expect Mapping
```typescript
assert.strictEqual(a, b)        → expect(a).toBe(b)
assert.deepStrictEqual(a, b)    → expect(a).toEqual(b)
assert.ok(value)                → expect(value).toBeTruthy()
assert.throws(() => fn())       → expect(() => fn()).toThrow()
```

## 🏃‍♂️ Quick Start Commands

### Migrate a Redux Slice Test
```bash
# Example: Migrate sessionSlice test
cp src/test/state/slices/sessionSlice.test.ts tests/unit/state/slices/
# Edit the file to convert syntax
npm run test:unit -- sessionSlice
```

### Run Specific Test
```bash
npm run test:unit -- configSlice  # Run one test
npm run test:unit:watch           # Watch mode for TDD
```

## 📈 Expected Benefits

1. **Speed**: 0.5s vs 30s+ per test run
2. **TDD**: Instant feedback during Redux development
3. **Debugging**: Better error messages and stack traces
4. **Coverage**: Easy coverage reports with `vitest coverage`

## ⚠️ Important Notes

1. **Don't delete original tests** until migration is verified
2. **Update CI/CD** to run both test suites
3. **Keep integration tests** in VS Code runner for real API testing
4. **Use mocks sparingly** - only for speed, not to bypass real behavior

## 🎯 Success Criteria

- [ ] All Redux tests run in < 1 second
- [ ] Migration tests provide fast feedback
- [ ] No loss of test coverage
- [ ] CI/CD runs both test suites
- [ ] Team documentation updated

## 📅 Timeline

- **Week 1**: Migrate all Redux pure unit tests
- **Week 2**: Create mocks and migrate migration tests
- **Week 3**: Update CI/CD and documentation
- **Week 4**: Team training and rollout

## 🚦 Current Status

### Completed ✅
- Vitest infrastructure setup
- VS Code mock creation
- First test migrated (configSlice)
- Test scripts configured

### Next Steps 🔜
1. Migrate remaining Redux slice tests
2. Create WebviewProtocol mock
3. Migrate StateManager test
4. Update GitHub Actions workflow