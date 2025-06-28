/**
 * MCP (Model Context Protocol) state slice
 * Manages MCP server status and configuration
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { resetAllState } from '../actions';

export interface McpServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
  toolCount?: number;
  promptCount?: number;
  command?: string;
  args?: string[];
}

export interface McpState {
  servers: McpServerInfo[];
  totalToolCount: number;
  isLoading: boolean;
  lastUpdated?: number;
}

const initialState: McpState = {
  servers: [],
  totalToolCount: 0,
  isLoading: false,
  lastUpdated: undefined
};

const mcpSlice = createSlice({
  name: 'mcp',
  initialState,
  reducers: {
    setMcpServers: (state, action: PayloadAction<McpServerInfo[]>) => {
      state.servers = action.payload;
      state.lastUpdated = Date.now();
      // Calculate total tool count
      state.totalToolCount = action.payload.reduce((sum, server) => 
        sum + (server.toolCount || 0), 0
      );
    },
    
    updateServerStatus: (state, action: PayloadAction<{ name: string; status: McpServerInfo['status'] }>) => {
      const server = state.servers.find(s => s.name === action.payload.name);
      if (server) {
        server.status = action.payload.status;
        state.lastUpdated = Date.now();
      }
    },
    
    updateServerToolCount: (state, action: PayloadAction<{ name: string; toolCount: number; promptCount?: number }>) => {
      const server = state.servers.find(s => s.name === action.payload.name);
      if (server) {
        server.toolCount = action.payload.toolCount;
        if (action.payload.promptCount !== undefined) {
          server.promptCount = action.payload.promptCount;
        }
        // Recalculate total
        state.totalToolCount = state.servers.reduce((sum, s) => 
          sum + (s.toolCount || 0), 0
        );
        state.lastUpdated = Date.now();
      }
    },
    
    setMcpLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    addMcpServer: (state, action: PayloadAction<McpServerInfo>) => {
      state.servers.push(action.payload);
      state.totalToolCount += action.payload.toolCount || 0;
      state.lastUpdated = Date.now();
    },
    
    removeMcpServer: (state, action: PayloadAction<string>) => {
      const index = state.servers.findIndex(s => s.name === action.payload);
      if (index !== -1) {
        const server = state.servers[index];
        state.totalToolCount -= server.toolCount || 0;
        state.servers.splice(index, 1);
        state.lastUpdated = Date.now();
      }
    },
    
    updateConnectedServers: (state, action: PayloadAction<McpServerInfo[]>) => {
      // If we have no servers yet, just set them directly
      if (state.servers.length === 0) {
        state.servers = action.payload;
        state.totalToolCount = action.payload
          .filter(s => s.enabled)
          .reduce((sum, server) => sum + (server.toolCount || 0), 0);
        state.lastUpdated = Date.now();
        return;
      }
      
      // When Claude connects, update status of servers
      // Keep enabled status, just update connection status
      state.servers.forEach(server => {
        // Only update enabled servers
        if (server.enabled) {
          server.status = 'disconnected';
          server.toolCount = 0;
          server.promptCount = 0;
        }
      });
      
      // Update connected servers with their info
      action.payload.forEach(connectedServer => {
        const server = state.servers.find(s => s.name === connectedServer.name);
        if (server && server.enabled) {
          server.status = connectedServer.status;
          server.toolCount = connectedServer.toolCount || 0;
          server.promptCount = connectedServer.promptCount || 0;
        }
      });
      
      // Recalculate total tool count (only from enabled servers)
      state.totalToolCount = state.servers
        .filter(s => s.enabled)
        .reduce((sum, server) => sum + (server.toolCount || 0), 0);
      state.lastUpdated = Date.now();
    }
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  }
});

export const {
  setMcpServers,
  updateServerStatus,
  updateServerToolCount,
  setMcpLoading,
  addMcpServer,
  removeMcpServer,
  updateConnectedServers
} = mcpSlice.actions;

// Selectors
export const selectMcpState = (state: { mcp: McpState }) => state.mcp;
export const selectMcpServers = (state: { mcp: McpState }) => state.mcp.servers;
export const selectMcpTotalToolCount = (state: { mcp: McpState }) => state.mcp.totalToolCount;
export const selectMcpIsLoading = (state: { mcp: McpState }) => state.mcp.isLoading;
export const selectMcpServerByName = (name: string) => (state: { mcp: McpState }) => 
  state.mcp.servers.find(s => s.name === name);

export default mcpSlice.reducer;