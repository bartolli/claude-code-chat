import React from 'react';
import styled from 'styled-components';
import { ToolChainContainer } from './ToolChainContainer';

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

const ToolsSection = styled.div`
  margin: 8px 0;
  padding: 8px 0;
  border-top: 1px solid var(--vscode-widget-border);
  border-bottom: 1px solid var(--vscode-widget-border);
`;

interface InlineToolDisplayProps {
  toolUses: ToolUse[];
}

export const InlineToolDisplay: React.FC<InlineToolDisplayProps> = ({ toolUses }) => {
  // Group tools into chains based on parent-child relationships
  const toolChains = React.useMemo(() => {
    if (!toolUses || toolUses.length === 0) return [];
    
    // Build chains from tool uses
    const chains: ToolChain[] = [];
    const chainMap = new Map<string, ToolChain>(); // Map tool IDs to their chains
    const toolMap = new Map(toolUses.map(tool => [tool.toolId, tool]));
    const processedIds = new Set<string>();
    
    // First pass: Create chains for root tools and map all tools to their chains
    toolUses.forEach(tool => {
      if (!tool.parentToolUseId && !processedIds.has(tool.toolId)) {
        const chain: ToolChain = {
          rootTool: tool,
          tools: [tool],
          totalTools: 1
        };
        
        processedIds.add(tool.toolId);
        chainMap.set(tool.toolId, chain);
        chains.push(chain);
      }
    });
    
    // Second pass: Add child tools to existing chains
    toolUses.forEach(tool => {
      if (tool.parentToolUseId && !processedIds.has(tool.toolId)) {
        // Find the chain that contains the parent
        let parentChain: ToolChain | undefined;
        
        // Check if parent is a root tool
        parentChain = chainMap.get(tool.parentToolUseId);
        
        // If not found, search through all chains
        if (!parentChain) {
          for (const chain of chains) {
            if (chain.tools.some(t => t.toolId === tool.parentToolUseId)) {
              parentChain = chain;
              break;
            }
          }
        }
        
        if (parentChain) {
          parentChain.tools.push(tool);
          parentChain.totalTools++;
          processedIds.add(tool.toolId);
          chainMap.set(tool.toolId, parentChain);
        }
      }
    });
    
    // Handle any orphaned tools as single-tool chains
    toolUses.forEach(tool => {
      if (!processedIds.has(tool.toolId)) {
        const chain: ToolChain = {
          rootTool: tool,
          tools: [tool],
          totalTools: 1
        };
        chains.push(chain);
        chainMap.set(tool.toolId, chain);
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
          key={`chain-${chain.rootTool.toolId}`} 
          chain={chain}
          isLast={index === toolChains.length - 1}
        />
      ))}
    </ToolsSection>
  );
};