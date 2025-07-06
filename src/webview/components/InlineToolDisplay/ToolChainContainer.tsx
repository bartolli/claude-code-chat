import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronRightIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ToolUseDisplay } from '../ToolUseDisplay';

const ChainContainer = styled.div<{ isLast?: boolean }>`
  margin-bottom: ${props => props.isLast ? '0' : '12px'};
`;

const ChainHeader = styled.div<{ isTask?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${props => props.isTask ? '8px 12px' : '4px 8px'};
  cursor: pointer;
  user-select: none;
  font-size: ${props => props.isTask ? '13px' : '12px'};
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
  }
`;

const ChevronIcon = styled(ChevronRightIcon)<{ isExpanded: boolean }>`
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
  transform: ${props => props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  color: var(--vscode-foreground);
`;

const ChainTitle = styled.span`
  font-weight: 500;
  flex: 1;
`;

const ToolCount = styled.span`
  color: var(--vscode-descriptionForeground);
  font-weight: normal;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TaskIcon = styled(DocumentTextIcon)`
  width: 18px;
  height: 18px;
  color: var(--vscode-symbolIcon-fileForeground);
`;

const StatusIcon = styled.span<{ status: 'complete' | 'error' | 'running' }>`
  width: 18px;
  height: 18px;
  color: ${props => 
    props.status === 'complete' ? 'var(--vscode-testing-iconPassed)' :
    props.status === 'error' ? 'var(--vscode-testing-iconFailed)' :
    'var(--vscode-progressBar-background)'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ToolsList = styled.div<{ isExpanded: boolean }>`
  margin-left: 20px;
  margin-top: 8px;
  overflow: hidden;
  max-height: ${props => props.isExpanded ? 'none' : '0'};
  transition: all 0.3s ease-out;
`;

const NestedTool = styled.div<{ depth: number }>`
  margin-left: ${props => props.depth * 16}px;
`;

const MoreIndicator = styled.div`
  padding: 4px 8px 4px 24px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
`;

const ToolStatus = styled.span`
  margin-right: 4px;
  font-family: monospace;
`;

const TreeConnector = styled.span`
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  margin-right: 4px;
  font-family: monospace;
`;

const CollapsedToolPreview = styled.div`
  display: flex;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  
  &:hover {
    color: var(--vscode-foreground);
  }
`;

const MoreToolsIndicator = styled.div`
  padding: 3px 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  font-style: italic;
`;

interface ToolUse {
  toolName: string;
  toolId: string;
  input: unknown;
  result?: string;
  isError?: boolean;
  parentToolUseId?: string;
}

interface ToolChain {
  rootTool: ToolUse;
  tools: ToolUse[];
  totalTools: number;
}

interface ToolChainContainerProps {
  chain: ToolChain;
  isLast?: boolean;
}

// Helper function to get status symbol
const getStatusSymbol = (tool: ToolUse): string => {
  if (tool.isError) return '✗';
  if (tool.result !== undefined) return '✓';
  return '⏺';
};

// Helper function to calculate tool depth
const calculateToolDepth = (tool: ToolUse, allTools: ToolUse[]): number => {
  let depth = 0;
  let currentTool = tool;
  
  while (currentTool.parentToolUseId) {
    depth++;
    // Find parent tool
    const parent = allTools.find(t => t.toolId === currentTool.parentToolUseId);
    if (!parent) break;
    currentTool = parent;
  }
  
  return depth;
};

export const ToolChainContainer: React.FC<ToolChainContainerProps> = ({ chain, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if this is a Task tool chain
  const isTaskChain = chain.rootTool.toolName === 'Task';
  const taskDescription = isTaskChain && chain.rootTool.input?.description 
    ? chain.rootTool.input.description 
    : '';
  
  // Determine overall status of the chain
  const getChainStatus = (): 'complete' | 'error' | 'running' => {
    // For Task chains, use the Task tool's own status
    if (isTaskChain) {
      // The Task tool itself tells us the overall status
      if (chain.rootTool.result === undefined) {
        return 'running';
      }
      return chain.rootTool.isError ? 'error' : 'complete';
    }
    
    // For non-Task chains, check all tools
    const allComplete = chain.tools.every(t => t.result !== undefined);
    
    if (!allComplete) {
      return 'running';
    }
    
    const hasError = chain.tools.some(t => t.isError);
    return hasError ? 'error' : 'complete';
  };
  
  // Get counts for status summary
  const getStatusCounts = () => {
    const completed = chain.tools.filter(t => t.result !== undefined && !t.isError).length;
    const failed = chain.tools.filter(t => t.isError).length;
    const running = chain.tools.filter(t => t.result === undefined).length;
    return { completed, failed, running };
  };
  
  const chainStatus = getChainStatus();
  const statusCounts = getStatusCounts();
  
  // For single tool chains that aren't Task, show the tool directly
  if (chain.totalTools === 1 && !isTaskChain) {
    return (
      <ChainContainer isLast={isLast}>
        <ToolUseDisplay
          toolName={chain.rootTool.toolName}
          toolId={chain.rootTool.toolId}
          input={chain.rootTool.input}
          result={chain.rootTool.result}
          status={chain.rootTool.result !== undefined ? 
            (chain.rootTool.isError && chain.rootTool.result === '(No response received)' ? 'timeout' : 
             chain.rootTool.isError ? 'error' : 'complete') : 'calling'}
          isError={chain.rootTool.isError}
          defaultExpanded={false}
        />
      </ChainContainer>
    );
  }
  
  // For multi-tool chains, show collapsible container
  // When collapsed: show last 2 child tools (not including Task itself)
  const getVisibleTools = () => {
    if (isExpanded) return chain.tools;
    
    // For Task chains, don't show the Task tool itself in the collapsed view
    if (isTaskChain) {
      const childTools = chain.tools.filter(t => t.toolName !== 'Task');
      return childTools.slice(-2);
    }
    
    // For other chains, show root + last 2
    const rootIndex = chain.tools.findIndex(t => t.toolId === chain.rootTool.toolId);
    const otherTools = chain.tools.filter((_, index) => index !== rootIndex);
    const lastTwoTools = otherTools.slice(-2);
    
    return [chain.rootTool, ...lastTwoTools];
  };
  
  const visibleTools = getVisibleTools();
  // For Task chains, exclude the Task tool itself from counts
  const actualToolCount = isTaskChain ? chain.totalTools - 1 : chain.totalTools;
  const hiddenCount = actualToolCount - visibleTools.length;
  const showMoreIndicator = !isExpanded && hiddenCount > 0;
  
  return (
    <ChainContainer isLast={isLast}>
      <ChainHeader onClick={() => setIsExpanded(!isExpanded)} isTask={isTaskChain}>
        <ChevronIcon isExpanded={isExpanded} />
        {isTaskChain && <TaskIcon />}
        <ChainTitle>
          {isTaskChain ? `Task: ${taskDescription || 'Processing'}` : `${chain.rootTool.toolName} chain:`}
        </ChainTitle>
        <ToolCount>
          {actualToolCount} {actualToolCount === 1 ? 'tool' : 'tools'}
          <StatusIcon status={chainStatus}>
            {chainStatus === 'complete' ? <CheckCircleIcon /> :
             chainStatus === 'error' ? <XCircleIcon /> :
             <ArrowPathIcon className="animate-spin" />}
          </StatusIcon>
        </ToolCount>
      </ChainHeader>
      
      {!isExpanded && actualToolCount > 0 && (
        <div style={{ paddingLeft: '24px', marginTop: '6px' }}>
          {hiddenCount > 0 && (
            <MoreToolsIndicator>
              <TreeConnector>⋮</TreeConnector> +{hiddenCount} more {hiddenCount === 1 ? 'tool' : 'tools'}
            </MoreToolsIndicator>
          )}
          {visibleTools.map((tool, index) => (
            <CollapsedToolPreview key={tool.toolId}>
              <TreeConnector>⎿</TreeConnector>
              <ToolStatus>{getStatusSymbol(tool)}</ToolStatus>
              <span>{tool.toolName}</span>
            </CollapsedToolPreview>
          ))}
        </div>
      )}
      
      {isExpanded && (
      <ToolsList isExpanded={isExpanded}>
        {chain.tools
          .filter(tool => !isTaskChain || tool.toolName !== 'Task')
          .map((tool) => {
            // Calculate depth based on parent chain
            const depth = isTaskChain ? 0 : calculateToolDepth(tool, chain.tools);
            return (
              <NestedTool key={tool.toolId} depth={depth}>
                <ToolUseDisplay
                  toolName={tool.toolName}
                  toolId={tool.toolId}
                  input={tool.input}
                  result={tool.result}
                  status={tool.result !== undefined ? 
                    (tool.isError && tool.result === '(No response received)' ? 'timeout' : 
                     tool.isError ? 'error' : 'complete') : 'calling'}
                  isError={tool.isError}
                  defaultExpanded={false}
                />
              </NestedTool>
            );
          })}
      </ToolsList>
      )}
    </ChainContainer>
  );
};