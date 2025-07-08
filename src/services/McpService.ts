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

/**
 * Extended MCP server information including name and status
 */
export interface McpServerInfo extends McpServerConfig {
  /** Server name identifier */
  name: string;
  /** Configuration scope where the server is defined */
  scope?: 'local' | 'project' | 'user';
  /** Current connection status */
  status?: 'connected' | 'disconnected' | 'error';
}

/**
 * Service for managing MCP server configurations and interactions
 */
export class McpService {
  private static readonly logger = getLogger();
  /** Promisified exec for async command execution */
  private execAsync = promisify(exec);

  /**
   * List all configured MCP servers
   * @param scope - Optional scope to filter servers
   * @param cwd - Optional working directory for command execution
   * @returns Array of MCP server information
   */
  async listServers(scope?: 'local' | 'project' | 'user', cwd?: string): Promise<McpServerInfo[]> {
    try {
      const cmd = scope ? `claude mcp list -s ${scope}` : 'claude mcp list';
      McpService.logger.info('McpService', `Executing: ${cmd} in ${cwd || 'current directory'}`);

      const options = cwd ? { cwd } : undefined;
      const { stdout, stderr } = await this.execAsync(cmd, options);
      McpService.logger.info('McpService', `CLI stdout: "${stdout}"`);
      if (stderr) {
        McpService.logger.warn('McpService', `CLI stderr: ${stderr}`);
      }

      const servers = this.parseServerList(stdout.toString());
      McpService.logger.info('McpService', `Parsed ${servers.length} servers from output`);
      return servers;
    } catch (error) {
      McpService.logger.error('McpService', 'Failed to list MCP servers', error as Error);
      // Fall back to reading config files directly
      return this.listServersFromConfigs();
    }
  }

  /**
   * Get details for a specific MCP server
   * @param name - Name of the server to retrieve
   * @returns Server information or null if not found
   */
  async getServer(name: string): Promise<McpServerInfo | null> {
    try {
      const { stdout } = await this.execAsync(`claude mcp get ${name}`);
      return this.parseServerDetails(stdout, name);
    } catch (error) {
      McpService.logger.error('McpService', `Failed to get MCP server ${name}`, error as Error);
      // Fall back to reading from configs
      const servers = await this.listServersFromConfigs();
      return servers.find((s) => s.name === name) || null;
    }
  }

  /**
   * Load MCP configuration from project
   * @param projectPath - Path to the project directory
   * @returns MCP configuration or null if not found
   */
  async loadMcpConfig(projectPath: string): Promise<McpConfig | null> {
    const mcpJsonPath = path.join(projectPath, '.mcp.json');

    try {
      if (fs.existsSync(mcpJsonPath)) {
        const content = await fs.promises.readFile(mcpJsonPath, 'utf-8');
        const config = JSON.parse(content) as McpConfig;
        McpService.logger.info('McpService', `Loaded MCP config from ${mcpJsonPath}`, {
          serverCount: Object.keys(config.mcpServers || {}).length,
        });
        return config;
      }
    } catch (error) {
      McpService.logger.error(
        'McpService',
        `Failed to load MCP config from ${mcpJsonPath}`,
        error as Error
      );
    }

    return null;
  }

  /**
   * Get MCP config flag for CLI
   * @param projectPath - Path to the project directory
   * @returns Array of CLI flags for MCP configuration
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
   * @param projectPath - Path to the project directory
   * @returns Object containing configurations from all scopes
   */
  async loadAllConfigs(projectPath: string): Promise<{
    /**
     *
     */
    local: McpConfig | null;
    /**
     *
     */
    project: McpConfig | null;
    /**
     *
     */
    user: McpConfig | null;
  }> {
    const configs = {
      local: null as McpConfig | null,
      project: null as McpConfig | null,
      user: null as McpConfig | null,
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
   * @param local - Local scope configuration
   * @param project - Project scope configuration
   * @param user - User scope configuration
   * @returns Merged array of server configurations
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

  /**
   * Load settings from a JSON file
   * @param filePath - Path to the settings file
   * @returns MCP configuration from the file or null
   */
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
      McpService.logger.warn(
        'McpService',
        `Failed to load settings from ${filePath}`,
        error as Error
      );
    }
    return null;
  }

  /**
   * List servers by reading configuration files directly
   * @returns Array of MCP server information from all configs
   */
  private async listServersFromConfigs(): Promise<McpServerInfo[]> {
    // Get current working directory
    const cwd = process.cwd();
    const configs = await this.loadAllConfigs(cwd);
    return this.mergeConfigs(configs.local, configs.project, configs.user);
  }

  /**
   * Parse server list from CLI output
   * @param output - CLI command output
   * @returns Array of parsed server information
   */
  private parseServerList(output: string): McpServerInfo[] {
    // Parse CLI output format: "name: command args..."
    const servers: McpServerInfo[] = [];

    const lines = output
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim();
        const commandAndArgs = line.substring(colonIndex + 1).trim();

        // Extract command and args
        const parts = commandAndArgs.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        servers.push({
          name,
          command,
          args: args.length > 0 ? args : undefined,
          status: 'disconnected', // Default status, will be updated when Claude connects
        });
      }
    }

    return servers;
  }

  /**
   * Parse server details from CLI output
   * @param _output - CLI command output (currently unused)
   * @param name - Server name
   * @returns Parsed server information or null
   */
  private parseServerDetails(_output: string, name: string): McpServerInfo | null {
    // Parse CLI output for server details
    // This is a placeholder - actual implementation depends on CLI output format
    try {
      // Example: parse JSON output or formatted text
      const config: McpServerConfig = {
        command: '',
        args: [],
      };

      return { ...config, name };
    } catch (error) {
      McpService.logger.error(
        'McpService',
        `Failed to parse server details for ${name}`,
        error as Error
      );
      return null;
    }
  }
}

// Export singleton instance
export const mcpService = new McpService();
