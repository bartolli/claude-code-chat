import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

console.log('Test webview starting...');

try {
    console.log('React available:', !!React);
    console.log('ReactDOM available:', !!ReactDOM);
    
    // Try to load Redux
    const Redux = require('@reduxjs/toolkit');
    console.log('Redux toolkit loaded:', !!Redux);
} catch (error) {
    console.error('Error loading modules:', error);
}

// Simple test component
const TestComponent = () => {
    return React.createElement('div', {
        style: { padding: '20px', textAlign: 'center' }
    }, [
        React.createElement('h1', { key: '1' }, 'Test Webview'),
        React.createElement('p', { key: '2' }, 'If you see this, React is working!'),
        React.createElement('p', { key: '3' }, 'Check the console for module loading info.')
    ]);
};

// Mount the test component
const rootElement = document.getElementById('root');
if (rootElement) {
    console.log('Root element found, mounting React...');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(TestComponent));
    console.log('React mounted successfully!');
} else {
    console.error('Root element not found!');
}