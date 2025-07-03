# Thinking Indicator Test Plan

## Test Cases

### 1. Non-Thinking Response
**Input**: "What is 2+2?"
**Expected Flow**:
1. User message appears
2. Processing state shows with rotating messages ("Pondering", "Analyzing", etc.)
3. Assistant response appears directly (no thinking indicator remains)

### 2. Thinking Response
**Input**: "Think deeply about why the sky is blue"
**Expected Flow**:
1. User message appears
2. Processing state shows with rotating messages
3. Thinking state shows "Thinking..." with animated dots
4. Current thinking line updates as Claude thinks
5. When complete: "Thought for X.xs" with first line of response as preview
6. Clicking expands to show full thinking content

### 3. Quick Thinking Response
**Input**: "Think about what 5+5 equals"
**Expected Flow**:
1. User message appears
2. Processing state might briefly show
3. Thinking state shows briefly
4. Quickly transitions to "Thought for X.xs"

## Debug Checklist

1. **Check Console Logs**:
   - `[ThinkingIndicator] Rendering:` - Shows current state
   - `[sessionSlice] thinkingUpdated:` - Shows state updates
   - `[DEBUG] Sent initial processing state` - Confirms initial state sent

2. **Check Extension Output**:
   - `[DEBUG] Thinking started at:` - Confirms thinking detected
   - `[DEBUG] Thinking completed. Duration:` - Confirms completion handled
   - `[DEBUG] Sending thinking update to UI` - Confirms updates sent

3. **State Verification**:
   - Initial: `isActive: true, content: ''`
   - Thinking: `isActive: true, content: '<thinking text>'`
   - Complete: `isActive: false, duration: X, content: '<full thinking>'`

## Common Issues

1. **No Processing State**: Check if empty assistant message is created
2. **No Thinking Transition**: Check if thinking content is detected in stream
3. **No Completion**: Check if result event is received and processed