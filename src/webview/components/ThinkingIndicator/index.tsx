import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronRightIcon, LightBulbIcon, CogIcon } from '@heroicons/react/24/outline';
import { vscForeground, vscEditorBackground } from '../styled';
import { useTruncatedText } from '../../hooks/useTextTruncation';

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const ThinkingContainer = styled.div`
  margin: 8px 0;
  background-color: ${vscEditorBackground};
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  overflow: hidden;
  width: 100%; /* Establish width context */
`;

const ThinkingHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  width: 100%; /* Establish width context */
  min-width: 0; /* Allow flex children to shrink */
  overflow: hidden;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  svg:first-child {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    flex-shrink: 0;
    transition: transform 0.3s ease;
    transform: ${props => props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  }
  
  svg:nth-child(2) {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    flex-shrink: 0;
    color: var(--vscode-editorInfo-foreground);
  }
`;

const ThinkingText = styled.span`
  color: ${vscForeground};
  font-size: 13px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const AnimatedDots = styled.span`
  flex-shrink: 0;
  &::after {
    content: '...';
    animation: ${pulse} 1.5s infinite;
  }
`;

const HeaderTextContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const ThinkingContent = styled.div`
  padding: 12px 16px;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  font-family: var(--vscode-editor-font-family);
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid var(--vscode-widget-border);
`;

const PreviewContainer = styled.div`
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  font-size: 12px;
  margin-left: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const HiddenMeasure = styled.span`
  position: absolute;
  visibility: hidden;
  white-space: nowrap;
  font-size: 12px;
`;

interface ThinkingIndicatorProps {
  content?: string;
  currentLine?: string;
  isActive?: boolean;
  duration?: number;
  defaultExpanded?: boolean;
  tokenCount?: number;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  content,
  currentLine,
  isActive = false,
  duration,
  defaultExpanded = false,
  tokenCount
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Use currentLine if available when active, otherwise use first line of content
  const displayLine = isActive && currentLine ? currentLine : (content ? content.split('\n')[0].trim() : '');
  const shouldShowPreview = !isExpanded && displayLine;
  
  const { truncatedText, containerRef, measureRef } = useTruncatedText({
    text: displayLine,
    maxWidth: undefined // Will use container width
  });
  
  console.log('[ThinkingIndicator] Rendering:', {
    content: content?.substring(0, 50),
    contentLength: content?.length,
    currentLine: currentLine?.substring(0, 50),
    isActive,
    duration,
    tokenCount,
    defaultExpanded,
    isExpanded
  });
  
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  const durationText = duration ? `${duration.toFixed(1)}s` : '';
  const tokenText = tokenCount ? `${tokenCount} tokens` : '';
  
  const summaryParts = [durationText, tokenText].filter(Boolean).join(', ');
  
  console.log('[ThinkingIndicator] Summary calculation:', {
    duration,
    durationText,
    tokenCount,
    tokenText,
    summaryParts,
    isActive
  });
  
  const headerText = isActive 
    ? content 
      ? <><ThinkingText>Thinking</ThinkingText><AnimatedDots /></>
      : <><ThinkingText>Claude is working</ThinkingText><AnimatedDots /></>
    : summaryParts
      ? <ThinkingText>Thought for {summaryParts}</ThinkingText>
      : content
        ? <ThinkingText>Thinking complete</ThinkingText>
        : <><ThinkingText>Claude is working</ThinkingText><AnimatedDots /></>;
  
  // Use different icon based on state
  const IconComponent = content ? LightBulbIcon : CogIcon;
  
  return (
    <ThinkingContainer>
      <ThinkingHeader onClick={handleToggle} isExpanded={isExpanded}>
        <ChevronRightIcon />
        <IconComponent />
        <HeaderTextContainer>
          {headerText}
        </HeaderTextContainer>
        {shouldShowPreview && (
          <PreviewContainer ref={containerRef} title={displayLine}>
            <HiddenMeasure ref={measureRef}>{displayLine}</HiddenMeasure>
            {truncatedText}
          </PreviewContainer>
        )}
      </ThinkingHeader>
      {isExpanded && content ? (
        <ThinkingContent>
          {content}
        </ThinkingContent>
      ) : isExpanded && isActive && !content ? (
        <ThinkingContent>
          <AnimatedDots />
        </ThinkingContent>
      ) : null}
    </ThinkingContainer>
  );
};