import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { IIdeMessenger } from '../../protocol/IdeMessenger';
import { varWithFallback } from '../styles/theme';
import { StepContainer } from './StepContainer';
import { ContinueInputBox } from './ContinueInputBox';
import { ChatHeader } from './ChatHeader';
import { ModelOption } from './ModelSelector';
import { EmptyChatBody } from './EmptyChatBody';
import { selectCurrentSession } from '../../state/slices/sessionSlice';
import { selectIsProcessing } from '../../state/slices/claudeSlice';
import { selectAvailableModels, selectSelectedModelId, setSelectedModel } from '../../state/slices/configSlice';

const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
`;

const StepsDiv = styled.div`
    position: relative;
    background-color: transparent;
    flex: 1;
    overflow-y: auto;
    padding-top: 8px;
    
    & > * {
        position: relative;
    }
    
    .thread-message {
        margin: 0 0 0 1px;
    }
`;

const InputArea = styled.div`
    position: relative;
    padding: 16px;
    padding-top: 0;
`;

const MessageContainer = styled.div`
    padding: 0 16px;
`;

interface ChatProps {
    messenger: IIdeMessenger;
}

export const Chat: React.FC<ChatProps> = ({ messenger }) => {
    const dispatch = useDispatch();
    const currentSession = useSelector(selectCurrentSession);
    const isProcessing = useSelector(selectIsProcessing);
    const availableModels = useSelector(selectAvailableModels);
    const selectedModelId = useSelector(selectSelectedModelId);
    const stepsDivRef = useRef<HTMLDivElement>(null);
    
    // Debug logging
    console.log('Chat component rendering', { currentSession, isProcessing, availableModels, selectedModelId });
    
    // Map models from config to ModelOption format
    const models: ModelOption[] = availableModels.map(model => ({
        id: model.id,
        name: model.name,
        hasApiKey: true,
        description: model.description
    }));
    
    // Get messages from session (no demo messages)
    const messages = currentSession?.messages || [];
    
    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        if (stepsDivRef.current) {
            stepsDivRef.current.scrollTop = stepsDivRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = useCallback((message: string) => {
        console.log('Message submitted:', message);
        // Send message using the protocol
        messenger.post('chat/sendMessage', {
            text: message,
            planMode: false,
            thinkingMode: false
        });
        
        // Update local state to show user message immediately
        dispatch({
            type: 'session/messageAdded',
            payload: {
                role: 'user' as const,
                content: message
            }
        });
    }, [messenger, dispatch]);
    
    const handleNewChat = useCallback(() => {
        console.log('New chat');
        messenger.post('chat/newSession', undefined);
    }, [messenger]);
    
    const handleModelChange = useCallback((modelId: string) => {
        console.log('Model changed:', modelId);
        dispatch(setSelectedModel(modelId as any));
        // Also notify extension
        messenger.post('settings/selectModel', { modelId });
    }, [messenger, dispatch]);
    
    return (
        <ChatContainer>
            <ChatHeader
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={handleModelChange}
                onNewChat={handleNewChat}
                onAddModel={() => console.log('Add model')}
            />
            <StepsDiv ref={stepsDivRef} className="thin-scrollbar">
                {messages.length === 0 ? (
                    <EmptyChatBody showOnboardingCard={false} />
                ) : (
                    messages.map((msg, index) => (
                        <MessageContainer key={index}>
                            <StepContainer
                                content={msg.content}
                                role={msg.role}
                                index={index}
                                isLast={index === messages.length - 1}
                                onDelete={() => console.log('Delete message', index)}
                                onContinue={() => console.log('Continue generation')}
                            />
                        </MessageContainer>
                    ))
                )}
                
            </StepsDiv>
            <InputArea>
                <ContinueInputBox
                    onSubmit={handleSubmit}
                    placeholder="Ask Claude anything..."
                    disabled={isProcessing}
                />
            </InputArea>
        </ChatContainer>
    );
};