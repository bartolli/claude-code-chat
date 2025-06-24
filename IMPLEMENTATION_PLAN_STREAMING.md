# Implementation Plan: Fix Webview-Backend Streaming

## Overview
Fix the broken streaming communication between backend and webview based on findings in WEBVIEW_BACKEND_FLOW.md

## Phase 1: Debug Message Delivery (Priority: CRITICAL)

### Task 1.1: Verify SimpleWebviewProtocol Console Logging
- [ ] Add unique identifiers to console.log in SimpleWebviewProtocol.post()
- [ ] Add try-catch around postMessage to catch any errors
- [ ] Log the full message object being sent
- [ ] Check if console.log is being suppressed for certain message types

### Task 1.2: Test Message Reception in Webview
- [ ] Add console.log in IdeMessenger's message event listener
- [ ] Log ALL messages received from backend
- [ ] Verify message structure matches expected format
- [ ] Check if messages are being filtered before reaching App.tsx

### Task 1.3: Add Message Sequence Tracking
- [ ] Add timestamp to each message
- [ ] Add sequence numbers to track order
- [ ] Log when messages are sent vs when received
- [ ] Identify any timing issues

## Phase 2: Fix Architecture Issues (Priority: HIGH)

### Task 2.1: Ensure Single ExtensionMessageHandler Instance
- [ ] Store ExtensionMessageHandler instance as class property in ClaudeChatProvider
- [ ] Create it once during initialization
- [ ] Reuse the same instance in _setupMessageHandling()
- [ ] Verify webviewProtocol is attached to the correct instance

### Task 2.2: Fix Message Handler Lifecycle
- [ ] Initialize ExtensionMessageHandler when provider is created
- [ ] Attach webviewProtocol when webview is created
- [ ] Ensure handler survives webview recreation
- [ ] Add null checks and error handling

### Task 2.3: Implement Proper Message Queue
- [ ] Queue messages if webview isn't ready
- [ ] Send queued messages when webview becomes ready
- [ ] Add webview ready state tracking
- [ ] Implement retry mechanism for failed messages

## Phase 3: Fix Redux State Management (Priority: HIGH)

### Task 3.1: Debug Duplicate User Messages
- [ ] Add Redux DevTools temporarily to track state changes
- [ ] Log every dispatch action with payload
- [ ] Identify why user message appears multiple times
- [ ] Check if multiple messageAdded actions are dispatched

### Task 3.2: Fix Message State Updates
- [ ] Ensure messageAdded creates messages with unique IDs
- [ ] Verify messageUpdated finds the correct message
- [ ] Check if Redux state is properly immutable
- [ ] Fix any state mutation issues

### Task 3.3: Implement Proper Message Deduplication
- [ ] Add message deduplication logic
- [ ] Use message content hash or ID for deduplication
- [ ] Prevent duplicate user messages
- [ ] Ensure streaming updates work correctly

## Phase 4: Complete Streaming Implementation (Priority: MEDIUM)

### Task 4.1: Fix Assistant Message Display
- [ ] Ensure assistant messages are created with initial content
- [ ] Verify streaming updates append to existing content
- [ ] Fix empty message display issue
- [ ] Add loading state while streaming

### Task 4.2: Implement Proper Streaming UI
- [ ] Show typing indicator during streaming
- [ ] Smooth content updates without flicker
- [ ] Handle streaming errors gracefully
- [ ] Add retry button for failed messages

### Task 4.3: Add Message Metadata
- [ ] Display token count
- [ ] Show cost information
- [ ] Add timestamp
- [ ] Show model information

## Phase 5: Testing & Validation (Priority: MEDIUM)

### Task 5.1: Create Test Scenarios
- [ ] Test single message exchange
- [ ] Test rapid message sending
- [ ] Test long streaming responses
- [ ] Test error scenarios

### Task 5.2: Add Comprehensive Logging
- [ ] Add debug mode toggle
- [ ] Log all message flow steps
- [ ] Add performance metrics
- [ ] Create troubleshooting guide

### Task 5.3: Clean Up Debug Code
- [ ] Remove excessive console.log statements
- [ ] Keep essential logging for production
- [ ] Add log levels (debug, info, error)
- [ ] Document logging strategy

## Implementation Order

1. **Start with Phase 1** - We need to understand why messages aren't being delivered
2. **Then Phase 2** - Fix the architecture issues
3. **Then Phase 3** - Fix the state management
4. **Then Phase 4** - Complete the streaming UI
5. **Finally Phase 5** - Test and clean up

## Success Criteria

- [ ] User message appears only once
- [ ] Assistant response streams character by character
- [ ] No empty messages in UI
- [ ] Console shows all message types being sent
- [ ] Redux state updates correctly
- [ ] No duplicate messages or lost messages

## Time Estimate

- Phase 1: 1-2 hours (debugging)
- Phase 2: 2-3 hours (architecture fix)
- Phase 3: 2-3 hours (Redux fixes)
- Phase 4: 1-2 hours (UI polish)
- Phase 5: 1 hour (testing)

Total: 7-11 hours of focused work

## Compile build deploy

Use `make quick-reinstall` - It will do the magic and save time
