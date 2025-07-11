import { vi } from 'vitest';

// Mock VS Code API
export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn((key: string) => {
      // Return sensible defaults for common config keys
      const defaults: Record<string, any> = {
        'claude-code-chat.migration.useReduxStateManager': false,
        'claude-code-chat.migration.enableActionMapping': false,
        'claude-code-chat.migration.logStateDiscrepancies': true,
      };
      return defaults[key];
    }),
    update: vi.fn(),
    has: vi.fn(),
    inspect: vi.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: vi.fn(),
};

export const window = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  })),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const ExtensionContext = vi.fn().mockImplementation(() => ({
  subscriptions: [],
  workspaceState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => []),
  },
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => []),
    setKeysForSync: vi.fn(),
  },
  extensionPath: '/mock/extension/path',
  extensionUri: { fsPath: '/mock/extension/path' },
  asAbsolutePath: vi.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
  storagePath: '/mock/storage/path',
  globalStoragePath: '/mock/global/storage/path',
  logPath: '/mock/log/path',
}));

// Export enums
export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

// Export types
export type Disposable = { /**
                            *
                            */
dispose: () => void }

// Default export for convenience
export default {
  workspace,
  window,
  commands,
  ExtensionContext,
  ConfigurationTarget,
  ExtensionMode,
};