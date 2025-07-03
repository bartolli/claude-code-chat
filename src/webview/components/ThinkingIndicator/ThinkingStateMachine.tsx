import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ChevronRightIcon, LightBulbIcon, CogIcon } from '@heroicons/react/24/outline';
import { vscForeground, vscEditorBackground } from '../styled';
import { useTruncatedText } from '../../hooks/useTextTruncation';

// Animation keyframes
import { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

// Styled components
const ThinkingContainer = styled.div`
  margin: 8px 0;
  background-color: ${vscEditorBackground};
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ThinkingHeader = styled.div<{ isExpanded: boolean; isCollapsible: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: ${props => props.isCollapsible ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s;
  width: 100%;
  min-width: 0;
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

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const ThinkingText = styled.span`
  color: ${vscForeground};
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.3s ease;
`;

const AnimatedDots = styled.span`
  &::after {
    content: '...';
    animation: ${pulse} 1.5s infinite;
  }
`;

const PreviewContainer = styled.div`
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  font-size: 12px;
  margin-left: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;
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
  animation: ${fadeIn} 0.3s ease-out;
`;

// Fun processing messages
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

type ThinkingState = 'processing' | 'thinking' | 'completed' | 'idle';

interface ThinkingStateMachineProps {
  content?: string;
  currentLine?: string;
  isActive?: boolean;
  duration?: number;
  defaultExpanded?: boolean;
  tokenCount?: number;
  responsePreview?: string;
}

export const ThinkingStateMachine: React.FC<ThinkingStateMachineProps> = ({
  content,
  currentLine,
  isActive = false,
  duration,
  defaultExpanded = false,
  tokenCount,
  responsePreview
}) => {
  // State management
  const [state, setState] = useState<ThinkingState>('idle');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [displayContent, setDisplayContent] = useState<{
    headerText: React.ReactNode;
    previewText?: string;
    icon: typeof LightBulbIcon | typeof CogIcon;
  }>({
    headerText: '',
    icon: CogIcon
  });
  
  // Animation refs
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const processingIntervalRef = useRef<NodeJS.Timeout>();
  
  // State machine logic
  useEffect(() => {
    const determineState = (): ThinkingState => {
      if (!isActive && !content && !duration) return 'idle';
      if (isActive && !content) return 'processing';
      if (isActive && content) return 'thinking';
      if (!isActive && (content || duration)) return 'completed';
      return 'idle';
    };
    
    const newState = determineState();
    
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Smooth transition with delay to prevent flashing
    if (state !== newState) {
      // Immediate transition for idle -> processing
      if (state === 'idle' && newState === 'processing') {
        setState(newState);
      } else {
        // Delayed transition for other states to prevent flickering
        transitionTimeoutRef.current = setTimeout(() => {
          setState(newState);
        }, 100);
      }
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [isActive, content, duration, state]);
  
  // Processing message rotation
  useEffect(() => {
    if (state === 'processing') {
      processingIntervalRef.current = setInterval(() => {
        setProcessingMessageIndex((prev) => (prev + 1) % processingMessages.length);
      }, 2500);
    } else {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    }
    
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, [state]);
  
  // Update display content based on state
  useEffect(() => {
    let headerText: React.ReactNode;
    let previewText: string | undefined;
    let icon: typeof LightBulbIcon | typeof CogIcon;
    
    switch (state) {
      case 'processing':
        headerText = (
          <>
            <ThinkingText>{processingMessages[processingMessageIndex]}</ThinkingText>
            <AnimatedDots />
          </>
        );
        icon = CogIcon;
        break;
        
      case 'thinking':
        headerText = (
          <>
            <ThinkingText>Thinking</ThinkingText>
            <AnimatedDots />
          </>
        );
        previewText = currentLine || content?.split('\n')[0].trim();
        icon = LightBulbIcon;
        break;
        
      case 'completed':
        const durationText = duration ? `${duration.toFixed(1)}s` : '';
        const tokenText = tokenCount ? `${tokenCount} tokens` : '';
        const summaryParts = [durationText, tokenText].filter(Boolean).join(', ');
        
        headerText = summaryParts ? (
          <ThinkingText>Thought for {summaryParts}</ThinkingText>
        ) : (
          <ThinkingText>Thinking complete</ThinkingText>
        );
        previewText = responsePreview || content?.split('\n')[0].trim();
        icon = LightBulbIcon;
        break;
        
      default:
        return;
    }
    
    // Smooth content update
    setDisplayContent({
      headerText,
      previewText,
      icon
    });
  }, [state, processingMessageIndex, content, currentLine, duration, tokenCount, responsePreview]);
  
  // Don't render if idle
  if (state === 'idle') {
    return null;
  }
  
  // Determine if collapsible
  const isCollapsible = state !== 'processing';
  
  const handleToggle = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const { truncatedText, containerRef, measureRef } = useTruncatedText({
    text: displayContent.previewText || '',
    maxWidth: undefined
  });
  
  const IconComponent = displayContent.icon;
  
  return (
    <ThinkingContainer>
      <ThinkingHeader onClick={handleToggle} isExpanded={isExpanded} isCollapsible={isCollapsible}>
        {isCollapsible && <ChevronRightIcon />}
        <IconComponent />
        <HeaderContent>
          {displayContent.headerText}
          {displayContent.previewText && !isExpanded && (
            <PreviewContainer ref={containerRef} title={displayContent.previewText}>
              <span ref={measureRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap' }}>
                {displayContent.previewText}
              </span>
              {truncatedText}
            </PreviewContainer>
          )}
        </HeaderContent>
      </ThinkingHeader>
      
      {isExpanded && content && (
        <ThinkingContent>
          {content}
        </ThinkingContent>
      )}
    </ThinkingContainer>
  );
};