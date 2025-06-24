# Phase 7: Complete GUI Implementation Plan

## Overview
This document contains the complete plan for Phase 7, focusing on achieving 1:1 visual parity with the `/gui` reference while leveraging our existing Redux store and Claude Code functionality.

## Objective
Port the React GUI from `/gui` directory while maintaining exact visual fidelity and connecting to our existing implementation.

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

## Visual Parity Checklist

### 🎨 Global Styling
- [ ] Background uses `--vscode-editor-background`
- [ ] Text uses `--vscode-editor-foreground`
- [ ] Font family matches VS Code settings
- [ ] Scrollbars are thin (4px) with custom styling
- [ ] Border radius is consistently 5px

### 🔤 Typography
- [ ] Inter font for UI text (300 weight)
- [ ] JetBrains Mono for code (300 weight)
- [ ] Font sizes use `getFontSize()` utility
- [ ] Line height is 1.3 for body text

### 🎯 Buttons
- [ ] Primary: Dark text on light background (inverted colors)
- [ ] Secondary: Border style with transparent background
- [ ] Ghost: Semi-transparent gray background
- [ ] Hover: brightness(1.2) filter
- [ ] Disabled: 50% opacity, no pointer events

### 📝 TipTap Editor
- [ ] Placeholder text in gray (#646464)
- [ ] Mentions have badge styling
- [ ] Images max 96% width
- [ ] Selected images have border highlight
- [ ] Proper padding and focus states

### 📖 Markdown Preview
- [ ] GitHub-flavored markdown styling
- [ ] Code blocks with VS Code background
- [ ] Syntax highlighting with correct tokens
- [ ] Copy button appears on hover
- [ ] Tables with alternating row colors
- [ ] Links with accent color

### 🎭 Animations
- [ ] Ellipsis loading animation (2.5s cycle)
- [ ] Button hover transitions (200ms)
- [ ] Fade-in for new content (300ms)
- [ ] Smooth scrolling behavior

### 💬 Chat Interface
- [ ] Messages have proper padding (4px sides, 6px horizontal)
- [ ] Response actions appear below messages
- [ ] Thinking indicator pulses
- [ ] Empty state shows conversation starters
- [ ] New session button positioning

### 🎛️ Model Selector
- [ ] Dropdown matches VS Code style
- [ ] Provider logos display correctly
- [ ] Selected state has checkmark
- [ ] Hover states on options
- [ ] Disabled state for unavailable models

### 🎨 Color Consistency
- [ ] Light gray: #999998
- [ ] Green button: #189e72
- [ ] Error states use `--vscode-errorForeground`
- [ ] Success states use green tones
- [ ] Borders use `--vscode-input-border`

### 📐 Layout
- [ ] Grid layout (1fr auto)
- [ ] Proper overflow handling
- [ ] Responsive heights (70vh max for editor)
- [ ] Footer stays at bottom
- [ ] No horizontal scrolling

### 🖱️ Interactions
- [ ] Focus outlines removed (outline: none)
- [ ] Hover states on all interactive elements
- [ ] Cursor changes appropriately
- [ ] Drag and drop visual feedback
- [ ] Context menu styling

### 🌓 Theme Support
- [ ] Dark theme works correctly
- [ ] Light theme works correctly
- [ ] High contrast themes supported
- [ ] All colors use CSS variables

## Component Analysis from GUI

### Main Visual Components

#### Core UI Components (`/gui/src/components/`)
- **Layout.tsx** - Main app container with grid layout, uses styled-components
  - Key styling: Custom scrollbar, dark theme support, VS Code theme integration
  - Features: Grid layout (1fr auto), overflow handling, theme CSS variables

- **StyledMarkdownPreview/** - Rich markdown rendering with syntax highlighting
  - Key styling: GitHub-flavored markdown CSS, code blocks with VS Code editor background
  - Features: KaTeX math support, custom code block styling, line numbers

- **mainInput/TipTapEditor/** - Rich text editor with mentions and commands
  - Key styling: Custom placeholder, mention badges, image support
  - Features: Drag & drop, @mentions, slash commands, auto-focus

- **StepContainer/** - Message display containers
  - Key styling: Padding, VS Code background colors, overflow handling
  - Features: Thinking indicators, response actions, truncation detection

- **modelSelection/** - Model selector dropdown
  - Key styling: Custom listbox, provider tags, hover states
  - Features: Dynamic model loading, API key validation indicators

### Component Hierarchy

```
Layout
├── TabBar (optional session tabs)
├── Chat
│   ├── EmptyChatBody (conversation starters)
│   ├── StepsDiv
│   │   ├── StepContainer[]
│   │   │   ├── Reasoning
│   │   │   ├── StyledMarkdownPreview
│   │   │   └── ResponseActions
│   │   └── ToolCallDiv
│   ├── ContinueInputBox
│   │   └── TipTapEditor
│   └── NewSessionButton
├── History
│   └── HistoryTableRow[]
├── Config/Settings
└── Footer
```

### Key Styling Patterns

#### Theme System (`/gui/src/styles/theme.ts`)
- **CSS Variables**: Maps VS Code theme variables to fallback colors
- **Color Scheme**: Dark/light mode support with automatic detection
- **Key Colors**:
  - Background: `--vscode-editor-background` (fallback: #1e1e1e)
  - Foreground: `--vscode-editor-foreground` (fallback: #e6e6e6)
  - Primary: `--vscode-button-background` (fallback: #2c5aa0)
  - Borders: `--vscode-input-border` (fallback: #555555)

#### Styled Components (`/gui/src/components/index.ts`)
- **Common Patterns**:
  ```typescript
  - defaultBorderRadius = "5px"
  - Custom scrollbar styling (4px width, thin)
  - Button variants: Primary, Secondary, Ghost
  - Input styling with focus states
  ```

#### Typography
- **Fonts**: System fonts with VS Code font-family fallbacks
- **Code**: Monospace fonts from VS Code editor settings
- **Sizes**: Dynamic sizing using `getFontSize()` utility

### Critical UI Interactions

#### Animations & Transitions
- **Button Hover**: `filter: brightness(1.2)` for primary buttons
- **Focus States**: Border color changes using `--vscode-focusBorder`
- **Loading States**: 
  - AnimatedEllipsis with keyframe animation
  - RingLoader for async operations
  - ThinkingIndicator with pulsing effect

#### Hover States
- **List Items**: Background color change to `--vscode-list-hoverBackground`
- **Buttons**: Brightness filters and background color transitions
- **Code Blocks**: Copy button appears on hover with visibility transition

#### Special Effects
- **Drag & Drop**: DragOverlay component for file drops
- **Tooltips**: Custom tooltip portal using Tippy.js
- **Context Menus**: OSRContextMenu for right-click actions

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

### Testing Each Component
When porting each component, verify:

1. **Static Appearance**: Looks identical at rest
2. **Hover States**: All hover effects work
3. **Active States**: Click/focus states correct
4. **Animations**: Transitions are smooth
5. **Responsive**: Handles different sizes
6. **Theme**: Works in all VS Code themes
7. **Accessibility**: Keyboard navigation works

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

## Red Flags (Visual Differences to Avoid)

❌ Hard-coded colors instead of CSS variables
❌ Missing hover states or transitions
❌ Different padding or margins
❌ Wrong border radius
❌ Missing animations
❌ Incorrect font weights
❌ Different scrollbar styling
❌ Missing focus management

## Next Steps
1. Start with base utility components
2. Move to content display (markdown, code blocks)
3. Implement input components (TipTap)
4. Add selection UI (models, settings)
5. Complete with layout and routing

## Files Already Prepared
- ✅ All CSS files copied (markdown.css, TipTapEditor.css, katex.css)
- ✅ Theme system (theme.ts with VS Code variables)
- ✅ Styled components (styled.ts with all GUI components)
- ✅ Global styles (global.css with fonts and base styles)
- ✅ Webpack configured for React
- ✅ Redux store ready for integration
- ✅ IdeMessenger protocol implemented