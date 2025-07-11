import { vi } from 'vitest'

// Mock the MCP SDK modules that cause issues during testing
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(),
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(),
}))

// Setup global test utilities
beforeEach(() => {
  vi.clearAllMocks()
})