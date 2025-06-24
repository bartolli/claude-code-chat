/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/webview/**/*.{js,jsx,ts,tsx}",
    "./gui/src/**/*.{js,jsx,ts,tsx}" // Include GUI components
  ],
  theme: {
    extend: {
      colors: {
        // VS Code theme colors will be used via CSS variables
        'vscode': {
          'background': 'var(--vscode-editor-background)',
          'foreground': 'var(--vscode-editor-foreground)',
          'border': 'var(--vscode-panel-border)',
          'primary': 'var(--vscode-button-background)',
          'primary-hover': 'var(--vscode-button-hoverBackground)',
          'secondary': 'var(--vscode-button-secondaryBackground)',
          'secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'default': '5px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}