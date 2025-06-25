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
import { PermissionPrompt } from './PermissionPrompt';
import { WaitingIndicator } from './WaitingIndicator';
import { selectCurrentSession, addMessage, clearSession } from '../../state/slices/sessionSlice';
import { selectIsProcessing } from '../../state/slices/claudeSlice';
import { selectAvailableModels, selectSelectedModelId, setSelectedModel } from '../../state/slices/configSlice';
import { clearPermissionRequest } from '../../state/slices/uiSlice';
import { RootState } from '../../state/store';

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
    const permissionRequest = useSelector((state: RootState) => state.ui.permissionRequest);
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
    
    // Check if we should show waiting indicator
    // Show it when processing and either:
    // 1. Last message is from user (no assistant response yet)
    // 2. Last message is empty assistant with no content AND no tool uses
    const lastMessage = messages[messages.length - 1];
    const showWaitingIndicator = isProcessing && 
        messages.length > 0 && 
        (lastMessage?.role === 'user' || 
         (lastMessage?.role === 'assistant' && !lastMessage.content && !lastMessage.toolUses?.length));
    
    // Auto scroll to bottom when new messages arrive or waiting indicator appears
    useEffect(() => {
        if (stepsDivRef.current) {
            stepsDivRef.current.scrollTop = stepsDivRef.current.scrollHeight;
        }
    }, [messages, showWaitingIndicator]);

    const handleSubmit = useCallback((message: string) => {
        console.log('Message submitted:', message);
        
        // Check if this is a slash command
        if (message.startsWith('/')) {
            const commandParts = message.substring(1).trim().split(' ');
            const command = commandParts[0];
            const args = commandParts.slice(1).join(' ');
            
            // Handle slash commands internally
            switch (command) {
                case 'help':
                    // Add help message to chat
                    dispatch(addMessage({
                        role: 'assistant',
                        content: `Available commands:
• /help - Show this help message
• /clear - Clear the conversation
• /model - Change the AI model
• /cost - Show current session cost
• /status - Show current status
• /config - Open configuration
• /mcp - Manage MCP servers
• /ide - Manage IDE integrations
• /permissions - Manage permissions
• /memory - View memory usage
• /login - Login to Claude
• /logout - Logout from Claude
• /exit - Exit the session

For more commands, use the terminal with \`claude /help\`.`
                    }));
                    return;
                    
                case 'clear':
                    // Clear messages in current session
                    if (currentSession?.id) {
                        dispatch(clearSession(currentSession.id));
                        dispatch(addMessage({
                            role: 'assistant',
                            content: 'Conversation cleared.'
                        }));
                    }
                    return;
                    
                case 'cost':
                    // Show cost information
                    const cost = currentSession?.totalCost || 0;
                    const inputTokens = currentSession?.inputTokens || 0;
                    const outputTokens = currentSession?.outputTokens || 0;
                    dispatch(addMessage({
                        role: 'assistant',
                        content: `Session cost:
• Total cost: $${cost.toFixed(4)}
• Input tokens: ${inputTokens.toLocaleString()}
• Output tokens: ${outputTokens.toLocaleString()}`
                    }));
                    return;
                    
                case 'status':
                    // Show status
                    dispatch(addMessage({
                        role: 'assistant',
                        content: `Status:
• Session: ${currentSession?.id || 'No active session'}
• Model: ${selectedModelId || 'claude-3-5-sonnet-20241022'}
• Messages: ${messages.length}
• Working: ${showWaitingIndicator ? 'Yes' : 'No'}`
                    }));
                    return;
                    
                case 'model':
                    // If no args, show current model
                    if (!args) {
                        dispatch(addMessage({
                            role: 'assistant',
                            content: `Current model: ${selectedModelId || 'claude-3-5-sonnet-20241022'}
Available models:
• claude-3-5-sonnet-20241022
• claude-3-5-haiku-20241022
• claude-3-opus-20240229`
                        }));
                        return;
                    }
                    // Otherwise change model - fall through to send command
                    break;
                    
                default:
                    // For unhandled commands, show a message
                    dispatch(addMessage({
                        role: 'assistant',
                        content: `Command /${command} is not available in the webview. Try using the terminal with \`claude /${command}\`.`
                    }));
                    return;
            }
        }
        
        // Send regular message or unhandled slash commands
        messenger.post('chat/sendMessage', {
            text: message,
            planMode: false,
            thinkingMode: false
        });
        
        // Don't dispatch here - the backend will send the user message back
    }, [messenger, dispatch, currentSession, selectedModelId, messages.length, showWaitingIndicator]);
    
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
    
    const handlePermissionApprove = useCallback(() => {
        if (permissionRequest) {
            console.log('Permission approved for:', permissionRequest.toolName);
            messenger.post('permission/response', {
                toolId: permissionRequest.toolId,
                toolName: permissionRequest.toolName,
                approved: true
            });
            dispatch(clearPermissionRequest());
        }
    }, [messenger, dispatch, permissionRequest]);
    
    const handlePermissionDeny = useCallback(() => {
        if (permissionRequest) {
            console.log('Permission denied for:', permissionRequest.toolName);
            messenger.post('permission/response', {
                toolId: permissionRequest.toolId,
                toolName: permissionRequest.toolName,
                approved: false
            });
            dispatch(clearPermissionRequest());
        }
    }, [messenger, dispatch, permissionRequest]);
    
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
                                thinking={msg.thinking}
                                toolUses={msg.toolUses}
                            />
                        </MessageContainer>
                    ))
                )}
                
                {/* Show waiting indicator when Claude is processing */}
                {showWaitingIndicator && (
                    <WaitingIndicator />
                )}
                
                {/* Show permission prompt if there's a request */}
                {permissionRequest && (
                    <MessageContainer>
                        <PermissionPrompt
                            toolName={permissionRequest.toolName}
                            toolInput={permissionRequest.toolInput}
                            onApprove={handlePermissionApprove}
                            onDeny={handlePermissionDeny}
                        />
                    </MessageContainer>
                )}
            </StepsDiv>
            <InputArea>
                <ContinueInputBox
                    onSubmit={handleSubmit}
                    placeholder="Ask Claude anything..."
                    disabled={isProcessing}
                    messenger={messenger}
                />
            </InputArea>
        </ChatContainer>
    );
};