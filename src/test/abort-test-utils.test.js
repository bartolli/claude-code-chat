 
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
 *
 * NOTE: This file intentionally uses console.log for debug console output
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbortTestUtils = void 0;
/**
 * Test utilities for debugging abort functionality in VS Code
 */
class AbortTestUtils {
  context = {};
  /**
   * Initialize the test environment
   */
  async setup() {
    console.log('=== Setting up Abort Test Environment ===');
    try {
      // Get the service container from the global extension context
      const serviceContainer = global.serviceContainer;
      if (!serviceContainer) {
        console.error('❌ ServiceContainer not found. Make sure extension is running.');
        return;
      }
      this.context.processManager = serviceContainer.get('ClaudeProcessManager');
      console.log('✅ Test environment ready!');
      console.log('\nAvailable commands:');
      console.log('  abortTest.startProcess()  - Start a Claude process');
      console.log('  abortTest.abort()         - Abort the current process');
      console.log('  abortTest.status()        - Check current status');
      console.log('  abortTest.getController() - Get the AbortController');
      console.log('  abortTest.testAbortSignal() - Test abort signal directly');
    } catch (error) {
      console.error('❌ Setup failed:', error);
    }
  }
  /**
   * Start a new Claude process
   */
  async startProcess() {
    if (!this.context.processManager) {
      console.error('❌ Run abortTest.setup() first!');
      return;
    }
    this.context.currentSessionId = `abort_test_${Date.now()}`;
    console.log(`\n🚀 Starting process with session: ${this.context.currentSessionId}`);
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
        console.log('✅ Process started successfully!');
        console.log(`   PID: ${result.value.pid}`);
        console.log(`   Has AbortController: ${this.context.currentController ? 'YES' : 'NO'}`);
        console.log(
          `   Signal aborted: ${this.context.currentController?.signal.aborted || false}`
        );
        // Monitor process exit
        result.value.on('exit', (code, signal) => {
          console.log('\n📤 Process Exit Event:');
          console.log(`   Exit code: ${code}`);
          console.log(`   Exit signal: ${signal}`);
          console.log(`   Was aborted: ${this.context.currentController?.signal.aborted}`);
          console.log(`   SIGTERM exit (143): ${code === 143 ? 'YES ✅' : 'NO'}`);
          // Check cleanup
          const controllerAfter = this.context.processManager?.getAbortController(
            this.context.currentSessionId
          );
          const processAfter = this.context.processManager?.getProcess(
            this.context.currentSessionId
          );
          console.log('\n🧹 Cleanup Check:');
          console.log(
            `   Controller removed: ${controllerAfter === undefined ? 'YES ✅' : 'NO ❌'}`
          );
          console.log(`   Process removed: ${processAfter === undefined ? 'YES ✅' : 'NO ❌'}`);
        });
        // Monitor stdout
        result.value.stdout.on('data', (data) => {
          console.log('[Claude Output]', data.toString().trim());
        });
      } else {
        console.error('❌ Failed to start process:', result.error.message);
      }
    } catch (error) {
      console.error('❌ Error starting process:', error);
    }
  }
  /**
   * Abort the current process
   */
  abort() {
    if (!this.context.currentController) {
      console.error('❌ No active process to abort');
      return;
    }
    console.log('\n🛑 Aborting process...');
    console.log(`   Session: ${this.context.currentSessionId}`);
    console.log(`   Signal already aborted: ${this.context.currentController.signal.aborted}`);
    this.context.currentController.abort();
    console.log('✅ Abort signal sent!');
    console.log(`   Signal now aborted: ${this.context.currentController.signal.aborted}`);
  }
  /**
   * Check current status
   */
  status() {
    console.log('\n📊 Current Status:');
    console.log(`   Session ID: ${this.context.currentSessionId || 'None'}`);
    console.log(`   Has controller: ${this.context.currentController ? 'YES' : 'NO'}`);
    if (this.context.currentController) {
      console.log(`   Signal aborted: ${this.context.currentController.signal.aborted}`);
    }
    if (this.context.currentSessionId && this.context.processManager) {
      const process = this.context.processManager.getProcess(this.context.currentSessionId);
      const controller = this.context.processManager.getAbortController(
        this.context.currentSessionId
      );
      console.log(`   Process in manager: ${process ? 'YES' : 'NO'}`);
      console.log(`   Controller in manager: ${controller ? 'YES' : 'NO'}`);
      if (process) {
        console.log(`   Process PID: ${process.pid}`);
      }
    }
  }
  /**
   * Get the current AbortController
   * @returns {AbortController|undefined} The current abort controller or undefined
   */
  getController() {
    return this.context.currentController;
  }
  /**
   * Test abort signal functionality directly
   */
  testAbortSignal() {
    console.log('\n🧪 Testing AbortSignal directly...');
    const controller = new AbortController();
    let eventFired = false;
    controller.signal.addEventListener('abort', () => {
      eventFired = true;
      console.log('✅ Abort event fired!');
    });
    console.log('   Signal aborted before: ' + controller.signal.aborted);
    console.log('   Calling controller.abort()...');
    controller.abort();
    console.log('   Signal aborted after: ' + controller.signal.aborted);
    console.log('   Event fired: ' + (eventFired ? 'YES ✅' : 'NO ❌'));
  }
  /**
   * Run all tests in sequence
   */
  async runAll() {
    console.log('🏃 Running all abort tests...\n');
    await this.setup();
    console.log('\n--- Test 1: Direct signal test ---');
    this.testAbortSignal();
    console.log('\n--- Test 2: Process abort test ---');
    await this.startProcess();
    console.log('\n⏳ Waiting 2 seconds before abort...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.abort();
    console.log('\n⏳ Waiting 2 seconds for cleanup...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.status();
    console.log('\n✅ All tests completed!');
  }
}
exports.AbortTestUtils = AbortTestUtils;
global.abortTest = new AbortTestUtils();
console.log('🧪 Abort Test Utils Loaded!');
console.log('Run: abortTest.setup() to begin');
//# sourceMappingURL=abort-test-utils.js.map
