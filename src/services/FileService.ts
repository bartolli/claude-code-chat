/**
 * Service for file operations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err } from '../core/Result';

/**
 * Represents a conversation stored in the file system
 */
export interface Conversation {
  /** File path of the conversation */
  path: string;
  /** Content of the conversation */
  content: string;
  /** Timestamp when the conversation was last modified */
  timestamp: number;
}

/**
 * Index structure for tracking conversations
 */
export interface ConversationIndex {
  /** List of conversations sorted by date */
  conversationsByDate: ConversationInfo[];
}

/**
 * Metadata for a conversation in the index
 */
export interface ConversationInfo {
  /** First user message in the conversation */
  firstUserMessage: string;
  /** Creation timestamp of the conversation */
  timestamp: number;
  /** Filename of the conversation */
  filename: string;
}

/**
 * Service for managing conversation files and file operations
 */
export class FileService {
  private static readonly logger = getLogger();
  /** Directory name for storing conversations */
  private static readonly CONVERSATIONS_DIR = '.claude-code-chat';
  /** Filename for the conversation index */
  private static readonly INDEX_FILE = '.claude-code-chat-index.json';

  /**
   * Save a conversation to file
   * @param content - The conversation content to save
   * @param workspaceFolder - Optional workspace folder path
   * @returns Result containing the file path or an error
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
        retryCount: 2,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Load a conversation from file
   * @param filePath - Path to the conversation file
   * @returns Result containing the conversation data or an error
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
          timestamp: stats.mtime.getTime(),
        };
      },
      {
        category: 'FileService',
        retryable: true,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Get workspace folder path
   * @returns The workspace folder path or undefined if no workspace is open
   */
  public getWorkspaceFolder(): string | undefined {
    const workspaces = vscode.workspace.workspaceFolders;
    return workspaces && workspaces.length > 0 && workspaces[0]
      ? workspaces[0].uri.fsPath
      : undefined;
  }

  /**
   * Get conversation index
   * @param workspaceFolder - Optional workspace folder path
   * @returns Result containing the conversation index or an error
   */
  public async getConversationIndex(
    workspaceFolder?: string
  ): Promise<Result<ConversationIndex, ApplicationError>> {
    if (!workspaceFolder) {
      return ok({ conversationsByDate: [] });
    }

    const indexPath = path.join(
      workspaceFolder,
      FileService.CONVERSATIONS_DIR,
      FileService.INDEX_FILE
    );

    return ErrorBoundary.execute(
      async () => {
        try {
          const content = await fs.readFile(indexPath, 'utf-8');
          return JSON.parse(content) as ConversationIndex;
        } catch (error) {
          // If file doesn't exist, return empty index
          if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            return { conversationsByDate: [] };
          }
          throw error;
        }
      },
      {
        category: 'FileService',
        retryable: true,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * List all conversations
   * @param workspaceFolder - Optional workspace folder path
   * @returns Result containing array of conversation file paths or an error
   */
  public async listConversations(
    workspaceFolder?: string
  ): Promise<Result<string[], ApplicationError>> {
    if (!workspaceFolder) {
      return ok([]);
    }

    const conversationsDir = path.join(workspaceFolder, FileService.CONVERSATIONS_DIR);

    return ErrorBoundary.execute(
      async () => {
        try {
          const files = await fs.readdir(conversationsDir);
          return files
            .filter((file) => file.startsWith('conversation-') && file.endsWith('.md'))
            .map((file) => path.join(conversationsDir, file));
        } catch (error) {
          // If directory doesn't exist, return empty array
          if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            return [];
          }
          throw error;
        }
      },
      {
        category: 'FileService',
        retryable: true,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Update conversation index
   * @param workspaceFolder - Workspace folder path
   * @param filename - Filename of the new conversation
   * @param content - Content of the conversation
   * @returns Promise that resolves when index is updated
   */
  private async updateConversationIndex(
    workspaceFolder: string,
    filename: string,
    content: string
  ): Promise<void> {
    const indexPath = path.join(
      workspaceFolder,
      FileService.CONVERSATIONS_DIR,
      FileService.INDEX_FILE
    );

    // Extract first user message
    const firstUserMessage = this.extractFirstUserMessage(content);

    // Load existing index
    const indexResult = await this.getConversationIndex(workspaceFolder);
    const index = indexResult.ok ? indexResult.value : { conversationsByDate: [] };

    // Add new conversation
    index.conversationsByDate.unshift({
      firstUserMessage,
      timestamp: Date.now(),
      filename,
    });

    // Keep only last 100 conversations
    index.conversationsByDate = index.conversationsByDate.slice(0, 100);

    // Save updated index
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');

    FileService.logger.info('FileService', 'Conversation index updated', {
      totalConversations: index.conversationsByDate.length,
    });
  }

  /**
   * Extract first user message from conversation content
   * @param content - The conversation content
   * @returns The first user message or 'Untitled conversation'
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
   * @param dirPath - Path to the directory
   * @returns Result indicating success or error
   */
  public async ensureDirectory(dirPath: string): Promise<Result<void, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        await fs.mkdir(dirPath, { recursive: true });
        FileService.logger.debug('FileService', 'Directory ensured', { dirPath });
      },
      {
        category: 'FileService',
        retryable: true,
      }
    )
      .then(() => ok(undefined))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Check if a file exists
   * @param filePath - Path to the file
   * @returns True if the file exists, false otherwise
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
