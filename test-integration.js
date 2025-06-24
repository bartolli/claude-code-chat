#!/usr/bin/env node

/**
 * Test script to verify the Claude Code integration
 * This simulates Claude's JSON stream output for testing
 */

const messages = [
    { type: 'message_start', id: 'msg_123', role: 'assistant' },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello! I can help you with ' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'programming tasks. What would ' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'you like to work on today?' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { input_tokens: 10, output_tokens: 15 } },
    { type: 'message_stop' }
];

// Simulate streaming output
let index = 0;
const interval = setInterval(() => {
    if (index < messages.length) {
        console.log(JSON.stringify(messages[index]));
        index++;
    } else {
        clearInterval(interval);
    }
}, 100);