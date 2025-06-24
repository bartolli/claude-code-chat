import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../state/store';
import { IdeMessenger } from '../protocol/IdeMessenger';
import { App } from './App';
import './styles/global.css';
import './styles/components/markdown.css';
import './styles/components/TipTapEditor.css';
// TODO: Add KaTeX fonts before enabling
// import './styles/components/katex.css';

// Acquire VS Code API once
const vscode = (window as any).acquireVsCodeApi?.();

// Initialize IdeMessenger with VS Code API
const messenger = new IdeMessenger(vscode);

// Make messenger available globally for debugging
if (process.env.NODE_ENV === 'development') {
    (window as any).messenger = messenger;
}

// Get the root element
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');
}

// Create React root
const root = ReactDOM.createRoot(container);

// Render the app
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App messenger={messenger} />
        </Provider>
    </React.StrictMode>
);

// Handle VS Code state
if (vscode) {
    // Restore state if available
    const previousState = vscode.getState();
    if (previousState) {
        console.log('Restoring previous state:', previousState);
        // Dispatch actions to restore state
    }

    // Listen for theme changes
    const observer = new MutationObserver(() => {
        const theme = document.body.className;
        console.log('Theme changed:', theme);
    });
    
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}