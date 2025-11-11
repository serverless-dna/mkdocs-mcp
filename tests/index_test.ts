import { createServer } from '../src/server';
import { logger } from '../src/services/logger';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

// Mock the logger
vi.mock('../src/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));



// Mock the server module
vi.mock('../src/server', () => ({
  createServer: vi.fn()
}));

// Mock the StdioServerTransport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

const mockLogger = logger as vi.Mocked<typeof logger>;
const mockCreateServer = createServer as vi.MockedFunction<typeof createServer>;
const mockStdioServerTransport = StdioServerTransport as vi.MockedFunction<typeof StdioServerTransport>;

describe('MkDocs MCP Server', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let mockExit: vi.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    mockExit = vi.fn() as any;
    process.exit = mockExit;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  describe('main function', () => {
    it('should start server with provided arguments', async () => {
      // Mock process.argv
      process.argv = ['node', 'index.js', 'https://example.com', 'Test documentation'];

      // Mock server and transport
      const mockServer = {
        connect: vi.fn().mockResolvedValue(undefined)
      };
      const mockTransport = {};
      
      mockCreateServer.mockReturnValue(mockServer as any);
      mockStdioServerTransport.mockReturnValue(mockTransport as any);

      // Import and run main
      const { main } = await import('../src/index'); await main();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCreateServer).toHaveBeenCalledWith('https://example.com', 'Test documentation');
      expect(mockStdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting MkDocs MCP Server');
      expect(mockLogger.info).toHaveBeenCalledWith('MkDocs MCP Server running on stdio');
    });

    it('should use default description when none provided', async () => {
      // Mock process.argv with only URL
      process.argv = ['node', 'index.js', 'https://example.com'];

      // Mock server and transport
      const mockServer = {
        connect: vi.fn().mockResolvedValue(undefined)
      };
      const mockTransport = {};
      
      mockCreateServer.mockReturnValue(mockServer as any);
      mockStdioServerTransport.mockReturnValue(mockTransport as any);

      // Import and run main
      const { main } = await import('../src/index'); await main();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCreateServer).toHaveBeenCalledWith('https://example.com', 'search online documentation');
    });

    it('should throw error when no doc site provided', async () => {
      // Mock process.argv with no URL
      process.argv = ['node', 'index.js'];

      // Import and expect main to throw
      const { main } = await import('../src/index');
      await expect(main()).rejects.toThrow('No doc site provided');
    });

    it('should handle server connection errors', async () => {
      // Mock process.argv
      process.argv = ['node', 'index.js', 'https://example.com'];

      // Mock server that throws on connect
      const mockServer = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed'))
      };
      const mockTransport = {};
      
      mockCreateServer.mockReturnValue(mockServer as any);
      mockStdioServerTransport.mockReturnValue(mockTransport as any);

      // Import and expect main to throw
      const { main } = await import('../src/index');
      await expect(main()).rejects.toThrow('Connection failed');
    });
  });
});
