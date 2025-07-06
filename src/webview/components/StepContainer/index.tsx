import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { vscBackground } from '../styled';
import { getFontSize } from '../../util';
import { StyledMarkdownPreview } from '../StyledMarkdownPreview';
import { ResponseActions } from './ResponseActions';
import { ThinkingIndicator } from '../ThinkingIndicator';
import { ThinkingStateMachine } from '../ThinkingIndicator/ThinkingStateMachine';
import { InlineToolDisplay } from '../InlineToolDisplay';
import { GradientBorder } from './GradientBorder';

interface StepContainerProps {
    content: string;
    role: 'user' | 'assistant';
    isLast?: boolean;
    isStreaming?: boolean;
    index: number;
    onDelete?: () => void;
    onContinue?: () => void;
    thinking?: string;
    thinkingDuration?: number;
    isThinkingActive?: boolean;
    currentThinkingLine?: string;
    tokenUsage?: {
        input: number;
        output: number;
        cache: number;
        thinking: number;
    };
    toolUses?: Array<{
        toolName: string;
        toolId: string;
        input: any;
        result?: string;
        isError?: boolean;
    }>;
}

// Exact styling from GUI
const ContentDiv = styled.div<{ fontSize?: number }>`
    padding: 4px;
    padding-left: 6px;
    padding-right: 6px;
    background-color: ${vscBackground};
    font-size: ${(props) => props.fontSize || getFontSize()}px;
    overflow: hidden;
`;

const UserMessageDiv = styled.div`
    color: var(--vscode-descriptionForeground);
    padding: 8px 12px;
    font-weight: 400;
    background-color: var(--vscode-editor-background);
    border-radius: 5px;
`;

export const StepContainer: React.FC<StepContainerProps> = ({
    content,
    role,
    isLast = false,
    isStreaming = false,
    index,
    onDelete,
    onContinue,
    thinking,
    thinkingDuration,
    isThinkingActive,
    currentThinkingLine,
    tokenUsage,
    toolUses
}) => {
    console.log(`[StepContainer] Rendering message ${index}:`, { 
        role, 
        content: content?.substring(0, 50), 
        contentLength: content?.length,
        thinking: thinking?.substring(0, 50),
        thinkingLength: thinking?.length,
        isThinkingActive,
        thinkingDuration,
        thinkingTokens: tokenUsage?.thinking
    });
    
    // Don't render empty assistant messages
    if (role === 'assistant' && !content?.trim() && !toolUses?.length && !thinking && !isThinkingActive) {
        console.log(`[StepContainer] Skipping empty assistant message ${index}`);
        return null;
    }
    
    const [isTruncated, setIsTruncated] = useState(false);

    // Check if message appears truncated
    useEffect(() => {
        if (!isStreaming && role === 'assistant') {
            const trimmedContent = content.trim();
            const endingPunctuation = ['.', '?', '!', '```', ':'];
            
            if (
                trimmedContent !== '' &&
                !(
                    endingPunctuation.some(p => trimmedContent.endsWith(p)) ||
                    /\p{Emoji}/u.test(trimmedContent.slice(-2))
                )
            ) {
                setIsTruncated(true);
            } else {
                setIsTruncated(false);
            }
        }
    }, [content, isStreaming, role]);

    // Don't show actions for user messages or while streaming
    const showActions = role === 'assistant' && !isStreaming;

    return (
        <div>
            <ContentDiv fontSize={getFontSize()}>
                {role === 'user' ? (
                    <GradientBorder isStreaming={isStreaming}>
                        <UserMessageDiv>{content}</UserMessageDiv>
                    </GradientBorder>
                ) : (
                    <>
                        {/* Show thinking if available or in progress */}
                        {(thinking || isThinkingActive) && (
                            <ThinkingIndicator 
                                content={thinking}
                                currentLine={currentThinkingLine}
                                defaultExpanded={true}
                                duration={thinkingDuration}
                                isActive={isThinkingActive}
                                tokenCount={tokenUsage?.thinking}
                                responsePreview={!isThinkingActive && content ? content.split('\n')[0].trim() : undefined}
                            />
                        )}
                        
                        {/* Show tool uses first if no content yet */}
                        {toolUses && toolUses.length > 0 && !content && (
                            <>
                                {/* Filter out exit_plan_mode as it's handled separately in Chat component */}
                                {(() => {
                                    const otherTools = toolUses.filter(t => t.toolName !== 'exit_plan_mode');
                                    return otherTools.length > 0 ? <InlineToolDisplay toolUses={otherTools} /> : null;
                                })()}
                            </>
                        )}
                        
                        {/* Show assistant content/reasoning */}
                        <StyledMarkdownPreview
                            source={content}
                            isRenderingInStepContainer
                            itemIndex={index}
                        />
                        
                        {/* Show tool uses after content if content exists */}
                        {toolUses && toolUses.length > 0 && content && (
                            <>
                                {/* Filter out exit_plan_mode as it's handled separately in Chat component */}
                                {(() => {
                                    const otherTools = toolUses.filter(t => t.toolName !== 'exit_plan_mode');
                                    return otherTools.length > 0 ? <InlineToolDisplay toolUses={otherTools} /> : null;
                                })()}
                            </>
                        )}
                    </>
                )}
            </ContentDiv>
            
            {/* Action space to prevent layout shift */}
            {role === 'assistant' && (
                <div className={`mt-2 h-7 transition-opacity duration-300 ease-in-out ${!showActions ? 'opacity-0' : ''}`}>
                    {showActions && (
                        <ResponseActions
                            isTruncated={isTruncated}
                            onDelete={onDelete}
                            onContinue={onContinue}
                            messageContent={content}
                        />
                    )}
                </div>
            )}
        </div>
    );
};