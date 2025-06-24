# Webview Testing Guide

## Running the Standalone Preview

To test the webview components in a browser:

```bash
npm run serve
```

This will start a webpack dev server at http://localhost:9000 with:
- Hot reload
- VS Code theme simulation (dark/light toggle)
- Mock VS Code API

## What You Can Test

### ✅ Currently Implemented:
1. **Theme System** - Toggle between dark/light themes
2. **Button Components** - All three variants with hover states
3. **AnimatedEllipsis** - Loading animation
4. **StyledMarkdownPreview** - Rich markdown with syntax highlighting
5. **StepContainer** - Message display with user/assistant styling
6. **ResponseActions** - Copy, delete, continue buttons

### 🎨 Visual Features to Check:
- VS Code theme colors
- Hover states on buttons and actions
- Code block styling with copy button
- Markdown rendering
- Message container padding
- Action button transitions

### 🔄 Interactive Features:
- Theme toggle button (top right)
- Copy code button on hover
- Delete/continue action buttons
- Button hover effects

## Development Workflow

1. Start the dev server: `npm run serve`
2. Make changes to components
3. See live updates in browser
4. Test theme compatibility with toggle
5. Check console for any errors

## Browser Compatibility

Tested in:
- Chrome/Edge (recommended)
- Firefox
- Safari

The webview simulates VS Code's environment including:
- CSS variables
- Font settings
- Color schemes
- Scrollbar styling