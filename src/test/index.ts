/**
 * Test runner entry point
 * Loads setup and configuration before running tests
 */

// Load test setup to stub problematic modules
import './setup';

// Re-export mocha globals
export * from 'mocha';
