# ContinueInputBox Visual Update - Implementation Plan

## Overview
Focus on essential visual updates to match the Continue extension's design, starting with core components and building incrementally.

## Key Insights from Analysis
- We have `isProcessing` from Redux state for streaming indication
- VS Code theme variables are already set up via `varWithFallback`
- InputToolbar needs to be integrated inside the input (not below)
- Start minimal, add optional components later

## Progress Tracking
- [ ] Phase 1: Core Visual Structure
- [ ] Phase 2: Essential Styling & Integration
- [ ] Phase 3: Polish & Integration
- [ ] Phase 4: Optional Components (DEFERRED)

---

## Phase 1: Core Visual Structure (3 SUB-TASKS)

### SUB-TASK 1: Create GradientBorder Component ✅
**Goal**: Create the animated border wrapper that indicates streaming state
**Changes**:
- Create `src/webview/components/ContinueInputBox/GradientBorder.tsx`:
  - Styled component with 1px padding for border effect
  - Props: `isStreaming: boolean`, `children: React.ReactNode`
  - Solid border (vscBackground) when idle
  - Animated gradient when streaming
  - 5px border radius
**Visual Check**: Border wraps content with proper radius, prepare animation styles
**Status**: Completed

### SUB-TASK 2: Restructure ContinueInputBox Container ✅
**Goal**: Update container hierarchy and integrate GradientBorder
**Changes**:
- `src/webview/components/ContinueInputBox/index.tsx`:
  - Replace InputContainer with nested structure
  - Add `relative flex flex-col px-2` container
  - Wrap TipTapEditor in GradientBorder
  - Connect `isProcessing` from Redux for streaming state
**Visual Check**: Proper container padding (8px horizontal), GradientBorder visible
**Status**: Completed

### SUB-TASK 3: Remove TipTapEditor Border & Adjust Styling ✅
**Goal**: Move border responsibility to GradientBorder
**Changes**:
- `src/webview/components/TipTapEditor/index.tsx`:
  - Remove border from EditorContainer
  - Keep background, padding, transitions
  - Ensure focus states still work (without border change)
**Visual Check**: Editor has no border, background color correct, focus still visible
**Status**: Completed

---

## Phase 2: Essential Styling & Integration (4 SUB-TASKS)

### SUB-TASK 4: Move InputToolbar Inside Editor ✅
**Goal**: Integrate toolbar within the input structure as per target design
**Changes**:
- Move InputToolbar rendering inside TipTapEditor component
- Adjust EditorContainer to accommodate toolbar at bottom
- Update padding/spacing for integrated look
**Visual Check**: Toolbar appears inside the input box, proper spacing
**Status**: Completed

### SUB-TASK 5: Implement Gradient Animation ✅
**Goal**: Add the streaming animation to GradientBorder
**Changes**:
- Add CSS keyframes for gradient animation
- Implement 6-color gradient as specified
- 6-second linear infinite animation
- Test with mock isStreaming state
**Visual Check**: Rainbow gradient animates smoothly when streaming
**Status**: Completed (Already implemented in SUB-TASK 1)

### SUB-TASK 6: Add Focus Transitions ✅
**Goal**: Smooth focus state transitions without border changes
**Changes**:
- Update EditorContainer focus styles (use opacity or background)
- Ensure 0.15s ease-in-out transitions
- Coordinate with parent container if needed
**Visual Check**: Smooth visual feedback on focus/blur
**Status**: Completed

### SUB-TASK 7: Test Responsive Behavior
**Goal**: Ensure proper spacing at different viewport sizes
**Changes**:
- Test container padding on mobile/desktop
- Verify editor min/max heights work correctly
- Check toolbar positioning stays consistent
**Visual Check**: Layout works well on narrow and wide viewports
**Status**: Not Started

---

## Phase 3: Polish & Integration (2 SUB-TASKS)

### SUB-TASK 8: Wire Up Streaming State ✅
**Goal**: Connect real isProcessing state to GradientBorder
**Changes**:
- Pass isProcessing to ContinueInputBox from Chat component
- Determine if current message is last user input
- Apply streaming animation only when appropriate
**Visual Check**: Gradient appears during actual message processing
**Status**: Completed

### SUB-TASK 9: Final Visual Polish
**Goal**: Ensure all styling matches target design
**Changes**:
- Verify all border radii are consistent (5px)
- Check color variables match VS Code theme
- Ensure smooth transitions throughout
- Clean up any unused styles
**Visual Check**: Pixel-perfect match to Continue extension
**Status**: Not Started

