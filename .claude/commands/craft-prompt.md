---
allowed-tools: all
description: Craft a sophisticated prompt with all necessary context and constraints
---

# 🎨 ADVANCED PROMPT CRAFTING ASSISTANT

I'll help you create a comprehensive prompt for: $ARGUMENTS

## 🧠 INTELLIGENT PROMPT CONSTRUCTION

### Step 1: Context Gathering
I'll automatically include:
- Current date via `mcp__time__get_current_time`
- Migration phase from `/docs/statemanager-migration-plan.md`
- Active feature flags
- Recent git commits for context

### Step 2: Constraint Integration
Every prompt will enforce:
- 🚨 Hook compliance (EXIT CODE 2 = STOP AND FIX)
- 🔄 Feature flag safety
- 🧪 Test requirements
- 📋 Documentation standards

### Step 3: Task-Specific Optimization

#### Implementation Prompts Include:
```
1. Research Phase Requirements
   - "Let me research the codebase..."
   - Files to examine
   - Patterns to understand
   
2. Planning Phase
   - Feature flag design
   - State validation approach
   - Test scenarios
   
3. Implementation Guidelines
   - Safety checkpoints
   - Parallel validation
   - Rollback mechanisms
```

#### Debugging Prompts Include:
```
1. Reproduction Steps
   - Current behavior
   - Expected behavior
   - Minimal test case
   
2. Investigation Approach
   - Log analysis
   - State inspection
   - Root cause hypothesis
   
3. Fix Validation
   - Regression tests
   - Edge case handling
   - Performance impact
```

## 🎯 PROMPT QUALITY CHECKLIST

Your generated prompt will always include:

✅ **Clear Objective** - What needs to be accomplished
✅ **Safety Constraints** - Feature flags, rollback, testing
✅ **Hook Awareness** - Automatic quality enforcement
✅ **Success Criteria** - Measurable completion standards
✅ **Workflow Enforcement** - Research → Plan → Implement

## 🔮 SMART ENHANCEMENTS

### Complexity Detection
- Simple task → Focused prompt
- Complex task → "Use multiple agents" emphasis
- Architectural task → "Ultrathink" recommendation

### Risk Assessment
- High risk → More safety measures
- Low risk → Streamlined approach
- Unknown risk → Research emphasis

### Test Mapping
Based on files mentioned:
- `ExtensionMessageHandler` → messageFlow tests
- `ActionMapper` → actionMapper tests
- `StateManager` → reduxStore tests

## 📝 TEMPLATE LIBRARY

### The "Safe Implementation" Template
```
Implement [TASK] with zero regression tolerance.

MANDATORY: Research → Plan → Implement

1. Research existing [COMPONENT] implementation
2. Create plan with feature flags
3. Implement with parallel validation
4. Verify all tests pass

Hooks will block on any quality issues!
```

### The "Bug Investigation" Template
```
Investigate and fix [BUG DESCRIPTION].

1. Reproduce the issue
2. Identify root cause
3. Implement fix behind feature flag
4. Add regression tests
5. Verify no side effects

Safety first - existing functionality must work!
```

### The "Performance Analysis" Template
```
Analyze performance of [COMPONENT].

1. Establish baseline metrics
2. Profile current implementation
3. Identify bottlenecks
4. Propose improvements (with feature flags)
5. Benchmark improvements

No premature optimization - measure first!
```

## 🚀 ADVANCED FEATURES

### Multi-Phase Prompts
For complex tasks spanning multiple phases:
- Phase dependencies
- Checkpoint requirements
- Rollback points

### Context Preservation
For long-running tasks:
- Progress tracking via TodoWrite
- State documentation
- Checkpoint summaries

### Team Collaboration
For shared work:
- Clear handoff points
- Documentation requirements
- Test coverage expectations

## 💡 PROMPT OPTIMIZATION TIPS

1. **Specificity Wins** - Vague requests get verbose prompts
2. **Include Examples** - "Like X but for Y" helps
3. **State Assumptions** - What you think vs what you know
4. **Define Success** - What does "done" look like?
5. **Mention Concerns** - Known risks or edge cases

**CRAFTING YOUR OPTIMIZED PROMPT NOW...**

The result will be a complete, context-aware prompt that:
- Enforces all safety measures
- Includes relevant context
- Maps to appropriate tests
- Follows established workflows
- Maximizes success probability