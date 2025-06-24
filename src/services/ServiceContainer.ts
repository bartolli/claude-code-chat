/**
 * Service container for dependency injection
 */

import { ClaudeProcessManager } from './ClaudeProcessManager';
import { FileService } from './FileService';
import { GitService } from './GitService';
import { ConfigService } from './ConfigService';
import { StateManager } from '../state/StateManager';
import { getLogger } from '../core/Logger';
import { StreamProcessor } from './StreamProcessor';
import { ChunkedJSONParser } from './ChunkedJSONParser';
import { ProgressiveUIUpdater } from './ProgressiveUIUpdater';
import { WebviewProtocol } from '../protocol/WebviewProtocol';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private static readonly logger = getLogger();

  public readonly processManager: ClaudeProcessManager;
  public readonly fileService: FileService;
  public readonly gitService: GitService;
  public readonly configService: ConfigService;
  public readonly stateManager: StateManager;
  public readonly streamProcessor: StreamProcessor;
  public readonly jsonParser: ChunkedJSONParser;
  public readonly uiUpdater: ProgressiveUIUpdater;
  public readonly webviewProtocol: WebviewProtocol;

  private constructor() {
    ServiceContainer.logger.info('ServiceContainer', 'Initializing services');
    
    this.processManager = new ClaudeProcessManager();
    this.fileService = new FileService();
    this.gitService = new GitService();
    this.configService = new ConfigService();
    this.stateManager = StateManager.getInstance();
    this.streamProcessor = new StreamProcessor(ServiceContainer.logger);
    this.jsonParser = new ChunkedJSONParser(ServiceContainer.logger);
    this.uiUpdater = new ProgressiveUIUpdater(ServiceContainer.logger);
    this.webviewProtocol = new WebviewProtocol(ServiceContainer.logger);
    
    ServiceContainer.logger.info('ServiceContainer', 'All services initialized');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Dispose all services
   */
  public dispose(): void {
    ServiceContainer.logger.info('ServiceContainer', 'Disposing services');
    
    // Terminate all Claude processes
    this.processManager.terminateAll().catch(error => {
      ServiceContainer.logger.error('ServiceContainer', 'Error terminating processes', error);
    });
    
    // Dispose config service
    this.configService.dispose();
    
    ServiceContainer.logger.info('ServiceContainer', 'Services disposed');
  }

  /**
   * Reset the container (mainly for testing)
   */
  public static reset(): void {
    if (ServiceContainer.instance) {
      ServiceContainer.instance.dispose();
      ServiceContainer.instance = undefined as any;
    }
  }
}