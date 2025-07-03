# Thinking State Fix Summary

## Issue
The first thinking indicator was remaining in "Thinking..." state instead of transitioning to "Thought for X seconds" when completed.

## Root Cause
1. The initial assistant message was created without a `messageId`
2. Thinking updates were sent with `messageId: 'msg_01JEpoQfZ15Q9dWFDwEFrvWM'`
3. The sessionSlice couldn't find a message with that messageId, so it assigned thinking to the wrong message
4. The first thinking indicator never received the completion update

## Solution
Added logic to assign the messageId during thinking updates:

1. **In sessionSlice `messageUpdated`**: Added logic to update messageId when provided
2. **In sessionSlice `thinkingUpdated`**: When falling back to the last assistant message, if we have a messageId and the message doesn't, we assign it

This ensures that:
- Messages are properly tracked by their messageId
- Thinking updates go to the correct message
- All thinking indicators properly transition from active to completed state

## Result
- Smooth transitions: "Processing" → "Thinking..." → "Thought for X seconds"
- No more stuck thinking indicators
- Proper message tracking throughout the conversation flow