# Thinking Indicator Smooth Transitions

## Problem
The previous implementation caused UI jumping because:
1. Empty assistant message was created immediately
2. Content was injected/updated causing layout shifts
3. State transitions were abrupt without smooth animations

## Solution
Created a React-based state machine (`ThinkingStateMachine`) that:

### 1. State Management
- Uses React hooks (`useState`, `useEffect`) to manage transitions
- Implements a proper state machine with 4 states:
  - `idle`: No thinking indicator shown
  - `processing`: Shows rotating fun messages
  - `thinking`: Shows "Thinking..." with actual content
  - `completed`: Shows "Thought for X.xs"

### 2. Smooth Transitions
- Delayed state transitions (100ms) to prevent flickering
- CSS animations for fade-in/fade-out effects
- Smooth content updates without layout jumps
- Processing message rotation every 2.5 seconds

### 3. Backend Changes
- Removed immediate empty assistant message creation
- Create assistant message only when first content arrives
- This prevents the UI from jumping when thinking starts

## Key Components

### ThinkingStateMachine.tsx
```typescript
// State determination logic
const determineState = (): ThinkingState => {
  if (!isActive && !content && !duration) return 'idle';
  if (isActive && !content) return 'processing';
  if (isActive && content) return 'thinking';
  if (!isActive && (content || duration)) return 'completed';
  return 'idle';
};

// Smooth transitions with delays
if (state !== newState) {
  // Immediate for idle -> processing
  if (state === 'idle' && newState === 'processing') {
    setState(newState);
  } else {
    // Delayed for other transitions
    transitionTimeoutRef.current = setTimeout(() => {
      setState(newState);
    }, 100);
  }
}
```

### ExtensionMessageHandler.ts
```typescript
// Create assistant message only when content arrives
if (!this.hasCreatedAssistantMessage) {
  this.webviewProtocol?.post('message/add', {
    role: 'assistant',
    content: '',
    isThinkingActive: this.thinkingStartTime !== null
  });
  this.hasCreatedAssistantMessage = true;
}
```

## Benefits
1. **No UI Jumping**: Messages appear smoothly without layout shifts
2. **Better UX**: Clear visual feedback for each state
3. **Performance**: Efficient React-based rendering
4. **Maintainable**: Clean state machine pattern

## Testing
Test with various scenarios:
1. Quick responses (no thinking)
2. Long thinking processes
3. Rapid state changes
4. Multiple messages in sequence