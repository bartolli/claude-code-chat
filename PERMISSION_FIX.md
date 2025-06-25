# Claude Permission Fix

## Problem
Claude was asking for permission to use tools (like Bash) in the webview, which was blocking the process from continuing.

## Solution
Added the `--dangerously-skip-permissions` flag to the Claude CLI arguments in ExtensionMessageHandler.ts

## Change Details
In `src/services/ExtensionMessageHandler.ts` line 159:
- Added `args.push('--dangerously-skip-permissions');` after the other CLI arguments

This flag tells Claude to skip all permission prompts and automatically grant access to tools, which is the same approach used in the old extension.ts file (line 349).

## How it works:
1. User sends a message requesting tool use (e.g., "list files with bash")
2. Claude CLI is spawned with `--dangerously-skip-permissions` flag
3. Claude executes tools without prompting for permission
4. Results are streamed back to the UI

The flag is safe to use in this context because:
- The extension is running in a controlled environment
- Users explicitly installed the extension and expect it to have file system access
- This matches the behavior of the original Claude Code Chat extension