/**
 * Service for managing Claude CLI processes
 */

import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err } from '../core/Result';
import { ClaudeProcess, ClaudeProcessOptions } from '../types/claude';
import { mcpService } from './McpService';

/**
 * Options for spawning a Claude process
 */
export interface SpawnOptions extends ClaudeProcessOptions {
  /** Unique identifier for the Claude session */
  sessionId: string;
  /** Whether to use Windows Subsystem for Linux */
  useWsl?: boolean;
  /** WSL distribution name to use */
  wslDistro?: string;
  /** Path to Node.js executable in WSL */
  wslNodePath?: string;
  /** Path to Claude executable in WSL */
  wslClaudePath?: string;
  /** Optional abort controller for cancellation */
  abortController?: AbortController;
}

/**
 * Manages Claude CLI processes, handles spawning, termination, and abort control
 */
export class ClaudeProcessManager {
  private static readonly logger = getLogger();
  /** Active Claude processes by session ID */
  private processes: Map<string, ClaudeProcess> = new Map();
  /** Abort controllers for cancelling processes by session ID */
  private abortControllers: Map<string, AbortController> = new Map(); // TODO: Test abort controller creation and storage

  /**
   * Spawn a new Claude process
   * @param options - Configuration for spawning the process
   * @returns Result containing the spawned process or an error
   */
  public async spawn(options: SpawnOptions): Promise<Result<ClaudeProcess, ApplicationError>> {
    const { sessionId, model, cwd, resumeSession, verbose, dangerouslySkipPermissions, useWsl } =
      options;

    ClaudeProcessManager.logger.info(
      'ClaudeProcessManager',
      `Spawning Claude process for session ${sessionId}`,
      {
        model,
        cwd,
        resumeSession,
        useWsl,
      }
    );

    try {
      // Create or use provided AbortController
      const abortController = options.abortController || new AbortController();
      // TODO: Test passing custom abort controller

      // Store the abort controller for this session
      this.abortControllers.set(sessionId, abortController);
      // TODO: Verify controller is accessible after spawn

      ClaudeProcessManager.logger.info(
        'ClaudeProcessManager',
        `Created/stored AbortController for session ${sessionId}`,
        {
          isCustomController: options.abortController !== undefined,
          totalControllers: this.abortControllers.size,
        }
      );

      const args = this.buildArguments(options);
      const spawnOptions = this.buildSpawnOptions(cwd, abortController.signal);

      let claudeProcess: cp.ChildProcess;

      if (useWsl && options.wslDistro) {
        claudeProcess = await this.spawnWslProcess(options, args, spawnOptions);
      } else {
        claudeProcess = cp.spawn('claude', args, spawnOptions);
      }

      if (!claudeProcess.pid) {
        throw new ApplicationError(
          'Failed to spawn Claude process',
          ErrorCodes.CLAUDE_PROCESS_FAILED,
          'ClaudeProcessManager'
        );
      }

      const process: ClaudeProcess = {
        id: sessionId,
        pid: claudeProcess.pid,
        stdin: claudeProcess.stdin!,
        stdout: claudeProcess.stdout!,
        stderr: claudeProcess.stderr!,
        kill: (signal?: NodeJS.Signals) => claudeProcess.kill(signal),
        on: (event: string, listener: (...args: any[]) => void) => {
          claudeProcess.on(event, listener);
        },
      };

      this.processes.set(sessionId, process);

      // Add abort event listener
      abortController.signal.addEventListener('abort', () => {
        ClaudeProcessManager.logger.info(
          'ClaudeProcessManager',
          `Abort signal received for session ${sessionId}`
        );
        // TODO: Test abort event fires when controller.abort() called

        // Implement cleanup on abort
        if (claudeProcess && !claudeProcess.killed) {
          ClaudeProcessManager.logger.info(
            'ClaudeProcessManager',
            `Sending SIGTERM to process ${claudeProcess.pid}`
          );
          claudeProcess.kill('SIGTERM');
          // TODO: Test process receives SIGTERM on abort
        }
      });

      // Clean up abort controller on process exit
      claudeProcess.on('exit', (code, signal) => {
        ClaudeProcessManager.logger.info(
          'ClaudeProcessManager',
          `Process exited for session ${sessionId}`,
          {
            code,
            signal,
            wasAborted: abortController.signal.aborted,
          }
        );

        // Clean up the process and abort controller
        this.processes.delete(sessionId);
        this.abortControllers.delete(sessionId);
        // TODO: Test no memory leaks after abort
      });

      // Verify abort controller is accessible after spawn
      const verifyController = this.getAbortController(sessionId);
      ClaudeProcessManager.logger.info(
        'ClaudeProcessManager',
        `Claude process spawned successfully`,
        {
          sessionId,
          pid: process.pid,
          abortControllerAccessible: verifyController !== undefined,
          abortControllerValid: verifyController instanceof AbortController,
        }
      );

      return ok(process);
    } catch (error) {
      const appError =
        error instanceof ApplicationError
          ? error
          : new ApplicationError(
              `Failed to spawn Claude process: ${error instanceof Error ? error.message : String(error)}`,
              ErrorCodes.CLAUDE_PROCESS_FAILED,
              'ClaudeProcessManager'
            );

      ClaudeProcessManager.logger.error(
        'ClaudeProcessManager',
        'Failed to spawn Claude process',
        appError
      );
      return err(appError);
    }
  }

