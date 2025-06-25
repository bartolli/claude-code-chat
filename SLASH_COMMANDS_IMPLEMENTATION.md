# Slash Commands Implementation

## Overview
Implemented support for Claude CLI slash commands in the VS Code extension, maintaining session continuity.

## Changes Made

### 1. Backend Handler (ExtensionMessageHandler.ts)
- Added `settings/executeSlashCommand` message handler
- Created `executeSlashCommand()` method that:
  - Opens a terminal with the slash command
  - Includes `--resume` flag to maintain the current session
  - Shows VS Code notification
  - Sends notification to webview UI

### 2. Protocol Types (protocol/types.ts)
- Already had `settings/executeSlashCommand` message type defined
- Added `terminal/opened` message for UI notifications
- Added missing message types for chat protocol

### 3. UI Integration (ContinueInputBox)
- Added slash command detection in the input box
- When user types `/command`, it checks against known commands
- Sends `settings/executeSlashCommand` message to extension
- Maintains list of all available slash commands

### 4. Webview App Handler
- Added handler for `terminal/opened` messages to show notifications

## How It Works

1. User types a slash command (e.g., `/help`, `/status`, `/model`)
2. ContinueInputBox detects it's a valid slash command
3. Sends message to extension via messenger
4. Extension opens a terminal and runs: `claude /command --resume [sessionId]`
5. The `--resume` flag ensures the command runs in the same session
6. User sees terminal output and a notification

## Supported Commands
All 29 Claude CLI slash commands are supported:
- `/help` - Show help and available commands
- `/status` - Show Claude Code status
- `/model` - Set the AI model
- `/config` - Open config panel
- `/clear` - Clear conversation history
- `/cost` - Show session cost
- `/login` / `/logout` - Authentication
- `/mcp` - Manage MCP servers
- `/ide` - Manage IDE integrations
- And many more...

## Session Continuity
The key feature is that all slash commands maintain the current session by using the `--resume` flag with the stored session ID. This means:
- Context is preserved across commands
- Token usage continues to accumulate
- Conversation history remains available