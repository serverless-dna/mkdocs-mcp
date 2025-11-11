import { fetchService } from '../src/services/fetch';
import { createServer } from '../src/server';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/services/fetch');
jest.mock('../src/services/logger');

const mockFetchService = fetchService as jest.Mocked<typeof fetchService>;

// Helper to call list tools handler
async function getToolsList(server: any) {
  const handlers = (server as any)._requestHandlers;
  const listToolsHandler = handlers.get('tools/list');
  const request = ListToolsRequestSchema.parse({ method: 'tools/list', params: {} });
  return await listToolsHandler(request);
}

describe('[Server]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Schema Registration', () => {
    it('should include version parameter for versioned sites', async () => {
      // Mock versions.json response indicating versioned site
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue([
          { version: 'v1.0', title: 'Version 1.0', aliases: ['1.0'] },
          { version: 'v2.0', title: 'Version 2.0', aliases: ['2.0', 'latest'] }
        ])
      } as any);

      const server = await createServer('https://docs.example.com', 'Test Docs');
      const result = await getToolsList(server);
      
      // Verify searchMkDoc tool has version parameter
      const searchTool = result.tools.find((t: any) => t.name === 'searchMkDoc');
      expect(searchTool).toBeDefined();
      expect(searchTool.inputSchema.properties).toHaveProperty('version');
      expect(searchTool.description).toContain('Available versions: v1.0, v2.0');
    });

    it('should exclude version parameter for non-versioned sites', async () => {
      // Mock versions.json response indicating non-versioned site (404)
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const server = await createServer('https://docs.example.com', 'Test Docs');
      const result = await getToolsList(server);
      
      // Verify searchMkDoc tool does NOT have version parameter
      const searchTool = result.tools.find((t: any) => t.name === 'searchMkDoc');
      expect(searchTool).toBeDefined();
      expect(searchTool.inputSchema.properties).not.toHaveProperty('version');
      expect(searchTool.description).not.toContain('Available versions');
    });

    it('should exclude version parameter when versions.json is empty', async () => {
      // Mock versions.json response with empty array
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue([])
      } as any);

      const server = await createServer('https://docs.example.com', 'Test Docs');
      const result = await getToolsList(server);
      
      // Verify searchMkDoc tool does NOT have version parameter
      const searchTool = result.tools.find((t: any) => t.name === 'searchMkDoc');
      expect(searchTool).toBeDefined();
      expect(searchTool.inputSchema.properties).not.toHaveProperty('version');
    });

    it('should exclude version parameter when versions.json fetch fails', async () => {
      // Mock versions.json fetch throwing error
      mockFetchService.fetch.mockRejectedValue(new Error('Network error'));

      const server = await createServer('https://docs.example.com', 'Test Docs');
      const result = await getToolsList(server);
      
      // Verify searchMkDoc tool does NOT have version parameter
      const searchTool = result.tools.find((t: any) => t.name === 'searchMkDoc');
      expect(searchTool).toBeDefined();
      expect(searchTool.inputSchema.properties).not.toHaveProperty('version');
    });

    it('should always include search parameter in both schemas', async () => {
      // Test with versioned site
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue([
          { version: 'v1.0', title: 'Version 1.0', aliases: [] }
        ])
      } as any);

      const versionedServer = await createServer('https://docs.example.com', 'Test Docs');
      const versionedResult = await getToolsList(versionedServer);
      const versionedSearchTool = versionedResult.tools.find((t: any) => t.name === 'searchMkDoc');
      
      expect(versionedSearchTool.inputSchema.properties).toHaveProperty('search');
      expect(versionedSearchTool.inputSchema.properties.search.type).toBe('string');

      // Test with non-versioned site
      jest.clearAllMocks();
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const nonVersionedServer = await createServer('https://docs.example.com', 'Test Docs');
      const nonVersionedResult = await getToolsList(nonVersionedServer);
      const nonVersionedSearchTool = nonVersionedResult.tools.find((t: any) => t.name === 'searchMkDoc');
      
      expect(nonVersionedSearchTool.inputSchema.properties).toHaveProperty('search');
      expect(nonVersionedSearchTool.inputSchema.properties.search.type).toBe('string');
    });

    it('should always register fetchMkDoc tool regardless of versioning', async () => {
      // Test with versioned site
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue([
          { version: 'v1.0', title: 'Version 1.0', aliases: [] }
        ])
      } as any);

      const server = await createServer('https://docs.example.com', 'Test Docs');
      const result = await getToolsList(server);
      
      const fetchTool = result.tools.find((t: any) => t.name === 'fetchMkDoc');
      expect(fetchTool).toBeDefined();
      expect(fetchTool.inputSchema.properties).toHaveProperty('url');
    });
  });

  describe('Version Detection', () => {
    it('should attempt to fetch versions.json from correct URL', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await createServer('https://docs.example.com', 'Test Docs');

      expect(mockFetchService.fetch).toHaveBeenCalledWith(
        'https://docs.example.com/versions.json',
        expect.objectContaining({
          contentType: 'web-page',
          headers: { 'Accept': 'application/json' }
        })
      );
    });

    it('should normalize trailing slash in docs URL', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await createServer('https://docs.example.com/', 'Test Docs');

      expect(mockFetchService.fetch).toHaveBeenCalledWith(
        'https://docs.example.com/versions.json',
        expect.any(Object)
      );
    });
  });
});
