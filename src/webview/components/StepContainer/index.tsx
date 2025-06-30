import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { vscBackground } from '../styled';
import { getFontSize } from '../../util';
import { StyledMarkdownPreview } from '../StyledMarkdownPreview';
import { ResponseActions } from './ResponseActions';
import { ThinkingIndicator } from '../ThinkingIndicator';
import { ToolUseDisplay } from '../ToolUseDisplay';
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
    font-style: italic;
    padding: 8px 12px;
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
    toolUses
}) => {
    console.log(`[StepContainer] Rendering message ${index}:`, { role, content: content?.substring(0, 50), contentLength: content?.length });
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
                        {/* Show thinking if available */}
                        {thinking && (
                            <ThinkingIndicator 
                                content={thinking}
                                isExpanded={true}
                            />
                        )}
                        
                        {/* Show tool uses if available */}
                        {toolUses && toolUses.map((tool, toolIndex) => (
                            <ToolUseDisplay
                                key={tool.toolId}
                                toolName={tool.toolName}
                                input={tool.input}
                                result={tool.result}
                                status={tool.result ? 'complete' : 'calling'}
                                isError={tool.isError}
                                defaultExpanded={false}
                            />
                        ))}
                        
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