import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { ToolUseDisplay } from '../ToolUseDisplay';

const ChainContainer = styled.div<{ isLast?: boolean }>`
  margin-bottom: ${props => props.isLast ? '0' : '12px'};
`;

const ChainHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  border-radius: 3px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
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
`;

const ToolCount = styled.span`
  color: var(--vscode-descriptionForeground);
  font-weight: normal;
`;

const ToolsList = styled.div<{ isExpanded: boolean }>`
  margin-left: 20px;
  margin-top: 4px;
  overflow: hidden;
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

interface ToolChain {
  rootTool: {
    toolName: string;
    toolId: string;
    input: any;
    result?: string;
    isError?: boolean;
  };
  tools: Array<{
    toolName: string;
    toolId: string;
    input: any;
    result?: string;
    isError?: boolean;
    parentToolUseId?: string;
  }>;
  totalTools: number;
}

interface ToolChainContainerProps {
  chain: ToolChain;
  isLast?: boolean;
}

// Helper function to calculate tool depth
const calculateToolDepth = (tool: any, allTools: any[]): number => {
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
  
  // For single tool chains, just show the tool directly
  if (chain.totalTools === 1) {
    return (
      <ChainContainer isLast={isLast}>
        <ToolUseDisplay
          toolName={chain.rootTool.toolName}
          toolId={chain.rootTool.toolId}
          input={chain.rootTool.input}
          result={chain.rootTool.result}
          status={chain.rootTool.result !== undefined ? 'complete' : 'calling'}
          isError={chain.rootTool.isError}
          defaultExpanded={false}
        />
      </ChainContainer>
    );
  }
  
  // For multi-tool chains, show collapsible container
  const visibleTools = isExpanded ? chain.tools : chain.tools.slice(-3);
  const hiddenCount = chain.totalTools - 3;
  const showMoreIndicator = !isExpanded && hiddenCount > 0;
  
  return (
    <ChainContainer isLast={isLast}>
      <ChainHeader onClick={() => setIsExpanded(!isExpanded)}>
        <ChevronIcon isExpanded={isExpanded} />
        <ChainTitle>{chain.rootTool.toolName} chain:</ChainTitle>
        <ToolCount>
          {chain.totalTools} {chain.totalTools === 1 ? 'tool' : 'tools'}
          {!isExpanded && chain.totalTools > 3 && ` (showing 3)`}
        </ToolCount>
      </ChainHeader>
      
      <ToolsList isExpanded={isExpanded}>
        {visibleTools.map((tool) => {
          // Calculate depth based on parent chain
          const depth = calculateToolDepth(tool, chain.tools);
          return (
            <NestedTool key={tool.toolId} depth={depth}>
              <ToolUseDisplay
                toolName={tool.toolName}
                toolId={tool.toolId}
                input={tool.input}
                result={tool.result}
                status={tool.result !== undefined ? 'complete' : 'calling'}
                isError={tool.isError}
                defaultExpanded={false}
              />
            </NestedTool>
          );
        })}
        
        {showMoreIndicator && (
          <MoreIndicator>
            ... and {hiddenCount} more
          </MoreIndicator>
        )}
      </ToolsList>
    </ChainContainer>
  );
};