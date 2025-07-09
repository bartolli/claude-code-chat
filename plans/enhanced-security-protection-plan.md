# Enhanced Security Protection Plan

## Current State Analysis

The system has two layers of protection:
1. **settings.local.json**: Blocks direct `rm` commands via deny list
2. **pre_tool_use.py hook**: Catches indirect rm attempts and dangerous patterns

## Discovered Vulnerabilities

Successfully bypassed protection using:
- `unlink` - Direct file deletion alternative
- `find -delete` - Find command with delete flag  
- `perl -e 'unlink()'` - Using other programming languages
- `> file` - File truncation (effectively deleting content)

## Proposed Solution

### 1. Extend settings.local.json deny list
Add these dangerous commands to the deny list:
- `Bash(unlink:*)`
- `Bash(find:*-delete*)`
- `Bash(perl:*unlink*)`
- `Bash(python:*unlink*)`
- `Bash(ruby:*unlink*)`

### 2. Enhance pre_tool_use.py hook
Add detection for:
- **File deletion alternatives**: unlink, find -delete
- **Programming language deletions**: perl/python/ruby with unlink/remove
- **File truncation**: `> file`, `:> file`, `echo -n > file`
- **Move to nowhere**: `mv file /dev/null` (though this was blocked)

### 3. Create comprehensive deletion detection function
```python
def is_file_deletion_attempt(command):
    """Detect various file deletion methods beyond just rm"""
    patterns = [
        r'\bunlink\b',                    # unlink command
        r'\bfind\b.*-delete',             # find with -delete
        r'>\s*[^&|<>]+$',                 # file truncation
        r':\s*>\s*[^&|<>]+$',            # : > file truncation
        r'perl.*unlink',                  # perl unlink
        r'python.*(?:unlink|remove)',     # python deletion
        r'ruby.*(?:unlink|delete)',       # ruby deletion
        r'truncate.*-s\s*0',              # truncate to 0 bytes
    ]
    return any(re.search(p, command, re.I) for p in patterns)
```

### 4. Update error messages
Keep the friendly "Safety check" format for all file deletion attempts, explaining why each is blocked.

## Implementation Steps

1. Update settings.local.json deny list
2. Add `is_file_deletion_attempt()` function to pre_tool_use.py
3. Call new function alongside existing rm checks
4. Update error messages to be consistent
5. Test all known bypass methods
6. Document the enhanced protection

This approach provides defense-in-depth while maintaining Claude-friendly messaging.