  /**
   * Terminate a Claude process
   * @param sessionId - ID of the session to terminate
   * @returns Result indicating success or error
   */
  public async terminate(sessionId: string): Promise<Result<void, ApplicationError>> {
    const process = this.processes.get(sessionId);

    if (!process) {
      return err(
        new ApplicationError(
          `No process found for session ${sessionId}`,
          ErrorCodes.NOT_FOUND,
          'ClaudeProcessManager'
        )
      );
    }

    ClaudeProcessManager.logger.info('ClaudeProcessManager', `Terminating Claude process`, {
      sessionId,
      pid: process.pid,
    });

    return ErrorBoundary.execute(
      async () => {
        // Try graceful shutdown first
        process.kill('SIGTERM');

        // Wait for process to exit
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if not terminated
            process.kill('SIGKILL');
            resolve();
          }, 5000);

          process.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        this.processes.delete(sessionId);
        this.abortControllers.delete(sessionId); // Clean up abort controller
        ClaudeProcessManager.logger.info('ClaudeProcessManager', `Claude process terminated`, {
          sessionId,
        });
      },
      {
        category: 'ClaudeProcessManager',
        retryable: false,
      }
    )
      .then(() => ok(undefined))
      .catch((error) => err(error as ApplicationError));
  }

  /**
   * Get a process by session ID
   * @param sessionId - ID of the session to retrieve
   * @returns The Claude process if found, undefined otherwise
   */
  public getProcess(sessionId: string): ClaudeProcess | undefined {
    return this.processes.get(sessionId);
  }

  /**
   * Get an abort controller by session ID
   * @param sessionId - ID of the session to get abort controller for
   * @returns The abort controller if found, undefined otherwise
   */
  public getAbortController(sessionId: string): AbortController | undefined {
    // TODO: Test retrieval of non-existent session
    const controller = this.abortControllers.get(sessionId);
    ClaudeProcessManager.logger.debug(
      'ClaudeProcessManager',
      `Getting abort controller for session ${sessionId}`,
      {
        found: controller !== undefined,
        totalControllers: this.abortControllers.size,
      }
    );
    return controller;
  }

  /**
   * Get all active processes
   * @returns Map of all active Claude processes by session ID
   */
  public getActiveProcesses(): Map<string, ClaudeProcess> {
    return new Map(this.processes);
  }

  /**
   * Check if a process is active
   * @param sessionId - ID of the session to check
   * @returns True if the process is active, false otherwise
   */
  public isProcessActive(sessionId: string): boolean {
    return this.processes.has(sessionId);
  }

  /**
   * Terminate all processes
   * @returns Promise that resolves when all processes are terminated
   */
  public async terminateAll(): Promise<void> {
    const promises = Array.from(this.processes.keys()).map((sessionId) =>
      this.terminate(sessionId)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Build command line arguments for the Claude process
   * @param options - Spawn options containing process configuration
   * @returns Array of command line arguments
   */
  private buildArguments(options: SpawnOptions): string[] {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.resumeSession) {
      // Special case: if resumeSession is 'continue', use --continue flag
      if (options.resumeSession === 'continue') {
        args.push('--continue');
      } else {
        args.push('--resume', options.resumeSession);
      }
    }

    if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    // Add MCP config flag using McpService
    const workingDir = options.cwd || process.cwd();
    const mcpFlags = mcpService.getMcpConfigFlag(workingDir);
    if (mcpFlags.length > 0) {
      args.push(...mcpFlags);
      ClaudeProcessManager.logger.info('ClaudeProcessManager', 'Adding MCP config flags', {
        flags: mcpFlags,
      });
    }

    return args;
  }

  /**
   * Build spawn options for the child process
   * @param cwd - Working directory for the process
   * @param signal - Abort signal for process cancellation
   * @returns Child process spawn options
   */
  private buildSpawnOptions(cwd?: string, signal?: AbortSignal): cp.SpawnOptions {
    const options: cp.SpawnOptions = {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
    };

    // Add abort signal if provided
    if (signal) {
      options.signal = signal;
      // TODO: Test signal is properly passed to spawn
    }

    return options;
  }

  /**
   * Spawn a Claude process through WSL
   * @param options - Spawn options with WSL configuration
   * @param args - Command line arguments for Claude
   * @param spawnOptions - Child process spawn options
   * @returns The spawned WSL child process
   */
  private async spawnWslProcess(
    options: SpawnOptions,
    args: string[],
    spawnOptions: cp.SpawnOptions
  ): Promise<cp.ChildProcess> {
    const { wslDistro, wslNodePath, wslClaudePath } = options;

    const wslArgs = [
      '-d',
      wslDistro!,
      '--',
      wslNodePath || '/usr/bin/node',
      wslClaudePath || '/usr/local/bin/claude',
      ...args,
    ];

    ClaudeProcessManager.logger.debug('ClaudeProcessManager', 'Spawning WSL process', {
      distro: wslDistro,
      args: wslArgs,
    });

    return cp.spawn('wsl', wslArgs, spawnOptions);
  }
}
