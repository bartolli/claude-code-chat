# Message Choreography Improvement Plan

## Problem Statement
Currently, tool executions are displayed in a separate header section ("Tool Executions (22)") above Claude's messages, breaking the logical flow of the conversation. This makes it unclear why Claude is using specific tools at specific points.

## Solution: Two-Level Expansion System

### Overview
Create an inline tool display with two levels of expansion:
1. **Chain Level** - Groups parent-child tools together
2. **Tool Level** - Individual tool expand/collapse for input/output

### Visual Examples

#### Collapsed Chain View (Default)
```
▶ Task chain: 5 tools
  └─ ✓ Grep (search for pattern)
  └─ ✓ Read (file.ts)
  ... and 3 more
```

#### Expanded Chain View
```
▼ Task chain: 5 tools
  └─ ✓ Task (analyze code)
  └─ ✓ Read (main.ts)
  └─ ✓ Grep (search pattern)
  └─ ✓ Read (util.ts)
  └─ ✓ Read (types.ts)
```

#### Tool-Level Expansion
```
▼ Task chain: 5 tools
  └─ ▼ Read (main.ts)
       Input: { file_path: "/src/main.ts" }
       Output: [file contents...]
  └─ ✓ Grep (search pattern)
  └─ ✓ Read (util.ts)
```

## Implementation Tasks

### High Priority
1. **Create InlineToolDisplay component structure with chain container**
   - New component to replace ToolTreeView in message flow
   - Support for chain grouping

2. **Implement ToolChainContainer with expand/collapse for tool groups**
   - Container component for tool chains
   - Expand/collapse state management

3. **Show only last 2 tools in chain when collapsed, all tools when expanded**
   - Smart truncation logic
   - Preserve most recent/relevant tools

4. **Ensure each individual tool within chain is still expandable for context**
   - Reuse existing ToolUseDisplay component
   - Maintain all current functionality

5. **Update StepContainer to use new InlineToolDisplay with chains**
   - Replace ToolTreeView import
   - Adjust message flow order

### Medium Priority
6. **Add chain summary header (e.g., 'Task chain: 5 tools, 2 shown')**
   - Clear indication of total vs shown tools
   - Informative headers

7. **Style nested tool indentation within expanded chains**
   - Visual hierarchy for parent-child relationships
   - Consistent with VS Code styling

### Low Priority
8. **Add smooth expand/collapse animations for chains**
   - Enhance user experience
   - Smooth transitions

9. **Test nested expansion states (chain expanded + individual tools)**
   - Ensure state persistence
   - Handle edge cases

10. **Add '... and X more' indicator for collapsed chains**
    - Clear indication of hidden tools
    - Clickable to expand

## Message Flow Structure

For Assistant messages, the new flow will be:
1. **Thinking indicator** (if present)
2. **Message content**
3. **Inline tool executions** (grouped in chains)

## Key Benefits
- ✅ **Organic flow** - Tools appear where Claude uses them
- ✅ **Progressive disclosure** - Compact by default, detailed on demand
- ✅ **Clear context** - Users understand why each tool is being used
- ✅ **Maintains functionality** - All tool information still accessible
- ✅ **Better UX** - No jarring separation between tools and content

## Technical Notes
- Reuse existing `ToolUseDisplay` component for individual tools
- Leverage existing `buildToolHierarchy` utility for parent-child relationships
- Maintain all current expand/collapse functionality
- Ensure state persistence during re-renders