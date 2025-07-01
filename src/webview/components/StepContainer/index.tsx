import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { vscBackground } from '../styled';
import { getFontSize } from '../../util';
import { StyledMarkdownPreview } from '../StyledMarkdownPreview';
import { ResponseActions } from './ResponseActions';
import { ThinkingIndicator } from '../ThinkingIndicator';
import { ToolUseDisplay } from '../ToolUseDisplay';
import { ToolTreeView } from '../ToolTreeView';
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
                            />
                        )}
                        
                        {/* Show tool uses if available */}
                        {toolUses && toolUses.length > 0 && (
                            <ToolTreeView toolUses={toolUses} />
                        )}
                        
                        {/* Show content */}
                        <StyledMarkdownPreview
                            source={content}
                            isRenderingInStepContainer
                            itemIndex={index}
                        />
                        
                        {/* Show thinking indicator for streaming */}
                        {isLast && isStreaming && !thinking && <ThinkingIndicator />}
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