import React from 'react';
import styled from 'styled-components';
import { ToolChainContainer } from './ToolChainContainer';

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

const ToolsSection = styled.div`
  margin: 8px 0;
  padding: 8px 0;
  border-top: 1px solid var(--vscode-widget-border);
  border-bottom: 1px solid var(--vscode-widget-border);
`;

interface InlineToolDisplayProps {
  toolUses: Array<{
    toolName: string;
    toolId: string;
    input: any;
    result?: string;
    isError?: boolean;
    parentToolUseId?: string;
  }>;
}

export const InlineToolDisplay: React.FC<InlineToolDisplayProps> = ({ toolUses }) => {
  // Group tools into chains based on parent-child relationships
  const toolChains = React.useMemo(() => {
    if (!toolUses || toolUses.length === 0) return [];
    
    // Build chains from tool uses
    const chains: ToolChain[] = [];
    const toolMap = new Map(toolUses.map(tool => [tool.toolId, tool]));
    const processedIds = new Set<string>();
    
    // Find root tools (no parent) and build chains from them
    toolUses.forEach(tool => {
      if (!tool.parentToolUseId && !processedIds.has(tool.toolId)) {
        const chain: ToolChain = {
          rootTool: tool,
          tools: [tool],
          totalTools: 1
        };
        
        // Find all children recursively
        const findChildren = (parentId: string) => {
          toolUses.forEach(childTool => {
            if (childTool.parentToolUseId === parentId && !processedIds.has(childTool.toolId)) {
              chain.tools.push(childTool);
              chain.totalTools++;
              processedIds.add(childTool.toolId);
              findChildren(childTool.toolId);
            }
          });
        };
        
        processedIds.add(tool.toolId);
        findChildren(tool.toolId);
        chains.push(chain);
      }
    });
    
    // Handle any orphaned tools as single-tool chains
    toolUses.forEach(tool => {
      if (!processedIds.has(tool.toolId)) {
        chains.push({
          rootTool: tool,
          tools: [tool],
          totalTools: 1
        });
      }
    });
    
    return chains;
  }, [toolUses]);
  
  if (!toolUses || toolUses.length === 0) {
    return null;
  }
  
  return (
    <ToolsSection>
      {toolChains.map((chain, index) => (
        <ToolChainContainer 
          key={chain.rootTool.toolId} 
          chain={chain}
          isLast={index === toolChains.length - 1}
        />
      ))}
    </ToolsSection>
  );
};