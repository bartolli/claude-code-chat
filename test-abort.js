#!/usr/bin/env node

/**
 * Test script for Phase 2 abort functionality
 * Run this in the extension console to test AbortController integration
 */

async function testAbortFunctionality() {
    console.log('=== Testing Phase 2: AbortController Integration ===\n');
    
    try {
        // Load the necessary modules
        const { ServiceContainer } = require('./out/core/ServiceContainer.js');
        const { ClaudeProcessManager } = require('./out/services/ClaudeProcessManager.js');
        const { getLogger } = require('./out/core/Logger.js');
        
        console.log('✓ Modules loaded successfully\n');
        
        // Create a mock service container
        const mockLogger = {
            info: (category, message, data) => console.log(`[INFO] [${category}] ${message}`, data || ''),
            error: (category, message, error) => console.error(`[ERROR] [${category}] ${message}`, error || ''),
            debug: (category, message, data) => console.log(`[DEBUG] [${category}] ${message}`, data || ''),
            warn: (category, message, data) => console.warn(`[WARN] [${category}] ${message}`, data || '')
        };
        
        // Create process manager instance
        const processManager = new ClaudeProcessManager();
        
        // Override the static logger
        ClaudeProcessManager.logger = mockLogger;
        
        console.log('=== Test 1: Create AbortController and spawn process ===');
        const sessionId = `test_session_${Date.now()}`;
        
        // Test spawning with abort controller
        const spawnResult = await processManager.spawn({
            sessionId: sessionId,
            model: 'sonnet',
            cwd: process.cwd(),
            verbose: true,
            dangerouslySkipPermissions: true
        });
        
        if (spawnResult.ok) {
            console.log('✓ Process spawned successfully\n');
            
            // Test getting abort controller
            console.log('=== Test 2: Retrieve AbortController ===');
            const controller = processManager.getAbortController(sessionId);
            console.log(`✓ AbortController retrieved: ${controller ? 'YES' : 'NO'}`);
            console.log(`✓ Is AbortController instance: ${controller instanceof AbortController}\n`);
            
            // Test abort functionality
            console.log('=== Test 3: Trigger abort after 2 seconds ===');
            console.log('Process is running... will abort in 2 seconds');
            
            setTimeout(() => {
                console.log('\n>>> Calling abort() on controller <<<');
                if (controller) {
                    controller.abort();
                    console.log('✓ Abort called successfully\n');
                }
            }, 2000);
            
            // Monitor process exit
            const process = spawnResult.value;
            process.on('exit', (code, signal) => {
                console.log('\n=== Process Exit Detected ===');
                console.log(`Exit code: ${code}`);
                console.log(`Exit signal: ${signal}`);
                console.log(`Was aborted: ${controller?.signal.aborted}`);
                
                // Check cleanup
                console.log('\n=== Test 4: Verify cleanup ===');
                const controllerAfterExit = processManager.getAbortController(sessionId);
                console.log(`✓ Controller cleaned up: ${controllerAfterExit === undefined ? 'YES' : 'NO'}`);
                
                const processAfterExit = processManager.getProcess(sessionId);
                console.log(`✓ Process cleaned up: ${processAfterExit === undefined ? 'YES' : 'NO'}`);
                
                console.log('\n=== All tests completed! ===');
            });
            
        } else {
            console.error('✗ Failed to spawn process:', spawnResult.error);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
console.log('Starting abort functionality test...\n');
testAbortFunctionality();