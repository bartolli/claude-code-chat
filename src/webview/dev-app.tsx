import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../state/store';
import { App } from './App';
import { IIdeMessenger } from '../protocol/IdeMessenger';
import './styles/global.css';

// Mock messenger for development
class MockMessenger implements IIdeMessenger {
    private handlers: Map<string, Function[]> = new Map();

    post(type: string, message?: any): void {
        console.log('Mock messenger post:', type, message);
    }

    on(type: string, handler: Function): void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type)!.push(handler);
    }

    off(type: string, handler: Function): void {
        const handlers = this.handlers.get(type);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    sendMessage(text: string): void {
        console.log('Mock sendMessage:', text);
    }

    interrupt(): void {
        console.log('Mock interrupt');
    }

    continue(): void {
        console.log('Mock continue');
    }

    newSession(): void {
        console.log('Mock newSession');
    }

    cancelGeneration(): void {
        console.log('Mock cancelGeneration');
    }

    retryGeneration(): void {
        console.log('Mock retryGeneration');
    }

    updateSettings(settings: any): void {
        console.log('Mock updateSettings:', settings);
    }
}

const mockMessenger = new MockMessenger();

// Initialize Redux store with some test data
store.dispatch({ 
    type: 'session/updateTokenUsage', 
    payload: { 
        sessionId: 'test', 
        inputTokens: 1234, 
        outputTokens: 5678,
        cost: 156 // $1.56 in cents
    } 
});

store.dispatch({
    type: 'claude/setProcessing',
    payload: false
});

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App messenger={mockMessenger} />
        </Provider>
    </React.StrictMode>
);