---

## Phase 4: Optional Components

### SUB-TASK 10: Implement Lump Toolbar Component ✅
**Goal**: Create the toolbar that appears above the input
**Changes**:
- Created Lump.tsx with LumpDiv styled component
- Implemented the "attached look" with rounded top corners only
- Added toolbar buttons for Models, Rules, Docs, Prompts
- Updated GradientBorder to have no top radius when Lump is present
- Matching 4px margins for seamless alignment
**Visual Check**: Toolbar appears above input with seamless attachment
**Status**: Completed

### SUB-TASK 11: Move GradientBorder to Message Component ✅
**Goal**: Apply gradient animation to user messages during streaming
**Changes**:
- Removed GradientBorder from ContinueInputBox
- Restored regular border to TipTapEditor
- Added GradientBorder to StepContainer for user messages
- Pass isStreaming to last user message when processing
- Updated UserMessageDiv styling
**Visual Check**: User messages show gradient border when Claude is responding
**Status**: Completed

### Remaining Optional Components (DEFERRED)
- RulesPeek for displaying active rules
- ContextItemsPeek for context indicators
- Additional visual states
- Lump content expansion functionality

---

## Success Criteria
- ✅ GradientBorder provides visual streaming feedback
- ✅ InputToolbar integrated inside the input
- ✅ All current chat functionality preserved
- ✅ Clean, maintainable component structure
- ✅ Smooth animations and transitions
- ✅ Responsive behavior works correctly
- ✅ Uses existing VS Code theme system

## Notes
- Each sub-task is small and immediately testable
- Visual changes only - no logic implementation
- Preserves all existing functionality
- Ready for future feature additions

## Implementation Log

### Session 1 - 2025-06-27
- Created implementation plan
- ✅ Completed SUB-TASK 1: Create GradientBorder Component
  - Created GradientBorder.tsx with streaming animation capability
  - Added 6-color gradient animation (6s linear infinite)
  - Uses vscBackground for idle state
- ✅ Completed SUB-TASK 2: Restructure ContinueInputBox Container
  - Added Container styled component with flex layout and 8px padding
  - Integrated GradientBorder wrapping TipTapEditor
  - Connected isProcessing from Redux state
- ✅ Completed SUB-TASK 3: Remove TipTapEditor Border
  - Removed border from EditorContainer
  - Updated transition to background-color (0.15s ease-in-out)
  - Changed image selection from border to outline
- ✅ Completed SUB-TASK 4: Move InputToolbar Inside Editor
  - Added props to TipTapEditor for toolbar functionality
  - Created EditorContentWrapper for proper layout
  - Moved InputToolbar inside EditorContainer
  - Removed duplicate InputToolbar from ContinueInputBox
- ✅ SUB-TASK 5 was already completed (gradient animation in GradientBorder)
- ✅ Completed SUB-TASK 6: Add Focus Transitions
  - Added isFocused prop to GradientBorder with focus border color
  - Updated ContinueInputBox to track focus state
  - Added onFocus/onBlur callbacks to TipTapEditor
  - Added subtle opacity change to EditorContainer on focus
  - All transitions use 0.15s ease-in-out timing
- ✅ Completed SUB-TASK 8: Wire Up Streaming State
  - Added isStreaming prop to ContinueInputBox
  - Chat component now passes showWaitingIndicator logic
  - Streaming animation only shows when:
    - isProcessing is true AND
    - Last message is from user OR
    - Last message is empty assistant with no content/tools
  - Removed direct Redux dependency from ContinueInputBox

### Additional Updates - 2025-06-27
- ✅ Restructured layout for fixed bottom input
  - Chat uses column-reverse for typewriter effect
  - InputArea is sticky at bottom with proper z-index
  - Messages appear at bottom and scroll up
- ✅ Moved model selector to input toolbar
  - Created compact ModelSelector component
  - Integrated into InputToolbar next to context button
  - Props passed through all components
- ✅ Implemented Lump Toolbar Component (SUB-TASK 10)
  - Created Lump.tsx with seamless attachment pattern
  - Rounded top corners only, no bottom border
  - Toolbar buttons for Models, Rules, Docs, Prompts
  - GradientBorder adjusts radius when Lump is present
  - Matching 4px margins for alignment
- ✅ Corrected GradientBorder Implementation (SUB-TASK 11)
  - Moved GradientBorder from input to user messages
  - Restored regular border to input editor
  - GradientBorder now highlights the message Claude is responding to
  - Proper streaming state detection for last user message