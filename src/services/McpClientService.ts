/**
 * MCP Client Service for querying server resources
 * Uses the @modelcontextprotocol/sdk to connect directly to MCP servers
 */

import { getLogger } from '../core/Logger';
import { McpServerInfo } from './McpService';

// Import MCP SDK - webpack will bundle these
const { Client } = require('@modelcontextprotocol/sdk/client/index');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio');

export interface McpServerResources {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  resources: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
}

export class McpClientService {
  private static readonly logger = getLogger();
  private clients: Map<string, any> = new Map();

  /**
   * Connect to an MCP server and query its resources
   */
  async queryServerResources(server: McpServerInfo): Promise<McpServerResources> {
    const { name, command, args = [], env } = server;
    
    try {
      McpClientService.logger.info('McpClientService', `Connecting to server: ${name}`, {
        command,
        args: args.join(' ')
      });
      
      // Create transport with server's command and args
      const transportEnv: Record<string, string> = {};
      
      // Copy process env, filtering out undefined values
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          transportEnv[key] = value;
        }
      }
      
      // Override with server-specific env if provided
      if (env) {
        Object.assign(transportEnv, env);
      }
      
      const transport = new StdioClientTransport({
        command,
        args,
        env: transportEnv
      });

      // Create client
      const client = new Client({
        name: 'claude-code-chat',
        version: '1.0.0'
      });

      // Connect to server with timeout
      const connectTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
      );
      
      await Promise.race([
        client.connect(transport),
        connectTimeout
      ]);
      
      this.clients.set(name, client);

      // Query all resources in parallel with timeout
      const queryTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
      );
      
      const [tools, prompts, resources] = await Promise.race([
        Promise.all([
          this.queryTools(client, name),
          this.queryPrompts(client, name),
          this.queryResources(client, name)
        ]),
        queryTimeout
      ]) as [any[], any[], any[]];

      McpClientService.logger.info('McpClientService', `Server ${name} resources:`, {
        toolCount: tools.length,
        promptCount: prompts.length,
        resourceCount: resources.length
      });

      // Disconnect after querying to free resources
      await this.disconnect(name);

      return { tools, prompts, resources };
    } catch (error) {
      McpClientService.logger.error('McpClientService', `Failed to query server ${name}: ${(error as Error).message}`);
      // Clean up on error
      await this.disconnect(name);
      // Return empty resources instead of throwing
      return { tools: [], prompts: [], resources: [] };
    }
  }

  /**
   * Query tools from a connected client
   */
  private async queryTools(client: any, serverName: string) {
    try {
      const response = await client.listTools();
      McpClientService.logger.info('McpClientService', `Found ${response.tools.length} tools in ${serverName}`);
      return response.tools;
    } catch (error) {
      McpClientService.logger.warn('McpClientService', `Failed to list tools for ${serverName}`, error as Error);
      return [];
    }
  }

  /**
   * Query prompts from a connected client
   */
  private async queryPrompts(client: any, serverName: string) {
    try {
      const response = await client.listPrompts();
      McpClientService.logger.info('McpClientService', `Found ${response.prompts.length} prompts in ${serverName}`);
      return response.prompts;
    } catch (error) {
      McpClientService.logger.warn('McpClientService', `Failed to list prompts for ${serverName}`, error as Error);
      return [];
    }
  }

  /**
   * Query resources from a connected client
   */
  private async queryResources(client: any, serverName: string) {
    try {
      const response = await client.listResources();
      McpClientService.logger.info('McpClientService', `Found ${response.resources.length} resources in ${serverName}`);
      return response.resources;
    } catch (error) {
      McpClientService.logger.warn('McpClientService', `Failed to list resources for ${serverName}`, error as Error);
      return [];
    }
  }

  /**
   * Disconnect from a specific server
   */
  async disconnect(serverName: string) {
    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
        this.clients.delete(serverName);
        McpClientService.logger.info('McpClientService', `Disconnected from server: ${serverName}`);
      } catch (error) {
        McpClientService.logger.error('McpClientService', `Failed to disconnect from ${serverName}`, error as Error);
      }
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll() {
    const disconnectPromises = Array.from(this.clients.keys()).map(name => this.disconnect(name));
    await Promise.all(disconnectPromises);
  }
}

// Export singleton instance
export const mcpClientService = new McpClientService();