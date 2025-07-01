import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  ChevronRightIcon,
  ArrowLongRightIcon
} from '@heroicons/react/24/outline';
import { ToolChain, getToolChainStatus, getToolChainCount, flattenToolChain } from '../../utils/toolHierarchy';
import { ToolUseDisplay } from '../ToolUseDisplay';
import { vscForeground, vscEditorBackground, defaultBorderRadius } from '../styled';

const ChainContainer = styled.div`
  margin: 8px 0;
  position: relative;
`;

const ChainHeader = styled.div<{ isExpanded: boolean; hasChildren: boolean }>`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: ${props => props.hasChildren ? 'pointer' : 'default'};
  user-select: none;
  transition: background-color 0.2s;
  border-radius: ${defaultBorderRadius};
  
  &:hover {
    background-color: ${props => props.hasChildren ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
  }
`;

const ChevronIcon = styled(ChevronRightIcon)<{ isExpanded: boolean }>`
  width: 16px;
  height: 16px;
  margin-right: 4px;
  transition: transform 0.3s ease;
  transform: ${props => props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  opacity: ${props => props.isExpanded ? 1 : 0.7};
`;

const ChainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-left: auto;
`;

const TreeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  margin-right: 8px;
`;

const TreeBranch = styled.span`
  font-family: monospace;
  line-height: 1;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case 'complete': return 'var(--vscode-testing-iconPassed)';
      case 'error': return 'var(--vscode-testing-iconFailed)';
      case 'executing': return 'var(--vscode-progressBar-background)';
      default: return 'var(--vscode-badge-background)';
    }
  }};
  color: var(--vscode-badge-foreground);
  opacity: 0.8;
`;

const ChildrenContainer = styled.div<{ depth: number }>`
  margin-left: ${props => props.depth * 20}px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--vscode-widget-border);
    opacity: 0.5;
  }
`;

const ConnectorLine = styled.div`
  position: absolute;
  left: -12px;
  top: 20px;
  width: 12px;
  height: 1px;
  background-color: var(--vscode-widget-border);
  opacity: 0.5;
`;

const ToolWrapper = styled.div`
  position: relative;
`;

const ChildArrow = styled(ArrowLongRightIcon)`
  width: 14px;
  height: 14px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.5;
`;

interface ToolChainDisplayProps {
  chain: ToolChain;
  defaultExpanded?: boolean;
  showConnectors?: boolean;
}

// Get tree-style characters based on completion status
const getTreeSymbol = (chain: ToolChain): string => {
  const status = getToolChainStatus(chain);
  if (status === 'complete') return '☑';
  if (status === 'error') return '☒';
  if (status === 'executing') return '⏺';
  return '☐';
};

// Build tree representation string
const buildTreePreview = (chain: ToolChain, maxItems: number = 3): React.ReactNode => {
  const items: React.ReactNode[] = [];
  const allTools = flattenToolChain(chain);
  const displayTools = allTools.slice(0, maxItems);
  
  displayTools.forEach((tool, index) => {
    const isLast = index === displayTools.length - 1;
    const hasMore = allTools.length > maxItems;
    const symbol = tool.result ? '☑' : tool.isError ? '☒' : '☐';
    
    items.push(
      <TreeBranch key={tool.toolId}>
        {index === 0 ? '⎿ ' : '  '}
        {symbol} {tool.toolName}
        {isLast && hasMore && ` (+${allTools.length - maxItems} more)`}
        {index < displayTools.length - 1 && <br />}
      </TreeBranch>
    );
  });
  
  return <>{items}</>;
};


export const ToolChainDisplay: React.FC<ToolChainDisplayProps> = ({
  chain,
  defaultExpanded = false,
  showConnectors = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Update expansion state when defaultExpanded changes
  React.useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);
  const hasChildren = chain.children.length > 0;
  const status = getToolChainStatus(chain);
  const toolCount = getToolChainCount(chain);
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <ChainContainer>
      {hasChildren && (
        <ChainHeader 
          onClick={handleToggle} 
          isExpanded={isExpanded}
          hasChildren={hasChildren}
        >
          <ChevronIcon isExpanded={isExpanded} />
          <TreeIndicator>
            <TreeBranch>{getTreeSymbol(chain)}</TreeBranch>
            <span style={{ fontFamily: 'var(--vscode-font-family)' }}>{chain.rootTool.toolName}</span>
          </TreeIndicator>
          {!isExpanded && toolCount > 1 && (
            <TreeIndicator style={{ flex: 1, marginLeft: 8 }}>
              {buildTreePreview(chain, 2)}
            </TreeIndicator>
          )}
          <ChainInfo>
            <span style={{ fontSize: '11px' }}>
              {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
            </span>
            <StatusBadge status={status}>{status}</StatusBadge>
          </ChainInfo>
        </ChainHeader>
      )}
      
      <ToolWrapper>
        {showConnectors && chain.depth > 0 && <ConnectorLine />}
        <ToolUseDisplay
          toolName={chain.rootTool.toolName}
          toolId={chain.rootTool.toolId}
          input={chain.rootTool.input}
          result={chain.rootTool.result}
          status={chain.rootTool.result ? 'complete' : 'calling'}
          isError={chain.rootTool.isError}
          defaultExpanded={false}
        />
      </ToolWrapper>
      
      {hasChildren && isExpanded && (
        <ChildrenContainer depth={1}>
          {chain.children.map((childChain, index) => (
            <div key={childChain.rootToolId} style={{ position: 'relative' }}>
              {index > 0 && <div style={{ height: '8px' }} />}
              <ToolChainDisplay 
                chain={childChain} 
                defaultExpanded={false}
                showConnectors={showConnectors}
              />
            </div>
          ))}
        </ChildrenContainer>
      )}
    </ChainContainer>
  );
};