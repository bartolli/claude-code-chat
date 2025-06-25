import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  ChevronRightIcon, 
  DocumentMagnifyingGlassIcon,
  CommandLineIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { vscForeground, vscEditorBackground, defaultBorderRadius } from '../styled';

const ToolContainer = styled.div`
  margin: 8px 0;
  border: 1px solid var(--vscode-widget-border);
  background-color: ${vscEditorBackground};
  border-radius: ${defaultBorderRadius};
  overflow: hidden;
`;

const ToolHeader = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
`;

const ChevronIcon = styled(ChevronRightIcon)<{ isExpanded: boolean }>`
  width: 16px;
  height: 16px;
  margin-right: 8px;
  transition: transform 0.3s ease;
  transform: ${props => props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;

const ToolIcon = styled.div`
  width: 18px;
  height: 18px;
  margin-right: 8px;
  color: var(--vscode-symbolIcon-fileForeground);
`;

const ToolName = styled.span`
  flex: 1;
  color: ${vscForeground};
  font-size: 13px;
  font-weight: 500;
`;

const StatusIcon = styled.div<{ status: 'calling' | 'complete' | 'error' }>`
  width: 18px;
  height: 18px;
  margin-left: 8px;
  color: ${props => 
    props.status === 'complete' ? 'var(--vscode-testing-iconPassed)' :
    props.status === 'error' ? 'var(--vscode-testing-iconFailed)' :
    'var(--vscode-progressBar-background)'
  };
`;

const ToolContent = styled.div`
  border-top: 1px solid var(--vscode-widget-border);
`;

const ToolInput = styled.div`
  padding: 12px 16px;
  font-size: 12px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
  background-color: var(--vscode-editor-background);
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const ToolResult = styled.div<{ isError?: boolean }>`
  padding: 12px 16px;
  font-size: 12px;
  font-family: var(--vscode-editor-font-family);
  color: ${props => props.isError ? 'var(--vscode-errorForeground)' : vscForeground};
  background-color: ${props => props.isError ? 'var(--vscode-inputValidation-errorBackground)' : 'transparent'};
  max-height: 200px;
  overflow-y: auto;
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const ShowMoreButton = styled.button`
  display: block;
  width: 100%;
  padding: 8px;
  border: none;
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }
`;

interface ToolUseDisplayProps {
  toolName: string;
  toolId?: string;
  input?: any;
  result?: string;
  status: 'calling' | 'complete' | 'error';
  isError?: boolean;
  defaultExpanded?: boolean;
}

const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();
  if (name.includes('search') || name.includes('grep')) return <DocumentMagnifyingGlassIcon />;
  if (name.includes('bash') || name.includes('command')) return <CommandLineIcon />;
  if (name.includes('read') || name.includes('write')) return <DocumentTextIcon />;
  if (name.includes('web') || name.includes('fetch')) return <GlobeAltIcon />;
  return <DocumentTextIcon />;
};

const getStatusIcon = (status: 'calling' | 'complete' | 'error') => {
  switch (status) {
    case 'complete': return <CheckCircleIcon />;
    case 'error': return <XCircleIcon />;
    case 'calling': return <ArrowPathIcon className="animate-spin" />;
  }
};

export const ToolUseDisplay: React.FC<ToolUseDisplayProps> = ({
  toolName,
  toolId,
  input,
  result,
  status,
  isError = false,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFullResult, setShowFullResult] = useState(false);
  
  const handleToggle = () => setIsExpanded(!isExpanded);
  
  // Format input for display
  const formatInput = (input: any): string => {
    if (typeof input === 'string') return input;
    try {
      return JSON.stringify(input, null, 2);
    } catch {
      return String(input);
    }
  };
  
  // Trim result if too long
  const trimmedResult = result && result.length > 500 && !showFullResult
    ? result.substring(0, 500) + '...'
    : result;
  
  return (
    <ToolContainer>
      <ToolHeader onClick={handleToggle} isExpanded={isExpanded}>
        <ChevronIcon isExpanded={isExpanded} />
        <ToolIcon>{getToolIcon(toolName)}</ToolIcon>
        <ToolName>{toolName}</ToolName>
        <StatusIcon status={status}>{getStatusIcon(status)}</StatusIcon>
      </ToolHeader>
      
      {isExpanded && (
        <ToolContent>
          {input && (
            <ToolInput>
              <pre>{formatInput(input)}</pre>
            </ToolInput>
          )}
          
          {result && (
            <>
              <ToolResult isError={isError}>
                <pre>{trimmedResult}</pre>
              </ToolResult>
              {result.length > 500 && !showFullResult && (
                <ShowMoreButton onClick={() => setShowFullResult(true)}>
                  Show more
                </ShowMoreButton>
              )}
              {showFullResult && result.length > 500 && (
                <ShowMoreButton onClick={() => setShowFullResult(false)}>
                  Show less
                </ShowMoreButton>
              )}
            </>
          )}
          
          {status === 'calling' && !result && (
            <ToolResult>
              <span style={{ opacity: 0.7 }}>Executing...</span>
            </ToolResult>
          )}
        </ToolContent>
      )}
    </ToolContainer>
  );
};