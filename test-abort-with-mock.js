#!/usr/bin/env node

/**
 * Test abort functionality using mock Claude process
 * This can be run directly: node test-abort-with-mock.js
 */

const cp = require('child_process');
const path = require('path');

async function testAbortWithMock() {
    console.log('=== Testing Abort with Mock Claude Process ===\n');
    
    // Create an AbortController
    const abortController = new AbortController();
    
    // Spawn our mock process with the abort signal
    const mockProcess = cp.spawn('node', [path.join(__dirname, 'mock-claude-process.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: abortController.signal
    });
    
    console.log(`✓ Mock process started with PID: ${mockProcess.pid}`);
    console.log(`✓ AbortController created and signal attached\n`);
    
    // Handle stdout (Claude responses)
    mockProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            try {
                const msg = JSON.parse(line);
                if (msg.delta?.text) {
                    process.stdout.write(msg.delta.text);
                }
            } catch (e) {
                // Not JSON, ignore
            }
        });
    });
    
    // Handle stderr (debug messages)
    mockProcess.stderr.on('data', (data) => {
        console.error('\n' + data.toString().trim());
    });
    
    // Handle process exit
    mockProcess.on('exit', (code, signal) => {
        console.log('\n\n=== Process Exit Information ===');
        console.log(`Exit code: ${code}`);
        console.log(`Exit signal: ${signal}`);
        console.log(`AbortSignal aborted: ${abortController.signal.aborted}`);
        console.log(`Expected SIGTERM exit code (143): ${code === 143 ? 'YES ✓' : 'NO ✗'}`);
        console.log('\n✓ Test completed!');
    });
    
    // Abort after 3 seconds
    console.log('Process will be aborted in 3 seconds...\n');
    setTimeout(() => {
        console.log('\n\n>>> Calling abortController.abort() <<<');
        abortController.abort();
        console.log('✓ Abort signal sent');
        console.log(`Signal is now aborted: ${abortController.signal.aborted}`);
    }, 3000);
}

// Test abort signal event listener
function testAbortEventListener() {
    console.log('\n=== Testing Abort Event Listener ===\n');
    
    const controller = new AbortController();
    
    // Add our abort event listener (similar to what's in ClaudeProcessManager)
    controller.signal.addEventListener('abort', () => {
        console.log('✓ Abort event listener fired!');
        console.log('  This is where we would send SIGTERM to the process');
    });
    
    console.log('Event listener added. Calling abort() in 1 second...');
    
    setTimeout(() => {
        controller.abort();
        console.log('✓ abort() called');
    }, 1000);
}

// Run tests
async function runAllTests() {
    // First test the event listener
    testAbortEventListener();
    
    // Then test with mock process after a delay
    setTimeout(() => {
        testAbortWithMock();
    }, 2000);
}

console.log('Starting Phase 2 abort tests...\n');
runAllTests();