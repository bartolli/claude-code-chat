import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { IIdeMessenger } from '../../protocol/IdeMessenger';
import { varWithFallback } from '../styles/theme';
import { StepContainer } from './StepContainer';
import { ContinueInputBox, ContinueInputBoxHandle } from './ContinueInputBox';
import { ChatHeader } from './ChatHeader';
import { ModelOption } from './ModelSelector';
import { EmptyChatBody } from './EmptyChatBody';
import { PermissionPrompt } from './PermissionPrompt';
import { ThinkingIndicator } from './ThinkingIndicator';
import { PlanApproval } from './PlanApproval';
import { selectCurrentSession } from '../../state/slices/sessionSlice';
import { selectIsProcessing } from '../../state/slices/claudeSlice';
import { selectAvailableModels, selectSelectedModelId, setSelectedModel } from '../../state/slices/configSlice';
import { clearPermissionRequest } from '../../state/slices/uiSlice';
import { RootState } from '../../state/store';

const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
`;

const StepsDiv = styled.div`
    position: relative;
    background-color: transparent;
    flex: 1;
    overflow-y: auto;
    padding-top: 8px;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column-reverse;
    
    & > * {
        position: relative;
    }
    
    .thread-message {
        margin: 0 0 0 1px;
    }
`;

const InputArea = styled.div`
    position: sticky;
    bottom: 0;
    padding: 0px;
    z-index: 10;
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
    const inputRef = useRef<ContinueInputBoxHandle>(null);
    const [planMode, setPlanMode] = useState(false);
    const [planProposal, setPlanProposal] = useState<{ toolId?: string; plan: string | any; messageId?: string; isMarkdown?: boolean } | null>(null);
    
    // Debug logging - commented out to prevent console spam
    // console.log('Chat component rendering', { currentSession, isProcessing, availableModels, selectedModelId });
    
    // Map models from config to ModelOption format
    const models: ModelOption[] = availableModels.map(model => ({
        id: model.id,
        name: model.name,
        hasApiKey: true,
        description: model.description
    }));
    
    // Get messages from session (no demo messages)
    const messages = currentSession?.messages || [];
    
    // No longer need separate waiting indicator - handled by ThinkingIndicator in StepContainer
    const showWaitingIndicator = false;
    
    // Auto scroll to bottom when new messages arrive or waiting indicator appears
    useEffect(() => {
        if (stepsDivRef.current) {
            // For column-reverse, scrollTop 0 is the bottom
            stepsDivRef.current.scrollTop = 0;
        }
    }, [messages, showWaitingIndicator]);
    
    // Listen for planMode toggle from extension
    useEffect(() => {
        const unsubscribe = messenger.on('planMode/toggle', (newPlanMode: boolean) => {
            console.log('Plan mode toggled from extension:', newPlanMode);
            setPlanMode(newPlanMode);
        });
        
        return () => {
            unsubscribe();
        };
    }, [messenger]);
    
    // Listen for plan proposals
    useEffect(() => {
        const unsubscribe = messenger.on('message/planProposal', (data: { toolId?: string; plan: string | any; messageId?: string; isMarkdown?: boolean }) => {
            console.log('Plan proposal received:', data);
            setPlanProposal(data);
        });
        
        return () => {
            unsubscribe();
        };
    }, [messenger]);

    const handleSubmit = useCallback((message: string) => {
        console.log('Message submitted:', message, { planMode });
        
        // Send all messages (including slash commands) to Claude
        messenger.post('chat/sendMessage', {
            text: message,
            planMode: planMode,
            thinkingMode: false
        });
        
        // Don't dispatch here - the backend will send the user message back
    }, [messenger, planMode]);
    
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
    
    const handlePlanApprove = useCallback(() => {
        if (planProposal) {
            console.log('Plan approved:', planProposal.toolId);
            messenger.post('plan/approve', { toolId: planProposal.toolId });
            setPlanProposal(null); // Clear the proposal
        }
    }, [messenger, planProposal]);
    
    const handlePlanRefine = useCallback(() => {
        if (planProposal) {
            console.log('Plan refinement requested:', planProposal.toolId);
            messenger.post('plan/refine', { toolId: planProposal.toolId });
            setPlanProposal(null); // Clear the proposal
            // Focus the input after refining
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [messenger, planProposal]);
    
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {messages.length === 0 ? (
                        <EmptyChatBody showOnboardingCard={false} />
                    ) : (
                        <>
                            {messages
                                .map((msg, originalIndex) => {
                                    // Skip empty assistant messages without thinking or tools
                                    if (msg.role === 'assistant' && !msg.content.trim() && !msg.toolUses?.length && !msg.thinking && !msg.isThinkingActive) {
                                        return null;
                                    }
                                    
                                    // Determine if this is the last user message and we're streaming
                                    const isLastUserMessage = msg.role === 'user' && 
                                        messages.slice(originalIndex + 1).every(m => m.role !== 'user');
                                    
                                    // Show gradient on last user message when:
                                    // 1. We're processing (starts immediately on submit)
                                    // 2. There's no assistant message yet OR
                                    // 3. The assistant message exists but has no real content/thinking yet
                                    const nextMessage = messages[originalIndex + 1];
                                    const shouldShowGradient = isProcessing && isLastUserMessage && (
                                        !nextMessage || // No assistant message yet
                                        (nextMessage.role === 'assistant' && 
                                         !nextMessage.content && 
                                         !nextMessage.thinking) // Assistant message exists but no actual content/thinking
                                    );
                                
                                return (
                                    <MessageContainer key={originalIndex}>
                                        <StepContainer
                                            content={msg.content}
                                            role={msg.role}
                                            index={originalIndex}
                                            isLast={originalIndex === messages.length - 1}
                                            isStreaming={shouldShowGradient}
                                            onDelete={() => console.log('Delete message', originalIndex)}
                                            onContinue={() => console.log('Continue generation')}
                                            thinking={msg.thinking}
                                            thinkingDuration={msg.thinkingDuration}
                                            isThinkingActive={msg.isThinkingActive}
                                            currentThinkingLine={msg.currentThinkingLine}
                                            tokenUsage={msg.tokenUsage}
                                            toolUses={msg.toolUses}
                                        />
                                    </MessageContainer>
                                );
                            }).filter(Boolean)}
                            
                            {/* Removed standalone waiting indicator - now handled within messages */}
                            
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
                            
                            {/* Show plan proposal if there's one */}
                            {planProposal && (
                                <MessageContainer>
                                    <PlanApproval
                                        toolId={planProposal.toolId}
                                        plan={planProposal.plan}
                                        isMarkdown={planProposal.isMarkdown}
                                        onApprove={handlePlanApprove}
                                        onRefine={handlePlanRefine}
                                    />
                                </MessageContainer>
                            )}
                        </>
                    )}
                </div>
            </StepsDiv>
            <InputArea>
                <ContinueInputBox
                    ref={inputRef}
                    onSubmit={handleSubmit}
                    onStop={() => {
                        console.log('Stop button clicked');
                        messenger.post('chat/stopRequest', undefined);
                    }}
                    placeholder="Ask Claude anything..."
                    disabled={isProcessing}
                    isProcessing={isProcessing}
                    messenger={messenger}
                    isStreaming={showWaitingIndicator}
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={handleModelChange}
                    planMode={planMode}
                    onPlanModeChange={setPlanMode}
                />
            </InputArea>
        </ChatContainer>
    );
};