/**
 * Test setup to stub problematic modules
 */

// Stub the MCP SDK before any tests load
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
    // Stub the MCP SDK modules that cause issues in tests
    if (id === '@modelcontextprotocol/sdk/client' || 
        id === '@modelcontextprotocol/sdk/client/index') {
        return {
            Client: class MockClient {
                /**
                 * Creates a new mock MCP client instance
                 */
                constructor() {}
                
                /**
                 * Mocks the connect method
                 * @returns Promise that resolves immediately
                 */
                connect() {
                    return Promise.resolve();
                }
                
                /**
                 * Mocks the disconnect method  
                 * @returns Promise that resolves immediately
                 */
                disconnect() {
                    return Promise.resolve();
                }
                
                /**
                 * Mocks the listResources method
                 * @returns Promise with empty resources array
                 */
                listResources() {
                    return Promise.resolve({ resources: [] });
                }
                
                /**
                 * Mocks the listTools method
                 * @returns Promise with empty tools array
                 */
                listTools() {
                    return Promise.resolve({ tools: [] });
                }
            },
        };
    }
    
    if (id === '@modelcontextprotocol/sdk/client/stdio') {
        return {
            StdioClientTransport: class MockStdioClientTransport {
                /**
                 * Creates a new mock stdio transport instance
                 * @param _ - Unused parameter
                 */
                constructor(_: any) {}
                
                /**
                 * Mocks the connect method
                 * @returns Promise that resolves immediately
                 */
                connect() {
                    return Promise.resolve();
                }
                
                /**
                 * Mocks the disconnect method
                 * @returns Promise that resolves immediately
                 */
                disconnect() {
                    return Promise.resolve();
                }
            }
        };
    }
    
    // Default to original require
    return originalRequire.apply(this, arguments);
};