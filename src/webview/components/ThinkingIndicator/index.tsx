import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronRightIcon, LightBulbIcon, CogIcon } from '@heroicons/react/24/outline';
import { vscForeground, vscEditorBackground } from '../styled';
import { useTruncatedText } from '../../hooks/useTextTruncation';

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const fadeIn = keyframes`
  from { 
    opacity: 0;
    transform: translateY(-4px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
`;

const ThinkingContainer = styled.div`
  margin: 8px 0;
  background-color: ${vscEditorBackground};
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  overflow: hidden;
  width: 100%; /* Establish width context */
  animation: ${fadeIn} 0.3s ease-out;
  transition: all 0.3s ease;
`;

const ThinkingHeader = styled.div<{ isExpanded: boolean; isCollapsible: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: ${props => props.isCollapsible ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s;
  width: 100%; /* Establish width context */
  min-width: 0; /* Allow flex children to shrink */
  overflow: hidden;
  
  &:hover {
    background-color: ${props => props.isCollapsible ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
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
  transition: opacity 0.3s ease;
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

// Fun processing messages that rotate
const processingMessages = [
  'Pondering',
  'Diving deep',
  'Analyzing',
  'Contemplating',
  'Processing',
  'Exploring ideas',
  'Connecting dots',
  'Synthesizing',
  'Brainstorming',
  'Cogitating',
  'Musing',
  'Considering options',
  'Gathering thoughts',
  'Formulating response'
];

interface ThinkingIndicatorProps {
  content?: string;
  currentLine?: string;
  isActive?: boolean;
  duration?: number;
  defaultExpanded?: boolean;
  tokenCount?: number;
  responsePreview?: string; // First line of the actual response for completed state
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = React.memo(({
  content,
  currentLine,
  isActive = false,
  duration,
  defaultExpanded = false,
  tokenCount,
  responsePreview
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  
  // Rotate processing messages every 2.5 seconds
  useEffect(() => {
    if (isActive && !content) {
      const interval = setInterval(() => {
        setProcessingMessageIndex((prev) => (prev + 1) % processingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isActive, content]);
  
  // Determine display line based on state
  let displayLine = '';
  if (!isActive && responsePreview) {
    // Completed state: show first line of response
    displayLine = responsePreview;
  } else if (isActive && currentLine) {
    // Active thinking: show current thought line
    displayLine = currentLine;
  } else if (content) {
    // Fallback: show first line of thinking content
    displayLine = content.split('\n')[0].trim();
  }
  
  const shouldShowPreview = !isExpanded && displayLine;
  
  const { truncatedText, containerRef, measureRef } = useTruncatedText({
    text: displayLine,
    maxWidth: undefined // Will use container width
  });
  
  // Remove excessive logging to prevent console spam
  // Only log significant state changes
  useEffect(() => {
    if (isActive && content) {
      console.log('[ThinkingIndicator] Started thinking with content');
    } else if (!isActive && duration) {
      console.log(`[ThinkingIndicator] Completed thinking after ${duration.toFixed(1)}s`);
    }
  }, [isActive, content, duration]);
  
  // Don't allow toggle in processing state (when active without content)
  const isProcessingState = isActive && !content;
  const isCollapsible = !isProcessingState;
  
  const handleToggle = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const durationText = duration ? `${duration.toFixed(1)}s` : '';
  const tokenText = tokenCount ? `${tokenCount} tokens` : '';
  
  const summaryParts = [durationText, tokenText].filter(Boolean).join(', ');
  
  // Removed excessive logging
  
  const headerText = isActive 
    ? content 
      ? <><ThinkingText>Thinking</ThinkingText><AnimatedDots /></>
      : <><ThinkingText>{processingMessages[processingMessageIndex]}</ThinkingText><AnimatedDots /></>
    : summaryParts
      ? <ThinkingText>Thought for {summaryParts}</ThinkingText>
      : content
        ? <ThinkingText>Thinking complete</ThinkingText>
        : <><ThinkingText>{processingMessages[processingMessageIndex]}</ThinkingText><AnimatedDots /></>;
  
  // Use different icon based on state
  const IconComponent = content ? LightBulbIcon : CogIcon;
  
  return (
    <ThinkingContainer>
      <ThinkingHeader onClick={handleToggle} isExpanded={isExpanded} isCollapsible={isCollapsible}>
        {isCollapsible && <ChevronRightIcon />}
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
});

ThinkingIndicator.displayName = 'ThinkingIndicator';