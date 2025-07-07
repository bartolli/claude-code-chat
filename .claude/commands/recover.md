---
allowed-tools: Bash, Read
description: Recover to a previous git checkpoint or explore recovery options
---

# 🔄 GIT CHECKPOINT RECOVERY

Recovery request: $ARGUMENTS

## 🔍 CHECKPOINT DISCOVERY

### 1. List Recent Checkpoints
Let me find available checkpoints:

```bash
# Show recent commits with checkpoint markers
git log --oneline --grep="\[checkpoint:" -20

# Show tagged checkpoints
git tag -l "checkpoint-*"
```

### 2. Analyze Current State
```bash
# Check uncommitted changes
git status

# Show what would be lost
git diff
```

## 🛡️ RECOVERY OPTIONS

### Option 1: Soft Reset (Preserve Changes)
Keep changes in working directory:
```bash
git reset --soft <checkpoint-hash>
```

### Option 2: Mixed Reset (Unstage Changes)
Reset to checkpoint but keep files:
```bash
git reset --mixed <checkpoint-hash>
```

### Option 3: Hard Reset (Full Recovery)
⚠️ WARNING: This discards all changes!
```bash
git reset --hard <checkpoint-hash>
```

### Option 4: Create Recovery Branch
Safest option - create a branch at checkpoint:
```bash
git checkout -b recovery/<description> <checkpoint-hash>
```

### Option 5: Cherry-Pick Good Changes
If only some changes are problematic:
```bash
# Create recovery branch
git checkout -b recovery/selective

# Cherry-pick good commits
git cherry-pick <good-commit-hash>
```

## 🎯 CHECKPOINT CATEGORIES

Looking for checkpoints by type:
- **Auto Checkpoints**: `[checkpoint: auto]`
- **Manual Checkpoints**: `[checkpoint: manual]`
- **Test Checkpoints**: `[checkpoint: tests-passing]`
- **Phase Checkpoints**: `checkpoint-phase-*` tags

## 📊 RECOVERY ANALYSIS

Before recovering, I'll check:
1. What changes would be lost
2. Which tests were passing at checkpoint
3. Feature flag states at that point
4. Any dependent changes since checkpoint

## ⚡ QUICK RECOVERY PATTERNS

### "Last Good State"
```bash
git log --oneline --grep="all tests pass" -1
```

### "Before Migration Change"
```bash
git log --oneline --grep="migration" --before="1 hour ago" -1
```

### "Last Working Hook"
```bash
git log --oneline --grep="hook" --grep="✅" -1
```

**ANALYZING RECOVERY OPTIONS NOW...**