/**
 * Core service container for dependency injection
 * Provides a generic get() method for retrieving services
 */

import { Logger, getLogger } from './Logger';
import { ClaudeProcessManager } from '../services/ClaudeProcessManager';
import { StreamProcessor } from '../services/StreamProcessor';
import { SimpleStateManager } from '../state/SimpleStateManager';
import { ChunkedJSONParser } from '../services/ChunkedJSONParser';

type ServiceMap = {
  /**
   * Central logging service
   */
  Logger: Logger;
  /**
   * Manages Claude CLI process lifecycle
   */
  ClaudeProcessManager: ClaudeProcessManager;
  /**
   * Processes streaming responses from Claude
   */
  StreamProcessor: StreamProcessor;
  /**
   * Manages application state
   */
  StateManager: SimpleStateManager;
  /**
   * Parses chunked JSON responses
   */
  ChunkedJSONParser: ChunkedJSONParser;
};

/**
 * Singleton container for managing application services and dependencies
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private logger!: Logger; // Will be initialized in initializeWithOutputChannel

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Logger will be initialized later with output channel
    // Initialize services will be called after logger is set
  }

  /**
   * Initializes the service container with VS Code output channel
   * @param outputChannel - VS Code output channel for logging
   */
  public initializeWithOutputChannel(outputChannel: any): void {
    // Initialize core logger with output channel
    this.logger = getLogger(outputChannel);
    this.services.set('Logger', this.logger);
    this.services.set('OutputChannel', outputChannel);

    // Initialize services
    this.initializeServices();
  }

  /**
   * Initializes all core services
   */
  private initializeServices(): void {
    // Process management
    this.services.set('ClaudeProcessManager', new ClaudeProcessManager());

    // Stream processing
    this.services.set('StreamProcessor', new StreamProcessor(this.logger));
    this.services.set('ChunkedJSONParser', new ChunkedJSONParser(this.logger));

    // State management - will be set by extension.ts with context
    // this.services.set('StateManager', new SimpleStateManager(context));
  }

  /**
   * Set a service
   * @param name - Service name identifier
   * @param service - Service instance to register
   */
  public set(name: string, service: any): void {
    this.services.set(name, service);
  }

  /**
   * Get a service by type
   */
  public get<K extends keyof ServiceMap>(serviceType: K): ServiceMap[K];
  /**
   * Get a service by name
   */
  public get(serviceName: string): any;
  /**
   * Implementation of service retrieval
   * @param service - Service type or name
   * @returns The requested service instance
   */
  public get(service: any): any {
    if (typeof service === 'function' && service.name) {
      // Handle class constructor
      return this.services.get(service.name);
    }
    // Handle string name
    return this.services.get(service);
  }

  /**
   * Register a service
   * @param name - Service name identifier
   * @param service - Service instance to register
   */
  public register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get the singleton instance
   * @returns The ServiceContainer singleton
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}
