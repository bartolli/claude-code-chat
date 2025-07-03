# Message Segmentation Plan

## Problem Statement
Currently, all of Claude's responses accumulate into a single message container with all tools shown at the end. This creates a poor UX where the logical flow of Claude's thinking and actions is lost.

## Goal
Implement CLI-style message segmentation where each logical step appears as a separate message block with its associated tools, creating a clear step-by-step flow.

## Visual Comparison

### Current (Wrong):
```
Claude: [All accumulated text in one big message]
        [All tools shown at the end]
```

### Desired (Like CLI):
```
⏺ Claude: I'll analyze your files...
   ⎿ TodoWrite: Created analysis tasks

⏺ Claude: Let me read the package.json
   ⎿ Read: package.json (268 lines)
   ⎿ TodoWrite: Marked task complete

⏺ Claude: Now checking the README
   ⎿ Read: README.md (331 lines)
   ⎿ TodoWrite: Marked task complete

⏺ Claude: Here are the improvements needed...
   [Full analysis content]
```

## Implementation Strategy

### 1. Message Segmentation Rules
Break messages at these points:
- **Before tool usage** - When Claude says "Let me..." or "I'll..."
- **After tool results** - Create new segment for Claude's response to results
- **Natural breaks** - Double newlines, section headers, topic changes
- **Explicit markers** - Special tokens from the API indicating segments

### 2. Architecture Changes

#### A. Message Data Structure
```typescript
interface SegmentedMessage {
  id: string;
  role: 'assistant';
  content: string;
  segmentType: 'intro' | 'tool-preface' | 'tool-response' | 'conclusion';
  toolUses?: ToolUse[];
  timestamp: number;
  parentMessageId?: string; // Links segments together
}
```

#### B. Streaming Buffer Strategy
```typescript
class MessageSegmenter {
  private buffer: string = '';
  private pendingTools: ToolUse[] = [];
  
  processChunk(chunk: StreamChunk): SegmentedMessage[] {
    // Detect break points and emit segments
  }
  
  detectBreakPoint(text: string): BreakPoint | null {
    // Pattern matching for segment boundaries
  }
}
```

### 3. Break Point Detection Patterns

#### Stream-Based Breaking Points:
Based on the log analysis, messages break when:
```json
// New content block after tool use
{"type":"assistant","message":{..."content":[{"type":"text","text":"..."}]...}}

// Tool use block
{"type":"assistant","message":{..."content":[{"type":"tool_use","id":"...","name":"..."}]...}}
```

**Key Pattern**: Each assistant message with new text content after a tool result creates a natural break point.

#### Content-Based Patterns:
```
- "Let me [action]..."
- "I'll [action]..."
- "Looking at..."
- "Based on..."
- "Perfect!"
- Section headers (##, ###)
- Numbered/bulleted lists
```

### 4. Tool Association Logic

#### Stream Event Sequence:
1. **Text Message** → Buffer as segment content
2. **Tool Use** → End current segment, attach tool to it
3. **Tool Result** → Start new segment for response
4. **New Text** → Create new message segment

#### Example Flow from Logs:
```
1. {"type":"assistant","content":[{"type":"text","text":"I'll analyze..."}]}
   → Create Segment 1: "I'll analyze..."

2. {"type":"assistant","content":[{"type":"tool_use","name":"Read"}]}
   → Attach Read tool to Segment 1

3. {"type":"user","content":[{"type":"tool_result"}]}
   → Tool result received

4. {"type":"assistant","content":[{"type":"text","text":"Looking at the file..."}]}
   → Create Segment 2: "Looking at the file..."
```

### 5. UI Presentation

#### Message Segment Component:
```tsx
<MessageSegment>
  <SegmentBullet>⏺</SegmentBullet>
  <SegmentContent>
    <Text>{segment.content}</Text>
    {segment.toolUses && (
      <InlineToolDisplay tools={segment.toolUses} />
    )}
  </SegmentContent>
</MessageSegment>
```

#### CLI-Style Display:
```
⏺ I'll analyze the package.json and README files...

⏺ Update Todos
  ⎿ ☐ Analyze package.json for improvements
     ☐ Analyze README.md for improvements

⏺ Read(package.json)
  ⎿ Read 268 lines (ctrl+r to expand)

⏺ Looking at your package.json, I found several issues...
```

#### Visual Styling:
- Subtle spacing between segments
- Consistent bullet/icon for each segment
- Indented tool displays
- Smooth transitions as segments appear

### 6. State Management Updates

#### Chat Component Changes:
- Replace single `currentStreamingMessage` with `streamingSegments[]`
- Add `MessageSegmenter` instance
- Update `handleStreamingMessage` to create segments
- Modify message rendering to show segments

#### Message Store Updates:
- Support segmented message structure
- Maintain segment relationships
- Handle segment updates during streaming

### 7. Edge Cases to Handle

1. **Rapid tool calls** - Batch related tools in same segment
2. **Long responses** - Force breaks at reasonable intervals
3. **Error handling** - Gracefully handle segmentation failures
4. **Code blocks** - Don't break inside code/markdown blocks
5. **User interruption** - Finalize pending segments

### 8. Implementation Steps

1. **Phase 1: Core Segmentation** ✅
   - Create MessageSegmenter class ✅
   - Implement break point detection ✅
   - Add buffering logic ✅

2. **Phase 2: Chat Integration** 🔄 IN PROGRESS
   - Update ExtensionMessageHandler to use segmenter ✅
   - Update message types to support segments ✅
   - Update sessionSlice to handle segmented messages ✅
   - Update Chat component to render segments separately ⏳

3. **Phase 3: Tool Association**
   - Track tool timing
   - Associate tools with segments
   - Update InlineToolDisplay usage

4. **Phase 4: UI Polish**
   - Add segment styling
   - Implement transitions
   - Add visual indicators

### 9. Testing Strategy

- Test with various response patterns
- Verify tool association accuracy
- Check performance with long conversations
- Validate break point detection
- Test interruption handling

### 10. Success Criteria

✅ Each logical step appears as separate message
✅ Tools appear with relevant message segment
✅ Clear visual flow like CLI
✅ No loss of information
✅ Smooth streaming experience
✅ Maintains all existing functionality