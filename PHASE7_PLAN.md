# Phase 7: GUI Implementation Plan

## Objective
Port the React GUI from `/gui` directory while maintaining 1:1 visual parity and connecting to our existing Redux store and Claude Code functionality.

## Key Principles
1. **Visual Fidelity**: Exact match with GUI styling, animations, and interactions
2. **Dynamic Data**: All data comes from Redux store and Claude Code responses
3. **No Hardcoding**: Models, features, and options are always dynamic
4. **Preserve UX**: Keep all hover states, transitions, and micro-interactions

## Component Porting Order

### 1. Base Components (Foundation)
These components have no dependencies and are used by others:

#### a. Theme System Integration
- [ ] Port `varWithFallback` function
- [ ] Ensure all VS Code CSS variables are mapped
- [ ] Test theme switching (dark/light)

#### b. Utility Components
- [ ] `AnimatedEllipsis` - Loading animation
- [ ] `CustomScrollbarDiv` - Scrollbar styling
- [ ] `Button`, `SecondaryButton`, `GhostButton` - Button variants
- [ ] `Input` - Styled input component

#### c. Icon Components
- [ ] Copy all SVG icons from GUI
- [ ] Create Icon component wrapper
- [ ] Map VS Code icon colors

### 2. Content Display Components

#### a. StyledMarkdownPreview
- [ ] Port markdown rendering logic
- [ ] Include syntax highlighting (Prism.js)
- [ ] Add copy button for code blocks
- [ ] Support KaTeX math rendering
- [ ] Handle image rendering

#### b. CodeBlock
- [ ] Syntax highlighting with theme support
- [ ] Line numbers
- [ ] Copy functionality
- [ ] Language detection

#### c. StepContainer
- [ ] Message wrapper with padding
- [ ] Thinking indicator
- [ ] Response actions (copy, retry, etc.)
- [ ] Truncation detection

### 3. Input Components

#### a. TipTap Editor
- [ ] Basic editor setup
- [ ] Mention extension (@claude)
- [ ] Command extension (/)
- [ ] Image support (drag & drop)
- [ ] Placeholder text
- [ ] Auto-focus management

#### b. ContinueInputBox
- [ ] Wrapper for TipTap
- [ ] Submit button
- [ ] Character/token counting
- [ ] Keyboard shortcuts

### 4. Selection Components

#### a. ModelSelector
- [ ] Dropdown with VS Code styling
- [ ] Dynamic model list from Redux
- [ ] Provider logos
- [ ] API key indicators
- [ ] Selection state management

#### b. TabBar (Session Management)
- [ ] Tab styling
- [ ] Active tab indicator
- [ ] Close buttons
- [ ] Overflow handling

### 5. Layout Components

#### a. Chat View
- [ ] Main chat container
- [ ] Message list with scrolling
- [ ] Empty state (conversation starters)
- [ ] New session button

#### b. Footer
- [ ] Status indicators
- [ ] Token count display
- [ ] Cost tracking
- [ ] Settings link

### 6. Dialog Components
- [ ] TextDialog
- [ ] OnboardingCard
- [ ] Error boundaries

## Styling Requirements

### Colors (from theme.ts)
```typescript
// Always use VS Code variables with fallbacks
background: var(--vscode-editor-background, #1e1e1e)
foreground: var(--vscode-editor-foreground, #e6e6e6)
primary: var(--vscode-button-background, #2c5aa0)
border: var(--vscode-input-border, #555555)
```

### Spacing
- Default border radius: 5px
- Padding: 4px, 8px, 12px, 16px
- Margins: Follow GUI patterns

### Animations
- Button hover: `filter: brightness(1.2)`
- Transitions: 200ms ease-in-out
- Loading animations: Use keyframes from GUI

## Integration Points

### Redux Store
- Connect all components to existing slices:
  - `session` - Chat history, current message
  - `ui` - Loading states, dialogs
  - `config` - Settings, models
  - `claude` - Process state, responses

### IdeMessenger
- All VS Code communication through protocol
- Type-safe message passing
- Stream handling for responses

### Data Flow
```
User Input (TipTap) 
  → Redux Action 
  → IdeMessenger 
  → Claude Process 
  → Stream Response 
  → Redux Update 
  → UI Update
```

## Testing Strategy

### Visual Testing
1. Side-by-side comparison with GUI
2. Screenshot regression tests
3. Theme switching verification
4. Responsive behavior

### Functional Testing
1. All interactions work as expected
2. Data flows correctly through Redux
3. Stream updates render smoothly
4. Error states handled gracefully

## Success Criteria
- [ ] Visually indistinguishable from GUI reference
- [ ] All animations and transitions preserved
- [ ] Dynamic data throughout (no hardcoding)
- [ ] Smooth performance with streaming
- [ ] Accessibility maintained
- [ ] Works in all VS Code themes

## Implementation Notes

1. **Start Simple**: Begin with static components, add interactivity later
2. **Test Often**: Check visual parity after each component
3. **Use Existing Styles**: We've already copied all CSS and styled components
4. **Preserve Behavior**: Keep all hover states, focus management, etc.
5. **Dynamic First**: Always pull from Redux/Claude, never hardcode

## Next Steps
1. Start with base utility components
2. Move to content display (markdown, code blocks)
3. Implement input components (TipTap)
4. Add selection UI (models, settings)
5. Complete with layout and routing