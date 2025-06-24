/**
 * Service for file operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err } from '../core/Result';

export interface Conversation {
  path: string;
  content: string;
  timestamp: number;
}

export interface ConversationIndex {
  conversationsByDate: ConversationInfo[];
}

export interface ConversationInfo {
  firstUserMessage: string;
  timestamp: number;
  filename: string;
}

export class FileService {
  private static readonly logger = getLogger();
  private static readonly CONVERSATIONS_DIR = '.claude-code-chat';
  private static readonly INDEX_FILE = '.claude-code-chat-index.json';

  /**
   * Save a conversation to file
   */
  public async saveConversation(
    content: string,
    workspaceFolder?: string
  ): Promise<Result<string, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        if (!workspaceFolder) {
          throw new ApplicationError(
            'No workspace folder available',
            ErrorCodes.NOT_FOUND,
            'FileService'
          );
        }

        const conversationsDir = path.join(workspaceFolder, FileService.CONVERSATIONS_DIR);
        
        // Ensure directory exists
        await fs.mkdir(conversationsDir, { recursive: true });
        
        // Generate filename with timestamp
        const timestamp = new Date();
        const filename = `conversation-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}.md`;
        const filePath = path.join(conversationsDir, filename);
        
        // Write content
        await fs.writeFile(filePath, content, 'utf-8');
        
        FileService.logger.info('FileService', 'Conversation saved', { filePath });
        
        // Update index
        await this.updateConversationIndex(workspaceFolder, filename, content);
        
        return filePath;
      },
      {
        category: 'FileService',
        retryable: true,
        retryCount: 2
      }
    ).then(result => ok(result))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * Load a conversation from file
   */
  public async loadConversation(filePath: string): Promise<Result<Conversation, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        FileService.logger.info('FileService', 'Conversation loaded', { filePath });
        
        return {
          path: filePath,
          content,
          timestamp: stats.mtime.getTime()
        };
      },
      {
        category: 'FileService',
        retryable: true
      }
    ).then(result => ok(result))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * Get workspace folder path
   */
  public getWorkspaceFolder(): string | undefined {
    const workspaces = vscode.workspace.workspaceFolders;
    return workspaces && workspaces.length > 0 && workspaces[0] ? workspaces[0].uri.fsPath : undefined;
  }

  /**
   * Get conversation index
   */
  public async getConversationIndex(workspaceFolder?: string): Promise<Result<ConversationIndex, ApplicationError>> {
    if (!workspaceFolder) {
      return ok({ conversationsByDate: [] });
    }

    const indexPath = path.join(workspaceFolder, FileService.CONVERSATIONS_DIR, FileService.INDEX_FILE);
    
    return ErrorBoundary.execute(
      async () => {
        try {
          const content = await fs.readFile(indexPath, 'utf-8');
          return JSON.parse(content) as ConversationIndex;
        } catch (error) {
          // If file doesn't exist, return empty index
          if ((error as any).code === 'ENOENT') {
            return { conversationsByDate: [] };
          }
          throw error;
        }
      },
      {
        category: 'FileService',
        retryable: true
      }
    ).then(result => ok(result))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * List all conversations
   */
  public async listConversations(workspaceFolder?: string): Promise<Result<string[], ApplicationError>> {
    if (!workspaceFolder) {
      return ok([]);
    }

    const conversationsDir = path.join(workspaceFolder, FileService.CONVERSATIONS_DIR);
    
    return ErrorBoundary.execute(
      async () => {
        try {
          const files = await fs.readdir(conversationsDir);
          return files
            .filter(file => file.startsWith('conversation-') && file.endsWith('.md'))
            .map(file => path.join(conversationsDir, file));
        } catch (error) {
          // If directory doesn't exist, return empty array
          if ((error as any).code === 'ENOENT') {
            return [];
          }
          throw error;
        }
      },
      {
        category: 'FileService',
        retryable: true
      }
    ).then(result => ok(result))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * Update conversation index
   */
  private async updateConversationIndex(
    workspaceFolder: string,
    filename: string,
    content: string
  ): Promise<void> {
    const indexPath = path.join(workspaceFolder, FileService.CONVERSATIONS_DIR, FileService.INDEX_FILE);
    
    // Extract first user message
    const firstUserMessage = this.extractFirstUserMessage(content);
    
    // Load existing index
    const indexResult = await this.getConversationIndex(workspaceFolder);
    const index = indexResult.ok ? indexResult.value : { conversationsByDate: [] };
    
    // Add new conversation
    index.conversationsByDate.unshift({
      firstUserMessage,
      timestamp: Date.now(),
      filename
    });
    
    // Keep only last 100 conversations
    index.conversationsByDate = index.conversationsByDate.slice(0, 100);
    
    // Save updated index
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    FileService.logger.info('FileService', 'Conversation index updated', { 
      totalConversations: index.conversationsByDate.length 
    });
  }

  /**
   * Extract first user message from conversation content
   */
  private extractFirstUserMessage(content: string): string {
    const lines = content.split('\n');
    let inUserSection = false;
    let message = '';
    
    for (const line of lines) {
      if (line.startsWith('## User')) {
        inUserSection = true;
        continue;
      }
      
      if (inUserSection && line.startsWith('## ')) {
        break;
      }
      
      if (inUserSection && line.trim()) {
        message = line.trim();
        break;
      }
    }
    
    return message || 'Untitled conversation';
  }

  /**
   * Ensure a directory exists
   */
  public async ensureDirectory(dirPath: string): Promise<Result<void, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        await fs.mkdir(dirPath, { recursive: true });
        FileService.logger.debug('FileService', 'Directory ensured', { dirPath });
      },
      {
        category: 'FileService',
        retryable: true
      }
    ).then(() => ok(undefined))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * Check if a file exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}