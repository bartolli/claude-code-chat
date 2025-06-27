/**
 * Service for managing MCP (Model Context Protocol) servers and configurations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getLogger } from '../core/Logger';
import { McpConfig, McpServerConfig, McpServerStatus } from '../types/claude';

export interface McpServerInfo extends McpServerConfig {
  name: string;
  scope?: 'local' | 'project' | 'user';
}

export class McpService {
  private static readonly logger = getLogger();
  private execAsync = promisify(exec);

  /**
   * List all configured MCP servers
   * @param scope - Optional scope to filter servers
   */
  async listServers(scope?: 'local' | 'project' | 'user'): Promise<McpServerInfo[]> {
    try {
      const cmd = scope ? `claude mcp list -s ${scope}` : 'claude mcp list';
      McpService.logger.info('McpService', `Executing: ${cmd}`);
      
      const { stdout } = await this.execAsync(cmd);
      return this.parseServerList(stdout);
    } catch (error) {
      McpService.logger.error('McpService', 'Failed to list MCP servers', error as Error);
      // Fall back to reading config files directly
      return this.listServersFromConfigs();
    }
  }

  /**
   * Get details for a specific MCP server
   */
  async getServer(name: string): Promise<McpServerInfo | null> {
    try {
      const { stdout } = await this.execAsync(`claude mcp get ${name}`);
      return this.parseServerDetails(stdout, name);
    } catch (error) {
      McpService.logger.error('McpService', `Failed to get MCP server ${name}`, error as Error);
      // Fall back to reading from configs
      const servers = await this.listServersFromConfigs();
      return servers.find(s => s.name === name) || null;
    }
  }

  /**
   * Load MCP configuration from project
   */
  async loadMcpConfig(projectPath: string): Promise<McpConfig | null> {
    const mcpJsonPath = path.join(projectPath, '.mcp.json');
    
    try {
      if (fs.existsSync(mcpJsonPath)) {
        const content = await fs.promises.readFile(mcpJsonPath, 'utf-8');
        const config = JSON.parse(content) as McpConfig;
        McpService.logger.info('McpService', `Loaded MCP config from ${mcpJsonPath}`, {
          serverCount: Object.keys(config.mcpServers || {}).length
        });
        return config;
      }
    } catch (error) {
      McpService.logger.error('McpService', `Failed to load MCP config from ${mcpJsonPath}`, error as Error);
    }
    
    return null;
  }

  /**
   * Get MCP config flag for CLI
   */
  getMcpConfigFlag(projectPath: string): string[] {
    const mcpJsonPath = path.join(projectPath, '.mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      return ['--mcp-config', '.mcp.json'];
    }
    return [];
  }

  /**
   * Load all MCP configurations with proper scope precedence
   * Precedence: local > project > user
   */
  async loadAllConfigs(projectPath: string): Promise<{
    local: McpConfig | null;
    project: McpConfig | null;
    user: McpConfig | null;
  }> {
    const configs = {
      local: null as McpConfig | null,
      project: null as McpConfig | null,
      user: null as McpConfig | null
    };

    // Load project config (.mcp.json)
    configs.project = await this.loadMcpConfig(projectPath);

    // Load local config (.claude/settings.local.json)
    const localSettingsPath = path.join(projectPath, '.claude', 'settings.local.json');
    configs.local = await this.loadSettingsFile(localSettingsPath);

    // Load user config (~/.config/claude/settings.user.json)
    const userSettingsPath = path.join(os.homedir(), '.config', 'claude', 'settings.user.json');
    configs.user = await this.loadSettingsFile(userSettingsPath);

    return configs;
  }

  /**
   * Merge MCP configurations with proper precedence
   */
  mergeConfigs(
    local: McpConfig | null,
    project: McpConfig | null,
    user: McpConfig | null
  ): McpServerInfo[] {
    const servers: McpServerInfo[] = [];
    const serverMap = new Map<string, McpServerInfo>();

    // Add user servers (lowest precedence)
    if (user?.mcpServers) {
      Object.entries(user.mcpServers).forEach(([name, config]) => {
        serverMap.set(name, { ...config, name, scope: 'user' });
      });
    }

    // Add project servers (medium precedence)
    if (project?.mcpServers) {
      Object.entries(project.mcpServers).forEach(([name, config]) => {
        serverMap.set(name, { ...config, name, scope: 'project' });
      });
    }

    // Add local servers (highest precedence)
    if (local?.mcpServers) {
      Object.entries(local.mcpServers).forEach(([name, config]) => {
        serverMap.set(name, { ...config, name, scope: 'local' });
      });
    }

    return Array.from(serverMap.values());
  }

  // Private helper methods

  private async loadSettingsFile(filePath: string): Promise<McpConfig | null> {
    try {
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const settings = JSON.parse(content);
        // Settings files may have mcpServers at top level or nested
        if (settings.mcpServers) {
          return { mcpServers: settings.mcpServers };
        }
      }
    } catch (error) {
      McpService.logger.warn('McpService', `Failed to load settings from ${filePath}`, error as Error);
    }
    return null;
  }

  private async listServersFromConfigs(): Promise<McpServerInfo[]> {
    // Get current working directory
    const cwd = process.cwd();
    const configs = await this.loadAllConfigs(cwd);
    return this.mergeConfigs(configs.local, configs.project, configs.user);
  }

  private parseServerList(output: string): McpServerInfo[] {
    // Parse CLI output format
    // This is a placeholder - actual implementation depends on CLI output format
    const servers: McpServerInfo[] = [];
    
    // Example parsing logic (adjust based on actual CLI output)
    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.includes('Server:') || line.includes('Name:')) {
        // Extract server info from CLI output
        // This would need to be implemented based on actual format
      }
    }
    
    return servers;
  }

  private parseServerDetails(_output: string, name: string): McpServerInfo | null {
    // Parse CLI output for server details
    // This is a placeholder - actual implementation depends on CLI output format
    try {
      // Example: parse JSON output or formatted text
      const config: McpServerConfig = {
        command: '',
        args: []
      };
      
      return { ...config, name };
    } catch (error) {
      McpService.logger.error('McpService', `Failed to parse server details for ${name}`, error as Error);
      return null;
    }
  }
}

// Export singleton instance
export const mcpService = new McpService();