#!/usr/bin/env node

/**
 * Manual test for abort functionality
 * This creates helper functions you can call from the extension console
 */

// Store references globally for manual testing
let processManager;
let currentSessionId;
let currentController;

async function setupAbortTest() {
    const { ClaudeProcessManager } = require('./out/services/ClaudeProcessManager.js');
    
    // Create process manager
    processManager = new ClaudeProcessManager();
    
    // Override logger for console output
    ClaudeProcessManager.logger = {
        info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
        error: (cat, msg, err) => console.error(`[${cat}] ${msg}`, err || ''),
        debug: (cat, msg, data) => console.log(`[DEBUG] [${cat}] ${msg}`, data || ''),
        warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || '')
    };
    
    console.log('✓ Abort test setup complete!');
    console.log('\nAvailable commands:');
    console.log('  startTestProcess()  - Start a new Claude process');
    console.log('  abortTestProcess()  - Abort the current process');
    console.log('  checkTestStatus()   - Check current status');
    console.log('  getTestController() - Get the current AbortController');
}

async function startTestProcess() {
    currentSessionId = `test_abort_${Date.now()}`;
    
    console.log(`\nStarting process with session: ${currentSessionId}`);
    
    const result = await processManager.spawn({
        sessionId: currentSessionId,
        model: 'sonnet',
        cwd: process.cwd(),
        verbose: true,
        dangerouslySkipPermissions: true
    });
    
    if (result.ok) {
        currentController = processManager.getAbortController(currentSessionId);
        console.log('✓ Process started successfully!');
        console.log(`  PID: ${result.value.pid}`);
        console.log(`  Has AbortController: ${currentController ? 'YES' : 'NO'}`);
        
        // Set up exit handler
        result.value.on('exit', (code, signal) => {
            console.log('\n>>> Process exited <<<');
            console.log(`  Exit code: ${code}`);
            console.log(`  Exit signal: ${signal}`);
            console.log(`  Was aborted: ${currentController?.signal.aborted}`);
            
            // Check cleanup
            const cleanupCheck = processManager.getAbortController(currentSessionId);
            console.log(`  Controller cleaned up: ${cleanupCheck === undefined ? 'YES' : 'NO'}`);
        });
        
        return result.value;
    } else {
        console.error('✗ Failed to start process:', result.error.message);
    }
}

function abortTestProcess() {
    if (!currentController) {
        console.log('✗ No active process to abort');
        return;
    }
    
    console.log('\n>>> Aborting process <<<');
    console.log(`  Session: ${currentSessionId}`);
    console.log(`  Signal already aborted: ${currentController.signal.aborted}`);
    
    currentController.abort();
    
    console.log('✓ Abort signal sent!');
    console.log(`  Signal now aborted: ${currentController.signal.aborted}`);
}

function checkTestStatus() {
    console.log('\n=== Current Status ===');
    console.log(`Session ID: ${currentSessionId || 'None'}`);
    console.log(`Has controller: ${currentController ? 'YES' : 'NO'}`);
    
    if (currentController) {
        console.log(`Signal aborted: ${currentController.signal.aborted}`);
    }
    
    if (currentSessionId) {
        const process = processManager.getProcess(currentSessionId);
        const controller = processManager.getAbortController(currentSessionId);
        
        console.log(`Process exists: ${process ? 'YES' : 'NO'}`);
        console.log(`Controller exists: ${controller ? 'YES' : 'NO'}`);
        
        if (process) {
            console.log(`Process PID: ${process.pid}`);
        }
    }
}

function getTestController() {
    return currentController;
}

// Export functions to global scope for console access
global.setupAbortTest = setupAbortTest;
global.startTestProcess = startTestProcess;
global.abortTestProcess = abortTestProcess;
global.checkTestStatus = checkTestStatus;
global.getTestController = getTestController;

console.log('=== Phase 2 Abort Test Utility ===');
console.log('Run setupAbortTest() to begin');