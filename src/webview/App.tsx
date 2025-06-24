import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { IIdeMessenger } from '../protocol/IdeMessenger';
import { initializeTheme } from './styles/theme';
import { LayoutTopDiv, GridDiv } from './components/styled';
import { Chat } from './components/Chat';
import { Footer } from './components/Footer';
import { DialogProvider } from './components/DialogProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

interface AppProps {
    messenger: IIdeMessenger;
}

export const App: React.FC<AppProps> = ({ messenger }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Initialize theme
        initializeTheme();

        // Set up message handlers
        const unsubscribers: (() => void)[] = [];

        unsubscribers.push(
            messenger.on('status/ready', (message) => {
                console.log('Extension ready:', message);
                dispatch({ type: 'ui/setReady', payload: true });
            })
        );

        unsubscribers.push(
            messenger.on('content/output', (content) => {
                // Handle Claude's output - append to current message
                dispatch({
                    type: 'session/messageAppended',
                    payload: {
                        role: 'assistant',
                        content: content
                    }
                });
            })
        );

        unsubscribers.push(
            messenger.on('tokens/update', (tokens) => {
                // Handle token updates
                dispatch({
                    type: 'session/tokensUpdated',
                    payload: tokens
                });
            })
        );
        
        unsubscribers.push(
            messenger.on('session/resumed', (data) => {
                dispatch({
                    type: 'session/resumed',
                    payload: data
                });
            })
        );
        
        unsubscribers.push(
            messenger.on('session/cleared', () => {
                dispatch({ type: 'session/cleared' });
            })
        );
        
        unsubscribers.push(
            messenger.on('status/processing', (isProcessing) => {
                dispatch({
                    type: 'ui/setProcessing',
                    payload: isProcessing
                });
            })
        );
        
        unsubscribers.push(
            messenger.on('settings/modelSelected', (model) => {
                dispatch({
                    type: 'session/modelSelected',
                    payload: model
                });
            })
        );
        
        unsubscribers.push(
            messenger.on('stream/claude', (message) => {
                // Handle Claude stream messages
                dispatch({
                    type: 'stream/messageReceived',
                    payload: message
                });
            })
        );

        unsubscribers.push(
            messenger.on('config/init', (config) => {
                // Handle initial configuration
                console.log('Received config:', config);
                dispatch({
                    type: 'config/initializeConfig',
                    payload: config
                });
            })
        );

        unsubscribers.push(
            messenger.on('message/add', (message) => {
                console.log('[App.tsx] Received message/add:', message);
                // Handle new message
                dispatch({
                    type: 'session/messageAdded',
                    payload: message
                });
            })
        );

        unsubscribers.push(
            messenger.on('message/update', (message) => {
                // Handle message update
                dispatch({
                    type: 'session/messageUpdated',
                    payload: message
                });
            })
        );

        unsubscribers.push(
            messenger.on('chat/messageComplete', () => {
                // Handle message completion
                dispatch({
                    type: 'session/messageCompleted'
                });
            })
        );

        unsubscribers.push(
            messenger.on('error/show', (error) => {
                // Handle error display
                dispatch({
                    type: 'ui/showError',
                    payload: error.message
                });
            })
        );

        // Request initial data
        messenger.post('settings/get', undefined);
        messenger.post('conversation/getList', undefined);

        // Cleanup function to unsubscribe all handlers
        return () => {
            console.log('[App.tsx] Cleaning up message handlers');
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }, [messenger, dispatch]);

    return (
        <ErrorBoundary>
            <DialogProvider>
                <LayoutTopDiv>
                    <GridDiv>
                        <Chat messenger={messenger} />
                        <Footer />
                    </GridDiv>
                </LayoutTopDiv>
            </DialogProvider>
        </ErrorBoundary>
    );
};