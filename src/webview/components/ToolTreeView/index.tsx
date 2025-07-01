import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { 
  Squares2X2Icon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { buildToolHierarchy, ToolChain, groupToolChainsByType } from '../../utils/toolHierarchy';
import { ToolChainDisplay } from '../ToolChainDisplay';
import { ToolUseDisplay } from '../ToolUseDisplay';

const TreeContainer = styled.div`
  margin: 12px 0;
`;

const TreeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  margin-bottom: 8px;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-foreground);
`;

const HeaderIcon = styled.div`
  width: 16px;
  height: 16px;
  color: var(--vscode-symbolIcon-classForeground);
`;

const ViewControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ViewButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid ${props => props.active ? 'var(--vscode-focusBorder)' : 'var(--vscode-widget-border)'};
  background-color: ${props => props.active ? 'var(--vscode-button-background)' : 'transparent'};
  color: ${props => props.active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-list-hoverBackground)'};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ExpandControls = styled.div<{ visible?: boolean }>`
  display: flex;
  gap: 4px;
  width: 60px; /* Reserve consistent space */
  justify-content: flex-end;
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  transition: opacity 0.2s;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--vscode-widget-border);
  background-color: transparent;
  color: var(--vscode-foreground);
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const GroupedSection = styled.div`
  margin-bottom: 16px;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vscode-symbolIcon-methodForeground);
  background-color: var(--vscode-editor-background);
  border-radius: 3px;
  margin-bottom: 4px;
`;

const ToolCount = styled.span`
  font-weight: normal;
  color: var(--vscode-descriptionForeground);
  font-size: 10px;
`;

interface ToolTreeViewProps {
  toolUses: Array<{
    toolName: string;
    toolId: string;
    input: any;
    result?: string;
    isError?: boolean;
    parentToolUseId?: string;
  }>;
}

type ViewMode = 'hierarchical' | 'flat' | 'grouped';

export const ToolTreeView: React.FC<ToolTreeViewProps> = ({ toolUses }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchical');
  const [forceExpanded, setForceExpanded] = useState<boolean | undefined>(undefined);
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('hierarchical');
  
  // Build hierarchical structure
  const toolChains = useMemo(() => {
    if (!toolUses || toolUses.length === 0) return [];
    return buildToolHierarchy(toolUses);
  }, [toolUses]);
  
  // Group by tool type
  const groupedChains = useMemo(() => {
    return groupToolChainsByType(toolChains);
  }, [toolChains]);
  
  if (!toolUses || toolUses.length === 0) {
    return null;
  }
  
  const handleExpandAll = () => {
    setForceExpanded(true);
  };
  
  const handleCollapseAll = () => {
    setForceExpanded(false);
  };
  
  return (
    <TreeContainer>
      <TreeHeader>
        <HeaderTitle>
          <HeaderIcon>
            <Squares2X2Icon />
          </HeaderIcon>
          Tool Executions ({toolUses.length})
        </HeaderTitle>
        
        <ViewControls>
          <ViewButton 
            active={viewMode === 'hierarchical'}
            onClick={() => {
              setPreviousViewMode(viewMode);
              setViewMode('hierarchical');
              // Reset expansion state when switching views
              if (viewMode !== 'hierarchical') {
                setForceExpanded(undefined);
              }
            }}
            title="Show hierarchical view"
          >
            <Squares2X2Icon />
            Tree
          </ViewButton>
          <ViewButton 
            active={viewMode === 'grouped'}
            onClick={() => {
              setPreviousViewMode(viewMode);
              setViewMode('grouped');
              // Reset expansion state when switching views
              if (viewMode !== 'grouped') {
                setForceExpanded(undefined);
              }
            }}
            title="Group by tool type"
          >
            <FunnelIcon />
            Grouped
          </ViewButton>
          <ViewButton 
            active={viewMode === 'flat'}
            onClick={() => {
              setPreviousViewMode(viewMode);
              setViewMode('flat');
            }}
            title="Show flat list"
          >
            Flat
          </ViewButton>
          
          <ExpandControls visible={viewMode === 'hierarchical'}>
            <ExpandButton onClick={handleExpandAll} title="Expand all">
              <ChevronDownIcon />
            </ExpandButton>
            <ExpandButton onClick={handleCollapseAll} title="Collapse all">
              <ChevronUpIcon />
            </ExpandButton>
          </ExpandControls>
        </ViewControls>
      </TreeHeader>
      
      {viewMode === 'hierarchical' && (
        <div>
          {toolChains.map((chain) => (
            <ToolChainDisplay 
              key={chain.rootToolId} 
              chain={chain}
              defaultExpanded={forceExpanded !== undefined ? forceExpanded : false}
            />
          ))}
        </div>
      )}
      
      {viewMode === 'grouped' && (
        <div>
          {Array.from(groupedChains.entries()).map(([toolType, chains]) => (
            <GroupedSection key={toolType}>
              <GroupHeader>
                {toolType}
                <ToolCount>({chains.length})</ToolCount>
              </GroupHeader>
              {chains.map((chain) => (
                <ToolChainDisplay 
                  key={chain.rootToolId} 
                  chain={chain}
                  defaultExpanded={forceExpanded !== undefined ? forceExpanded : false}
                />
              ))}
            </GroupedSection>
          ))}
        </div>
      )}
      
      {viewMode === 'flat' && (
        <div>
          {toolUses.map((tool) => (
            <ToolUseDisplay
              key={tool.toolId}
              toolName={tool.toolName}
              toolId={tool.toolId}
              input={tool.input}
              result={tool.result}
              status={tool.result ? 'complete' : 'calling'}
              isError={tool.isError}
              defaultExpanded={forceExpanded !== undefined ? forceExpanded : false}
            />
          ))}
        </div>
      )}
    </TreeContainer>
  );
};