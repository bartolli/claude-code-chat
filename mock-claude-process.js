#!/usr/bin/env node

/**
 * Mock Claude process that simulates a long-running operation
 * Used for testing abort functionality
 */

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
    console.error('[Mock Claude] Received SIGTERM, shutting down gracefully...');
    process.exit(143); // 128 + 15 (SIGTERM)
});

// Handle other termination signals
process.on('SIGINT', () => {
    console.error('[Mock Claude] Received SIGINT');
    process.exit(130); // 128 + 2 (SIGINT)
});

// Start outputting mock Claude responses
console.log(JSON.stringify({ type: 'message_start', id: 'mock_msg_123', role: 'assistant' }));
console.log(JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));

// Simulate a long-running response
const words = [
    'This', 'is', 'a', 'simulated', 'Claude', 'response', 'that', 'will',
    'continue', 'for', 'a', 'while', 'to', 'test', 'the', 'abort', 'functionality.',
    'You', 'should', 'be', 'able', 'to', 'stop', 'this', 'process', 'using',
    'the', 'abort', 'controller.'
];

let index = 0;
const interval = setInterval(() => {
    if (index < words.length) {
        const delta = { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: words[index] + ' ' } };
        console.log(JSON.stringify(delta));
        index++;
    } else {
        // Loop back to beginning
        index = 0;
    }
}, 500); // Output a word every 500ms

// Keep the process alive
process.stdin.resume();

console.error('[Mock Claude] Process started, PID:', process.pid);
console.error('[Mock Claude] Outputting words every 500ms. Use SIGTERM to stop gracefully.');