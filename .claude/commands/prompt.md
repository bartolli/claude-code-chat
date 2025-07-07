---
allowed-tools: all
description: Create a perfect prompt for any migration task
---

# 🎯 MIGRATION PROMPT SYNTHESIZER

I'll create a **complete, ready-to-use prompt** for your migration task: $ARGUMENTS

## 📋 PROMPT CONSTRUCTION PROCESS

### 1. Task Analysis
First, I'll analyze your request to determine:
- Which migration phase it relates to
- Required safety measures
- Relevant test scenarios
- Potential risks to address

### 2. Template Selection
Based on your task, I'll use the appropriate base:
- **Implementation tasks** → migration-next.md structure
- **Verification tasks** → migration-check.md structure
- **Testing tasks** → test-migration.md structure
- **Research tasks** → Custom research template

### 3. Context Integration
I'll automatically include:
- Current migration phase from the plan
- Relevant feature flags
- Specific files that will be affected
- Hook compliance requirements
- Test mapping for changed files

## 🎨 OUTPUT FORMAT

Your synthesized prompt will be provided in a code block:

```
[Complete prompt ready to copy and use]
```

## 🔧 ENHANCEMENT RULES

1. **Safety First** - Every prompt emphasizes zero regression
2. **Feature Flags** - Always included for reversibility
3. **Hook Awareness** - Reminds about automatic quality checks
4. **Test Focus** - Maps changes to specific test files
5. **Research Phase** - Never skip straight to coding

## 📚 PROMPT PATTERNS

### For Implementation Tasks:
- Research → Plan → Implement workflow
- Feature flag requirements
- Parallel state validation
- Rollback mechanisms

### For Debugging Tasks:
- Current behavior analysis
- Root cause investigation
- Fix with validation
- Regression prevention

### For Testing Tasks:
- Scenario definition
- Both state managers tested
- Performance metrics
- Edge case coverage

### For Research Tasks:
- Codebase exploration
- Pattern identification
- Dependency mapping
- Risk assessment

## 🎯 EXAMPLES OF ENHANCED PROMPTS

**If you say:** "implement session persistence"
**I'll create:** A complete prompt with research phase, feature flags, state validation, and specific test requirements

**If you say:** "fix thinking block bug"
**I'll create:** A debugging prompt with reproduction steps, root cause analysis, and regression test requirements

**If you say:** "research webview communication"
**I'll create:** An exploration prompt with specific files to examine, patterns to identify, and documentation to create

## 🚀 SPECIAL ENHANCEMENTS

Based on keywords in your request:
- **"implement"** → Emphasizes Research → Plan → Implement
- **"fix"** → Includes reproduction and root cause analysis
- **"test"** → Focuses on scenarios and edge cases
- **"research"** → Emphasizes documentation and pattern finding
- **"refactor"** → Includes "delete old code" requirements
- **"integrate"** → Emphasizes parallel validation

**ANALYZING YOUR TASK AND CREATING THE PERFECT PROMPT NOW...**