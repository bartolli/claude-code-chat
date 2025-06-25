import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { vscForeground, vscEditorBackground } from '../styled';

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const ThinkingContainer = styled.div`
  margin: 8px 0;
  border-left: 4px solid var(--vscode-editorInfo-foreground);
  background-color: ${vscEditorBackground};
  border-radius: 4px;
  overflow: hidden;
`;

const ThinkingHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  svg {
    width: 16px;
    height: 16px;
    margin-right: 8px;
    transition: transform 0.3s ease;
    transform: ${props => props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  }
`;

const ThinkingText = styled.span`
  color: ${vscForeground};
  font-size: 13px;
`;

const AnimatedDots = styled.span`
  &::after {
    content: '...';
    animation: ${pulse} 1.5s infinite;
  }
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

interface ThinkingIndicatorProps {
  content?: string;
  isActive?: boolean;
  duration?: number;
  defaultExpanded?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  content,
  isActive = false,
  duration,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const handleToggle = () => {
    if (content) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const headerText = isActive 
    ? <><ThinkingText>Thinking</ThinkingText><AnimatedDots /></>
    : duration 
      ? <ThinkingText>Thought for {duration}s</ThinkingText>
      : <ThinkingText>Thinking complete</ThinkingText>;
  
  return (
    <ThinkingContainer>
      <ThinkingHeader onClick={handleToggle} isExpanded={isExpanded}>
        <ChevronRightIcon />
        {headerText}
      </ThinkingHeader>
      {isExpanded && content && (
        <ThinkingContent>
          {content}
        </ThinkingContent>
      )}
    </ThinkingContainer>
  );
};