/**
 * Service for managing Claude CLI processes
 */

import * as cp from 'child_process';
import { getLogger } from '../core/Logger';
import { ErrorBoundary, ApplicationError, ErrorCodes } from '../core/ErrorBoundary';
import { Result, ok, err } from '../core/Result';
import { ClaudeProcess, ClaudeProcessOptions } from '../types/claude';

export interface SpawnOptions extends ClaudeProcessOptions {
  sessionId: string;
  useWsl?: boolean;
  wslDistro?: string;
  wslNodePath?: string;
  wslClaudePath?: string;
}

export class ClaudeProcessManager {
  private static readonly logger = getLogger();
  private processes: Map<string, ClaudeProcess> = new Map();

  /**
   * Spawn a new Claude process
   */
  public async spawn(options: SpawnOptions): Promise<Result<ClaudeProcess, ApplicationError>> {
    const { sessionId, model, cwd, resumeSession, verbose, dangerouslySkipPermissions, useWsl } = options;
    
    ClaudeProcessManager.logger.info('ClaudeProcessManager', `Spawning Claude process for session ${sessionId}`, {
      model,
      cwd,
      resumeSession,
      useWsl
    });

    try {
      const args = this.buildArguments(options);
      const spawnOptions = this.buildSpawnOptions(cwd);
      
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
        }
      };

      this.processes.set(sessionId, process);
      
      ClaudeProcessManager.logger.info('ClaudeProcessManager', `Claude process spawned successfully`, {
        sessionId,
        pid: process.pid
      });

      return ok(process);
    } catch (error) {
      const appError = error instanceof ApplicationError 
        ? error 
        : new ApplicationError(
            `Failed to spawn Claude process: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCodes.CLAUDE_PROCESS_FAILED,
            'ClaudeProcessManager'
          );
      
      ClaudeProcessManager.logger.error('ClaudeProcessManager', 'Failed to spawn Claude process', appError);
      return err(appError);
    }
  }

  /**
   * Terminate a Claude process
   */
  public async terminate(sessionId: string): Promise<Result<void, ApplicationError>> {
    const process = this.processes.get(sessionId);
    
    if (!process) {
      return err(new ApplicationError(
        `No process found for session ${sessionId}`,
        ErrorCodes.NOT_FOUND,
        'ClaudeProcessManager'
      ));
    }

    ClaudeProcessManager.logger.info('ClaudeProcessManager', `Terminating Claude process`, {
      sessionId,
      pid: process.pid
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
        ClaudeProcessManager.logger.info('ClaudeProcessManager', `Claude process terminated`, { sessionId });
      },
      {
        category: 'ClaudeProcessManager',
        retryable: false
      }
    ).then(() => ok(undefined))
     .catch(error => err(error as ApplicationError));
  }

  /**
   * Get a process by session ID
   */
  public getProcess(sessionId: string): ClaudeProcess | undefined {
    return this.processes.get(sessionId);
  }

  /**
   * Get all active processes
   */
  public getActiveProcesses(): Map<string, ClaudeProcess> {
    return new Map(this.processes);
  }

  /**
   * Check if a process is active
   */
  public isProcessActive(sessionId: string): boolean {
    return this.processes.has(sessionId);
  }

  /**
   * Terminate all processes
   */
  public async terminateAll(): Promise<void> {
    const promises = Array.from(this.processes.keys()).map(sessionId => 
      this.terminate(sessionId)
    );
    
    await Promise.allSettled(promises);
  }

  private buildArguments(options: SpawnOptions): string[] {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    
    if (options.model) {
      args.push('--model', options.model);
    }
    
    if (options.resumeSession) {
      args.push('--resume', options.resumeSession);
    }
    
    if (options.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }
    
    return args;
  }

  private buildSpawnOptions(cwd?: string): cp.SpawnOptions {
    return {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        FORCE_COLOR: '0',
        NO_COLOR: '1' 
      }
    };
  }

  private async spawnWslProcess(
    options: SpawnOptions,
    args: string[],
    spawnOptions: cp.SpawnOptions
  ): Promise<cp.ChildProcess> {
    const { wslDistro, wslNodePath, wslClaudePath } = options;
    
    const wslArgs = [
      '-d', wslDistro!,
      '--', wslNodePath || '/usr/bin/node',
      wslClaudePath || '/usr/local/bin/claude',
      ...args
    ];

    ClaudeProcessManager.logger.debug('ClaudeProcessManager', 'Spawning WSL process', {
      distro: wslDistro,
      args: wslArgs
    });

    return cp.spawn('wsl', wslArgs, spawnOptions);
  }
}