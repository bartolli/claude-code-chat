# Visual Parity Checklist

## Component-by-Component Visual Requirements

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

## Testing Each Component

When porting each component, verify:

1. **Static Appearance**: Looks identical at rest
2. **Hover States**: All hover effects work
3. **Active States**: Click/focus states correct
4. **Animations**: Transitions are smooth
5. **Responsive**: Handles different sizes
6. **Theme**: Works in all VS Code themes
7. **Accessibility**: Keyboard navigation works

## Red Flags (Visual Differences to Avoid)

❌ Hard-coded colors instead of CSS variables
❌ Missing hover states or transitions
❌ Different padding or margins
❌ Wrong border radius
❌ Missing animations
❌ Incorrect font weights
❌ Different scrollbar styling
❌ Missing focus management