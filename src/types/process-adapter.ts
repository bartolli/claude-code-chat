/**
 * Type definitions for adapting ClaudeProcess to be compatible with ChildProcess usage
 */

import { ClaudeProcess } from './claude';

/**
 * Minimal adapter to make ClaudeProcess work where ChildProcess is expected
 * We only implement the properties/methods actually used in ExtensionMessageHandler
 */
export class ClaudeProcessAdapter {
    public readonly stdin: NodeJS.WritableStream;
    public readonly stdout: NodeJS.ReadableStream;
    public readonly stderr: NodeJS.ReadableStream;
    public readonly pid: number;
    public connected: boolean = true;
    public killed: boolean = false;
    public exitCode: number | null = null;
    
    constructor(private claudeProcess: ClaudeProcess) {
        this.stdin = claudeProcess.stdin;
        this.stdout = claudeProcess.stdout;
        this.stderr = claudeProcess.stderr;
        this.pid = claudeProcess.pid;
    }
    
    kill(signal?: NodeJS.Signals): boolean {
        this.killed = true;
        return this.claudeProcess.kill(signal);
    }
    
    on(event: string, listener: (...args: any[]) => void): this {
        this.claudeProcess.on(event, listener);
        return this;
    }
}