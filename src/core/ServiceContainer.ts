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
    Logger: Logger;
    ClaudeProcessManager: ClaudeProcessManager;
    StreamProcessor: StreamProcessor;
    StateManager: SimpleStateManager;
    ChunkedJSONParser: ChunkedJSONParser;
};

export class ServiceContainer {
    private static instance: ServiceContainer;
    private services: Map<string, any> = new Map();
    private logger!: Logger; // Will be initialized in initializeWithOutputChannel

    private constructor() {
        // Logger will be initialized later with output channel
        // Initialize services will be called after logger is set
    }
    
    public initializeWithOutputChannel(outputChannel: any): void {
        // Initialize core logger with output channel
        this.logger = getLogger(outputChannel);
        this.services.set('Logger', this.logger);
        this.services.set('OutputChannel', outputChannel);

        // Initialize services
        this.initializeServices();
    }

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
     */
    public set(name: string, service: any): void {
        this.services.set(name, service);
    }

    /**
     * Get a service by type
     */
    public get<K extends keyof ServiceMap>(serviceType: K): ServiceMap[K];
    public get(serviceName: string): any;
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
     */
    public register<T>(name: string, service: T): void {
        this.services.set(name, service);
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
}