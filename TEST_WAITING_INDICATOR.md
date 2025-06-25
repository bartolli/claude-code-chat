# Waiting Indicator Fix Test

## Problem
"Claude is working" indicator was showing until the final response, even after tool components were received.

## Solution
1. **Fixed state updates in sessionSlice.ts**: Added activeSession update in `toolUseAdded` and `toolResultAdded` to trigger re-renders
2. **Logic in Chat.tsx was already correct**: Shows waiting indicator only when last message is user OR assistant with no content AND no toolUses

## How it works now:

### Flow:
1. User sends message → "Claude is working" shows
2. Empty assistant message created → "Claude is working" still shows (no toolUses yet)
3. Tool use arrives → toolUseAdded updates message.toolUses → "Claude is working" HIDES
4. Tool component renders instead
5. Content arrives → Updates the message content
6. Complete response shown

### Key changes:
- `toolUseAdded` reducer now updates `activeSession.messages` to trigger re-render
- `toolResultAdded` reducer now updates `activeSession.messages` to trigger re-render
- This ensures React detects the state change and re-evaluates `showWaitingIndicator`

## Test scenarios:
1. Send message requesting tool use (e.g., "list files")
2. Verify "Claude is working" shows initially
3. Verify it disappears when tool component appears
4. Verify tool results and final content display correctly