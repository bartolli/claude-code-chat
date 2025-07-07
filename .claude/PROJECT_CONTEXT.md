# Project Context for Claude Code Chat

## Quick Reference
- **Always check current date/time with**: `mcp__time__get_current_time` 
- **Project**: Claude Code Chat Extension
- **Current Phase**: Migration Phase 2 - ExtensionMessageHandler Integration

## Key Information
1. **Automated Testing**: The smart-quality-check.sh hook automatically runs relevant tests when you modify:
   - `ActionMapper.*` → runs `actionMapper.test.ts`
   - `ExtensionMessageHandler.*` → runs `messageFlow.integration.test.ts`
   - `StateManager.*` → runs `reduxStore.integration.test.ts`

2. **Code Quality**: 
   - JSDoc comments are enforced via ESLint
   - Prettier auto-formatting is enabled (silent mode)
   - TypeScript compilation is checked on every edit

3. **Migration Status**:
   - ✅ Phase 0: Pre-Migration Safety Net (COMPLETED)
   - ✅ Phase 1: Action Mapping Layer (COMPLETED)
   - 🔄 Phase 2: ExtensionMessageHandler Integration (READY TO START)
   - ⏳ Phase 3-6: Pending

## Important Commands
- Check current date: `mcp__time__get_current_time` with timezone
- Run migration tests: `npm run test -- --grep migration`
- Toggle feature flags: VS Code commands starting with `claude-code-chat.migration.*`

## Recent Context
- Hooks system implemented for quality assurance
- JSDoc enforcement added via eslint-plugin-jsdoc
- Action mapping layer fully tested and ready