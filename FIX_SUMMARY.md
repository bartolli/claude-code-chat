# Webview-Backend Communication Fixes

## Summary
Fixed critical issues preventing messages from reaching the webview and causing duplicate user messages.

## Issues Fixed

### 1. Messages Not Reaching Webview
**Problem**: `message/add` and `message/update` messages were being sent from backend but not received by webview.

**Root Cause**: Multiple `ExtensionMessageHandler` instances were being created, causing the handler processing Claude responses to be different from the one with the webview protocol attached.

**Fix**: 
- Created a single `ExtensionMessageHandler` instance in the `ClaudeChatProvider` constructor
- Reused this instance in `_setupMessageHandling()` instead of creating a new one
- Ensured the same handler that processes Claude responses also has the webview protocol attached

### 2. Duplicate User Messages
**Problem**: User messages were appearing multiple times in the chat UI.

**Fix**: Added deduplication logic in the `messageAdded` reducer to ignore duplicate user messages within a 2-second window.

### 3. Enhanced Debugging
Added comprehensive logging to track message flow:
- Enhanced `SimpleWebviewProtocol.post()` with timestamps and message IDs
- Added detailed logging to `IdeMessenger` to track all incoming messages
- Added validation and warning logs for malformed messages

## Code Changes

1. **src/extension.ts**:
   - Added `_messageHandler` property to `ClaudeChatProvider`
   - Created handler once in constructor
   - Reused existing handler in `_setupMessageHandling()`

2. **src/protocol/SimpleWebviewProtocol.ts**:
   - Added detailed logging with timestamps and message IDs
   - Added try-catch error handling
   - Special logging for critical message types

3. **src/protocol/IdeMessenger.ts**:
   - Enhanced message event listener logging
   - Added message validation
   - Detailed handler execution tracking

4. **src/state/slices/sessionSlice.ts**:
   - Added duplicate detection for user messages
   - Check for messages with same content within 2 seconds
   - Skip duplicates with warning log

## Testing
After these fixes:
1. User messages should appear only once
2. Assistant responses should stream properly with `message/add` and `message/update`
3. Console logs will show detailed message flow for debugging

Reload VS Code window and test the chat functionality to verify all issues are resolved.