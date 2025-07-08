/**
 * Service for Git operations
 */

import * as cp from 'child_process';
import * as util from 'util';
import { getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err } from '../core/Result';

const exec = util.promisify(cp.exec);

/**
 * Represents the Git status of a directory
 */
export interface GitStatus {
  /** Indicates whether the directory is a Git repository */
  isGitRepo: boolean;
  /** Indicates whether there are uncommitted changes */
  hasChanges: boolean;
  /** The current Git branch name */
  branch?: string;
  /** List of modified file paths */
  modifiedFiles?: string[];
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  /** Indicates whether the backup was successful */
  success: boolean;
  /** The hash of the created commit */
  commitHash?: string;
  /** The commit message or status message */
  message?: string;
}

/**
 * Service for performing Git operations including status checking, backups, and repository management
 */
export class GitService {
  private static readonly logger = getLogger();
  private gitAvailable?: boolean;

  /**
   * Check if Git is installed on the system
   * @returns Promise resolving to true if Git is installed, false otherwise
   */
  public async isGitInstalled(): Promise<boolean> {
    if (this.gitAvailable !== undefined) {
      return this.gitAvailable;
    }

    return ErrorBoundary.execute(
      async () => {
        await exec('git --version');
        this.gitAvailable = true;
        GitService.logger.info('GitService', 'Git is installed');
        return true;
      },
      {
        category: 'GitService',
        fallback: () => {
          this.gitAvailable = false;
          GitService.logger.warn('GitService', 'Git is not installed');
          return false;
        },
      }
    );
  }

  /**
   * Check Git status in a directory
   * @param cwd The directory path to check
   * @returns Promise resolving to a Result containing GitStatus or an ApplicationError
   */
  public async getStatus(cwd: string): Promise<Result<GitStatus, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        // Check if it's a git repository
        try {
          await exec('git rev-parse --git-dir', { cwd });
        } catch {
          return {
            isGitRepo: false,
            hasChanges: false,
          };
        }

        // Get current branch
        const { stdout: branch } = await exec('git branch --show-current', { cwd });

        // Check for changes
        const { stdout: status } = await exec('git status --porcelain', { cwd });
        const hasChanges = status.trim().length > 0;

        // Get modified files if any
        const modifiedFiles: string[] | undefined = hasChanges
          ? status
              .trim()
              .split('\n')
              .map((line) => line.substring(3))
          : undefined;

        GitService.logger.debug('GitService', 'Git status retrieved', {
          cwd,
          branch: branch.trim(),
          hasChanges,
          fileCount: modifiedFiles?.length,
        });

        const result: GitStatus = {
          isGitRepo: true,
          hasChanges,
          branch: branch.trim(),
        };

        if (modifiedFiles !== undefined) {
          result.modifiedFiles = modifiedFiles;
        }

        return result;
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Create a backup commit with all current changes
   * @param cwd The directory path where to create the backup
   * @param message Optional custom commit message
   * @returns Promise resolving to a Result containing BackupResult or an ApplicationError
   */
  public async createBackup(
    cwd: string,
    message?: string
  ): Promise<Result<BackupResult, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        // Check if Git is available
        if (!(await this.isGitInstalled())) {
          throw new ApplicationError(
            'Git is not installed',
            ErrorCodes.GIT_NOT_INSTALLED,
            'GitService'
          );
        }

        // Check Git status
        const statusResult = await this.getStatus(cwd);
        if (!statusResult.ok) {
          throw statusResult.error;
        }

        const status = statusResult.value;
        if (!status.isGitRepo) {
          throw new ApplicationError(
            'Not a Git repository',
            ErrorCodes.GIT_NOT_INITIALIZED,
            'GitService'
          );
        }

        if (!status.hasChanges) {
          GitService.logger.info('GitService', 'No changes to commit');
          return {
            success: true,
            message: 'No changes to commit',
          };
        }

        // Stage all changes
        await exec('git add -A', { cwd });
        GitService.logger.debug('GitService', 'Staged all changes');

        // Create commit
        const timestamp = new Date().toISOString();
        const commitMessage = message || `Claude Code backup - ${timestamp}`;

        const { stdout } = await exec(`git commit -m "${commitMessage}"`, { cwd });

        // Extract commit hash
        const hashMatch = stdout.match(/\[[\w\s]+\s+([a-f0-9]+)\]/);
        const commitHash = hashMatch ? hashMatch[1] : undefined;

        GitService.logger.info('GitService', 'Backup commit created', {
          commitHash,
          filesChanged: status.modifiedFiles?.length,
        });

        const result: BackupResult = {
          success: true,
          message: commitMessage,
        };

        if (commitHash !== undefined) {
          result.commitHash = commitHash;
        }

        return result;
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Initialize a new Git repository in the specified directory
   * @param cwd The directory path where to initialize the repository
   * @returns Promise resolving to a Result containing void or an ApplicationError
   */
  public async initRepository(cwd: string): Promise<Result<void, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        if (!(await this.isGitInstalled())) {
          throw new ApplicationError(
            'Git is not installed',
            ErrorCodes.GIT_NOT_INSTALLED,
            'GitService'
          );
        }

        await exec('git init', { cwd });
        GitService.logger.info('GitService', 'Git repository initialized', { cwd });
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then(() => ok(undefined))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Get the hash of the last commit in the repository
   * @param cwd The directory path of the Git repository
   * @returns Promise resolving to a Result containing the commit hash or an ApplicationError
   */
  public async getLastCommitHash(cwd: string): Promise<Result<string, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        const { stdout } = await exec('git rev-parse HEAD', { cwd });
        return stdout.trim();
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then((result) => ok(result))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Check if there are uncommitted changes in the repository
   * @param cwd The directory path of the Git repository
   * @returns Promise resolving to true if there are uncommitted changes, false otherwise
   */
  public async hasUncommittedChanges(cwd: string): Promise<boolean> {
    const statusResult = await this.getStatus(cwd);
    return statusResult.ok ? statusResult.value.hasChanges : false;
  }

  /**
   * Create a stash of current changes in the repository
   * @param cwd The directory path of the Git repository
   * @param message Optional custom stash message
   * @returns Promise resolving to a Result containing void or an ApplicationError
   */
  public async stashChanges(
    cwd: string,
    message?: string
  ): Promise<Result<void, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        const stashMessage = message || `Claude Code stash - ${new Date().toISOString()}`;
        await exec(`git stash push -m "${stashMessage}"`, { cwd });
        GitService.logger.info('GitService', 'Changes stashed', { message: stashMessage });
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then(() => ok(undefined))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Apply the latest stash and remove it from the stash list
   * @param cwd The directory path of the Git repository
   * @returns Promise resolving to a Result containing void or an ApplicationError
   */
  public async popStash(cwd: string): Promise<Result<void, ApplicationError>> {
    return ErrorBoundary.execute(
      async () => {
        await exec('git stash pop', { cwd });
        GitService.logger.info('GitService', 'Stash applied');
      },
      {
        category: 'GitService',
        retryable: false,
      }
    )
      .then(() => ok(undefined))
      .catch((error) => err(error as ApplicationError));
  }
}
