---
allowed-tools: all
description: Analyze changes and create a meaningful git commit checkpoint
---

# 🔍 INTELLIGENT GIT CHECKPOINT

I'll analyze all changes and create a meaningful commit with proper context.

## 📊 ANALYSIS PROCESS

### 1. Gather Change Information
```bash
# Check what's changed
git status --porcelain
git diff --stat
git diff --cached --stat
```

### 2. Deep Change Analysis
I'll examine:
- **What files changed** - Categorize by type (source, test, docs, config)
- **Why they changed** - Based on recent work context
- **Impact level** - Major feature, minor fix, refactoring, etc.
- **Migration phase** - If related to StateManager migration
- **Test status** - Whether tests are passing

### 3. Commit Message Construction

Based on the analysis, I'll create a commit following conventional format:
```
<type>(<scope>): <subject>

<body explaining why and what>

<footer with references>
```

Types:
- `feat`: New feature (including migration progress)
- `fix`: Bug fix
- `test`: Test additions/updates
- `docs`: Documentation changes
- `refactor`: Code restructuring
- `chore`: Maintenance (hooks, configs)
- `perf`: Performance improvements

### 4. Smart Context Integration

I'll include:
- Current migration phase if applicable
- Feature flag states if changed
- Test results if relevant
- Related issue/task references
- Breaking changes warnings

## 🎯 CHECKPOINT EXECUTION

1. **Analyze all changes** using git diff and file content
2. **Determine commit type** based on predominant changes
3. **Extract key accomplishments** from the changes
4. **Create descriptive message** that explains the "why"
5. **Stage and commit** with proper formatting

## 🔄 SPECIAL HANDLING

### Migration Changes
If changes involve migration files:
- Note which phase task was completed
- Include feature flag implications
- Reference safety measures taken

### Hook/Config Changes
If changes involve .claude/ or configs:
- Explain the improvement/fix
- Note any workflow impacts

### Test Changes
If tests were added/modified:
- Summarize coverage improvements
- Note any bug fixes discovered

### Multi-Purpose Changes
If changes span multiple categories:
- Lead with the primary purpose
- List secondary changes in body

## ✨ COMMIT QUALITY

The commit will:
- Be atomic (one logical change)
- Have a clear, searchable subject
- Explain the motivation in the body
- Be ready for PR/review

**ANALYZING YOUR CHANGES NOW...**

I'll examine what you've been working on and create the perfect checkpoint commit.