'use strict';
/**
 * Abort functionality test utilities for VS Code Debug Console
 *
 * Usage in Debug Console:
 * 1. Start the extension in debug mode (F5)
 * 2. Open Debug Console
 * 3. The test functions will be available on global.abortTest
 *
 * Example:
 * > abortTest.setup()
 * > abortTest.startProcess()
 * > abortTest.abort()
 * > abortTest.status()
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbortTestUtils = void 0;
const Logger_1 = require('../core/Logger');
/**
 * Utility class for testing abort functionality in the VS Code Debug Console.
 * Provides methods to test process abortion, signal handling, and cleanup mechanisms.
 *
 * @class AbortTestUtils
 * @example
 * // In VS Code Debug Console:
 * abortTest.setup()
 * abortTest.startProcess()
 * abortTest.abort()
 * abortTest.status()
 */
class AbortTestUtils {
  /**
   * Context object storing test state and references
   * @private
   * @type {Object}
   * @property {Object} [processManager] - Reference to ClaudeProcessManager
   * @property {string} [currentSessionId] - Current test session ID
   * @property {Object} [currentProcess] - Current spawned process
   * @property {AbortController} [currentController] - Current abort controller
   */
  context = {};

  /**
   * Logger instance for test output
   * @private
   * @type {import('../core/Logger').Logger}
   */
  logger = (0, Logger_1.getLogger)();
  /**
   * Initialize the test environment
   */
  async setup() {
    this.logger.info('AbortTest', '🧪 Abort Test Utils Loaded!');
    this.logger.info('AbortTest', '=== Setting up Abort Test Environment ===');
    try {
      // Get the service container from the global extension context
      const serviceContainer = global.serviceContainer;
      if (!serviceContainer) {
        this.logger.error(
          'AbortTest',
          '❌ ServiceContainer not found. Make sure extension is running.'
        );
        return;
      }
      this.context.processManager = serviceContainer.get('ClaudeProcessManager');
      this.logger.info('AbortTest', '✅ Test environment ready!');
      this.logger.info('AbortTest', '\nAvailable commands:');
      this.logger.info('AbortTest', '  abortTest.startProcess()  - Start a Claude process');
      this.logger.info('AbortTest', '  abortTest.abort()         - Abort the current process');
      this.logger.info('AbortTest', '  abortTest.status()        - Check current status');
      this.logger.info('AbortTest', '  abortTest.getController() - Get the AbortController');
      this.logger.info('AbortTest', '  abortTest.testAbortSignal() - Test abort signal directly');
    } catch (error) {
      this.logger.error('AbortTest', '❌ Setup failed:', error);
    }
  }
  /**
   * Start a new Claude process
   */
  async startProcess() {
    if (!this.context.processManager) {
      this.logger.error('AbortTest', '❌ Run abortTest.setup() first!');
      return;
    }
    this.context.currentSessionId = `abort_test_${Date.now()}`;
    this.logger.info(
      'AbortTest',
      `\n🚀 Starting process with session: ${this.context.currentSessionId}`
    );
    try {
      const result = await this.context.processManager.spawn({
        sessionId: this.context.currentSessionId,
        model: 'sonnet',
        cwd: process.cwd(),
        verbose: true,
        dangerouslySkipPermissions: true,
      });
      if (result.ok) {
        this.context.currentProcess = result.value;
        this.context.currentController = this.context.processManager.getAbortController(
          this.context.currentSessionId
        );
        this.logger.info('AbortTest', '✅ Process started successfully!');
        this.logger.info('AbortTest', `   PID: ${result.value.pid}`);
        this.logger.info(
          'AbortTest',
          `   Has AbortController: ${this.context.currentController ? 'YES' : 'NO'}`
        );
        this.logger.info(
          'AbortTest',
          `   Signal aborted: ${this.context.currentController?.signal.aborted || false}`
        );
        // Monitor process exit
        result.value.on('exit', (code, signal) => {
          this.logger.info('AbortTest', '\n📤 Process Exit Event:');
          this.logger.info('AbortTest', `   Exit code: ${code}`);
          this.logger.info('AbortTest', `   Exit signal: ${signal}`);
          this.logger.info(
            'AbortTest',
            `   Was aborted: ${this.context.currentController?.signal.aborted}`
          );
          this.logger.info('AbortTest', `   SIGTERM exit (143): ${code === 143 ? 'YES ✅' : 'NO'}`);
          // Check cleanup
          const controllerAfter = this.context.processManager?.getAbortController(
            this.context.currentSessionId
          );
          const processAfter = this.context.processManager?.getProcess(
            this.context.currentSessionId
          );
          this.logger.info('AbortTest', '\n🧹 Cleanup Check:');
          this.logger.info(
            'AbortTest',
            `   Controller removed: ${controllerAfter === undefined ? 'YES ✅' : 'NO ❌'}`
          );
          this.logger.info(
            'AbortTest',
            `   Process removed: ${processAfter === undefined ? 'YES ✅' : 'NO ❌'}`
          );
        });
        // Monitor stdout
        result.value.stdout.on('data', (data) => {
          this.logger.info('AbortTest', '[Claude Output] ' + data.toString().trim());
        });
      } else {
        this.logger.error('AbortTest', '❌ Failed to start process: ' + result.error.message);
      }
    } catch (error) {
      this.logger.error('AbortTest', '❌ Error starting process:', error);
    }
  }
  /**
   * Abort the current process
   */
  abort() {
    if (!this.context.currentController) {
      this.logger.error('AbortTest', '❌ No active process to abort');
      return;
    }
    this.logger.info('AbortTest', '\n🛑 Aborting process...');
    this.logger.info('AbortTest', `   Session: ${this.context.currentSessionId}`);
    this.logger.info(
      'AbortTest',
      `   Signal already aborted: ${this.context.currentController.signal.aborted}`
    );
    this.context.currentController.abort();
    this.logger.info('AbortTest', '✅ Abort signal sent!');
    this.logger.info(
      'AbortTest',
      `   Signal now aborted: ${this.context.currentController.signal.aborted}`
    );
  }
  /**
   * Check current status
   */
  status() {
    this.logger.info('AbortTest', '\n📊 Current Status:');
    this.logger.info('AbortTest', `   Session ID: ${this.context.currentSessionId || 'None'}`);
    this.logger.info(
      'AbortTest',
      `   Has controller: ${this.context.currentController ? 'YES' : 'NO'}`
    );
    if (this.context.currentController) {
      this.logger.info(
        'AbortTest',
        `   Signal aborted: ${this.context.currentController.signal.aborted}`
      );
    }
    if (this.context.currentSessionId && this.context.processManager) {
      const process = this.context.processManager.getProcess(this.context.currentSessionId);
      const controller = this.context.processManager.getAbortController(
        this.context.currentSessionId
      );
      this.logger.info('AbortTest', `   Process in manager: ${process ? 'YES' : 'NO'}`);
      this.logger.info('AbortTest', `   Controller in manager: ${controller ? 'YES' : 'NO'}`);
      if (process) {
        this.logger.info('AbortTest', `   Process PID: ${process.pid}`);
      }
    }
  }
  /**
   * Get the current AbortController
   * @returns {AbortController|undefined} The current abort controller or undefined if none exists
   */
  getController() {
    return this.context.currentController;
  }
  /**
   * Test abort signal functionality directly
   */
  testAbortSignal() {
    this.logger.info('AbortTest', '\n🧪 Testing AbortSignal directly...');
    const controller = new AbortController();
    let eventFired = false;
    controller.signal.addEventListener('abort', () => {
      eventFired = true;
      this.logger.info('AbortTest', '✅ Abort event fired!');
    });
    this.logger.info('AbortTest', '   Signal aborted before: ' + controller.signal.aborted);
    this.logger.info('AbortTest', '   Calling controller.abort()...');
    controller.abort();
    this.logger.info('AbortTest', '   Signal aborted after: ' + controller.signal.aborted);
    this.logger.info('AbortTest', '   Event fired: ' + (eventFired ? 'YES ✅' : 'NO ❌'));
  }
  /**
   * Run all tests in sequence
   */
  async runAll() {
    this.logger.info('AbortTest', '🏃 Running all abort tests...\n');
    await this.setup();
    this.logger.info('AbortTest', '\n--- Test 1: Direct signal test ---');
    this.testAbortSignal();
    this.logger.info('AbortTest', '\n--- Test 2: Process abort test ---');
    await this.startProcess();
    this.logger.info('AbortTest', '\n⏳ Waiting 2 seconds before abort...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.abort();
    this.logger.info('AbortTest', '\n⏳ Waiting 2 seconds for cleanup...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.status();
    this.logger.info('AbortTest', '\n✅ All tests completed!');
  }
}
exports.AbortTestUtils = AbortTestUtils;
global.abortTest = new AbortTestUtils();
// Initialize message is shown when setup() is called instead of at module load time
// to ensure proper logger initialization
//# sourceMappingURL=abort-test-utils.js.map
