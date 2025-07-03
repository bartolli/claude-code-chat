# Message Flow Orchestration Documentation

## Overview
The message flow system coordinates how Claude's responses are streamed, processed, and displayed in the UI. It involves multiple components working together to provide a smooth, real-time experience.

## Key Components

### 1. ExtensionMessageHandler
- **Purpose**: Processes Claude's streaming JSON responses and sends updates to the UI
- **Location**: `/src/services/ExtensionMessageHandler.ts`

### 2. MessageSegmenter
- **Purpose**: Organizes content into logical segments (intro, tool-preface, tool-response, continuation)
- **Location**: `/src/services/MessageSegmenter.ts`
- **Note**: While it creates segments internally, the UI treats everything as a single message

### 3. SessionSlice (Redux)
- **Purpose**: Manages the UI state for messages and sessions
- **Location**: `/src/state/slices/sessionSlice.ts`

### 4. UI Components
- **Chat.tsx**: Main chat container that orchestrates the conversation
- **StepContainer**: Renders individual messages with proper component ordering
- **ThinkingIndicator**: Shows thinking state and content

## Important IDs to Track

### 1. **messageId**
- **Source**: Claude's API response (`json.message?.id`)
- **Format**: `msg_XXXXXXXXXXXXXXXXXXXXX`
- **Purpose**: Uniquely identifies a message from Claude
- **Usage**: Links thinking updates to the correct message

### 2. **segmentId**
- **Source**: MessageSegmenter (`seg_${timestamp}_${random}`)
- **Format**: `seg_1751501887365_gaddkdzxb`
- **Purpose**: Originally designed to track segments within a message
- **Current Status**: Not actively used in the final implementation

### 3. **sessionId**
- **Source**: sessionSlice or Claude API
- **Purpose**: Groups messages into conversations
- **Usage**: Tracks which session messages belong to

### 4. **toolId**
- **Source**: Claude's API (`block.id`)
- **Format**: `toolu_XXXXXXXXXXXXXXXXXXXXX`
- **Purpose**: Uniquely identifies a tool use
- **Usage**: Links tool results back to tool calls

## Message Flow Sequence

### 1. User Submits Message
```
User Input → ExtensionMessageHandler.handleChatMessage()
  ↓
1. Set isProcessing = true
2. Create user message in Redux
3. Start Claude process
```

### 2. Initial Response Setup (system case)
```
Claude "system" JSON → processClaudeStreamMessage()
  ↓
1. Initialize MessageSegmenter
2. Create assistant message with:
   - role: 'assistant'
   - content: ''
   - messageId: from stream (if available)
   - isThinkingActive: true
3. Set hasCreatedAssistantMessage = true
```

### 3. Thinking Updates
```
Claude "thinking" blocks → processClaudeStreamMessage()
  ↓
1. Accumulate thinking content
2. Send updates via 'message/thinking':
   - content: accumulated thinking
   - currentLine: last line for preview
   - isActive: true
   - messageId: to link to correct message
   - duration: calculated when complete
```

### 4. Tool Usage
```
Claude "tool_use" blocks → processClaudeStreamMessage()
  ↓
1. Process through MessageSegmenter.processToolUse()
2. Send via 'message/toolUse':
   - toolName, toolId, input
   - status: 'calling'
   - NO segmentId (attaches to last assistant message)
```

### 5. Tool Results
```
Claude "tool_result" blocks → processClaudeStreamMessage()
  ↓
Send via 'message/toolResult':
  - toolId: matches the tool_use
  - result: extracted text
  - status: 'complete'
```

### 6. Content Streaming
```
Claude "text" blocks → processClaudeStreamMessage()
  ↓
1. Process through MessageSegmenter.processTextChunk()
2. Accumulate ALL content from all segments
3. Send via 'message/update':
   - role: 'assistant'
   - content: total accumulated content
   - NO segmentId (updates single message)
```

### 7. Completion
```
Process exit → ExtensionMessageHandler exit handler
  ↓
1. Send final 'message/thinking' with isActive: false
2. Send final 'message/update' with:
   - Complete accumulated content
   - isThinkingActive: false
3. Send 'chat/messageComplete'
4. Set isProcessing = false
5. Reset message tracking flags
```

## Redux State Management

### Message Structure in Redux
```typescript
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: number,
  messageId?: string,          // Links updates to this message
  segmentId?: string,          // Not actively used
  isThinkingActive?: boolean,  // Shows thinking indicator
  thinking?: string,           // Thinking content
  thinkingDuration?: number,   // Time spent thinking
  currentThinkingLine?: string,// Preview line
  toolUses?: Array<{           // Attached tools
    toolName: string,
    toolId: string,
    input: any,
    result?: string,
    isError?: boolean
  }>,
  tokenUsage?: {               // Token counts
    input: number,
    output: number,
    cache: number,
    thinking: number
  }
}
```

### Key Redux Actions

1. **messageAdded**: Creates a new message
2. **messageUpdated**: Updates content/state of existing message
   - Finds by segmentId (if provided) OR last assistant message
   - Updates messageId if needed
3. **thinkingUpdated**: Updates thinking content
   - Finds by messageId OR falls back to last assistant
   - Assigns messageId if missing
4. **toolUseAdded**: Adds tool to message
   - Finds by segmentId OR last assistant message
5. **toolResultAdded**: Updates tool with result

## UI Display Order (StepContainer)

```
Assistant Message
  ├── ThinkingIndicator (if thinking || isThinkingActive)
  ├── InlineToolDisplay (if toolUses.length > 0)
  └── StyledMarkdownPreview (content)
```

## MessageSegmenter Logic

While the MessageSegmenter creates logical segments, they're not used as separate messages:

1. **Segment Types**:
   - `intro`: Initial content
   - `tool-preface`: Content before tools (e.g., "Let me check...")
   - `tool-response`: Content after tools
   - `continuation`: Additional sections

2. **Break Points**:
   - Tool preface patterns: "Let me", "I'll", "Looking at"
   - Section headers: Markdown headers (`#`)
   - Double newlines with significant text

3. **Current Usage**: 
   - Segments are created internally but all content is accumulated
   - The UI receives the total accumulated content, not individual segments

## State Synchronization

### Processing States
1. **isProcessing** (global): User submitted, waiting for response
2. **isThinkingActive** (per message): Claude is actively thinking
3. **streamingState.isStreaming** (backend): Currently receiving stream

### Message Creation Timing
1. Assistant message created once in 'system' case
2. All subsequent updates use 'message/update'
3. No duplicate messages created

### Gradient Border Logic
Shows on last user message when:
- `isProcessing` is true AND
- No assistant message exists OR
- Assistant message has no content/thinking yet

## Common Issues and Solutions

1. **Double Processing Indicators**: Only create assistant message once
2. **Missing Tools**: Ensure toolUse updates are sent without segmentId
3. **Wrong Message Updates**: Track and use messageId consistently
4. **Stuck Thinking State**: Send final thinking update with isActive: false
5. **Missing Content**: Accumulate all segment content before sending

## Best Practices

1. **Let React Manage UI**: Backend sends data, React decides display
2. **Single Source of Truth**: One assistant message per response
3. **Consistent IDs**: Use messageId to link all updates
4. **Complete Updates**: Send all accumulated content on each update
5. **Clear State Transitions**: Properly reset flags after completion