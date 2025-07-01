/**
 * Utility functions for building and managing tool hierarchies
 */

export interface ToolUse {
  toolName: string;
  toolId: string;
  input: any;
  result?: string;
  isError?: boolean;
  parentToolUseId?: string;
}

export interface ToolChain {
  rootToolId: string;
  rootTool: ToolUse;
  children: ToolChain[];
  depth: number;
}

/**
 * Builds a hierarchical tree structure from a flat array of tool uses
 * @param toolUses - Array of tool uses from messages
 * @returns Array of root tool chains
 */
export function buildToolHierarchy(toolUses: ToolUse[]): ToolChain[] {
  const toolMap = new Map<string, ToolUse>();
  const childrenMap = new Map<string, ToolUse[]>();
  const rootChains: ToolChain[] = [];
  
  // First pass: Create maps for quick lookup
  toolUses.forEach(tool => {
    toolMap.set(tool.toolId, tool);
    
    if (tool.parentToolUseId) {
      const siblings = childrenMap.get(tool.parentToolUseId) || [];
      siblings.push(tool);
      childrenMap.set(tool.parentToolUseId, siblings);
    }
  });
  
  // Second pass: Build chains starting from roots (tools with no parent)
  toolUses.forEach(tool => {
    if (!tool.parentToolUseId) {
      const chain = buildChainRecursive(tool, toolMap, childrenMap, 0);
      rootChains.push(chain);
    }
  });
  
  return rootChains;
}

/**
 * Recursively builds a tool chain from a root tool
 */
function buildChainRecursive(
  tool: ToolUse,
  toolMap: Map<string, ToolUse>,
  childrenMap: Map<string, ToolUse[]>,
  depth: number
): ToolChain {
  const children = childrenMap.get(tool.toolId) || [];
  
  return {
    rootToolId: tool.toolId,
    rootTool: tool,
    children: children.map(child => 
      buildChainRecursive(child, toolMap, childrenMap, depth + 1)
    ),
    depth
  };
}

/**
 * Flattens a tool chain back into a linear array
 * Useful for backwards compatibility or linear display
 * @param chain - Tool chain to flatten
 * @returns Array of tool uses in execution order
 */
export function flattenToolChain(chain: ToolChain): ToolUse[] {
  const result: ToolUse[] = [chain.rootTool];
  
  chain.children.forEach(child => {
    result.push(...flattenToolChain(child));
  });
  
  return result;
}

/**
 * Gets the total count of tools in a chain (including descendants)
 * @param chain - Tool chain to count
 * @returns Total number of tools in the chain
 */
export function getToolChainCount(chain: ToolChain): number {
  let count = 1; // Count the root
  
  chain.children.forEach(child => {
    count += getToolChainCount(child);
  });
  
  return count;
}

/**
 * Gets the maximum depth of a tool chain
 * @param chain - Tool chain to measure
 * @returns Maximum depth level
 */
export function getToolChainDepth(chain: ToolChain): number {
  if (chain.children.length === 0) {
    return chain.depth;
  }
  
  return Math.max(...chain.children.map(child => getToolChainDepth(child)));
}

/**
 * Checks if all tools in a chain have completed (have results)
 * @param chain - Tool chain to check
 * @returns True if all tools have results
 */
export function isToolChainComplete(chain: ToolChain): boolean {
  if (!chain.rootTool.result) {
    return false;
  }
  
  return chain.children.every(child => isToolChainComplete(child));
}

/**
 * Checks if any tool in a chain has an error
 * @param chain - Tool chain to check
 * @returns True if any tool has an error
 */
export function hasToolChainError(chain: ToolChain): boolean {
  if (chain.rootTool.isError) {
    return true;
  }
  
  return chain.children.some(child => hasToolChainError(child));
}

/**
 * Gets the execution status of a tool chain
 * @param chain - Tool chain to check
 * @returns 'pending' | 'executing' | 'complete' | 'error'
 */
export function getToolChainStatus(chain: ToolChain): 'pending' | 'executing' | 'complete' | 'error' {
  if (hasToolChainError(chain)) {
    return 'error';
  }
  
  if (isToolChainComplete(chain)) {
    return 'complete';
  }
  
  // If root has result but children don't, it's executing
  if (chain.rootTool.result && chain.children.length > 0) {
    return 'executing';
  }
  
  return 'pending';
}

/**
 * Groups tool chains by their root tool type
 * @param chains - Array of tool chains
 * @returns Map of tool type to chains
 */
export function groupToolChainsByType(chains: ToolChain[]): Map<string, ToolChain[]> {
  const groups = new Map<string, ToolChain[]>();
  
  chains.forEach(chain => {
    const toolType = chain.rootTool.toolName;
    const group = groups.get(toolType) || [];
    group.push(chain);
    groups.set(toolType, group);
  });
  
  return groups;
}