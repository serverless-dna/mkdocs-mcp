import { fetchService } from '../../src/services/fetch';
import { logger } from '../../src/services/logger';
import { VersionManager } from '../../src/shared/VersionManager';

// Mock the dependencies
vi.mock('../../src/services/fetch');
vi.mock('../../src/services/logger');

const mockFetchService = fetchService as vi.Mocked<typeof fetchService>;
const mockLogger = logger as vi.Mocked<typeof logger>;

describe('VersionManager', () => {
  let versionManager: VersionManager;
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    versionManager = new VersionManager(baseUrl);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear caches between tests
    versionManager.invalidateCache();
  });

  describe('detectVersioning', () => {
    it('should detect versioned site when versions.json exists', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn()
      } as any);

      const result = await versionManager.detectVersioning();

      expect(result).toBe(true);
      expect(mockFetchService.fetch).toHaveBeenCalledWith(
        'https://example.com/versions.json',
        {
          contentType: 'web-page',
          headers: { 'Accept': 'application/json' }
        }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Version detection for https://example.com: versioned'
      );
    });

    it('should detect non-versioned site when versions.json does not exist', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await versionManager.detectVersioning();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Version detection for https://example.com: non-versioned'
      );
    });

    it('should cache version detection results', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      // First call
      await versionManager.detectVersioning();
      // Second call should use cache
      await versionManager.detectVersioning();

      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      mockFetchService.fetch.mockRejectedValue(new Error('Network error'));

      const result = await versionManager.detectVersioning();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Version detection failed for https://example.com, assuming non-versioned')
      );
    });

    it('should retry on network failures', async () => {
      const versionManagerWithRetry = new VersionManager(baseUrl, {
        retryAttempts: 2,
        retryDelay: 10
      });

      mockFetchService.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        } as any);

      const result = await versionManagerWithRetry.detectVersioning();

      expect(result).toBe(true);
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchVersions', () => {
    const mockVersions = [
      { title: 'Latest', version: 'latest', aliases: ['main'] },
      { title: 'Version 1.0', version: '1.0.0', aliases: ['stable'] },
      { title: 'Version 0.9', version: '0.9.0', aliases: [] }
    ];

    it('should fetch and parse versions.json successfully', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockVersions)
      } as any);

      const result = await versionManager.fetchVersions();

      expect(result).toEqual(mockVersions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Fetched 3 versions for https://example.com'
      );
    });

    it('should return undefined when versions.json is not available', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await versionManager.fetchVersions();

      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Versions file not available at https://example.com/versions.json: 404'
      );
    });

    it('should handle malformed versions.json', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue('not an array')
      } as any);

      const result = await versionManager.fetchVersions();

      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid versions.json format at https://example.com/versions.json: expected array'
      );
    });

    it('should filter out invalid version entries', async () => {
      const invalidVersions = [
        { title: 'Valid', version: '1.0.0', aliases: [] },
        { title: 'Missing version' }, // Invalid - no version
        { version: '2.0.0' }, // Invalid - no title
        { title: 'Invalid aliases', version: '3.0.0', aliases: 'not-array' }
      ];

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(invalidVersions)
      } as any);

      const result = await versionManager.fetchVersions();

      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({ title: 'Valid', version: '1.0.0', aliases: [] });
      expect(mockLogger.warn).toHaveBeenCalledTimes(3); // Three invalid entries
    });

    it('should cache versions with timestamp', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockVersions)
      } as any);

      // First call
      await versionManager.fetchVersions();
      // Second call should use cache
      await versionManager.fetchVersions();

      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after timeout', async () => {
      const shortTimeoutManager = new VersionManager(baseUrl, {
        cacheTimeout: 10 // 10ms timeout
      });

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockVersions)
      } as any);

      // First call
      await shortTimeoutManager.fetchVersions();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 15));
      
      // Second call should fetch again
      await shortTimeoutManager.fetchVersions();

      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);
    });

    it('should normalize versions to ensure aliases is always an array', async () => {
      const versionsWithoutAliases = [
        { title: 'No aliases', version: '1.0.0' }
      ];

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(versionsWithoutAliases)
      } as any);

      const result = await versionManager.fetchVersions();

      expect(result![0].aliases).toEqual([]);
    });
  });

  describe('resolveVersion', () => {
    const mockVersions = [
      { title: 'Latest', version: 'latest', aliases: ['main'] },
      { title: 'Version 1.0', version: '1.0.0', aliases: ['stable'] },
      { title: 'Version 0.9', version: '0.9.0', aliases: [] }
    ];

    beforeEach(() => {
      // Mock versioned site
      mockFetchService.fetch.mockImplementation((url: string) => {
        if (url.includes('versions.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockVersions)
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });
    });

    it('should resolve direct version match', async () => {
      const result = await versionManager.resolveVersion('1.0.0');

      expect(result).toEqual({
        valid: true,
        resolved: '1.0.0',
        isDefault: false,
        available: mockVersions
      });
    });

    it('should resolve version alias', async () => {
      const result = await versionManager.resolveVersion('stable');

      expect(result).toEqual({
        valid: true,
        resolved: '1.0.0',
        isDefault: false,
        available: mockVersions
      });
    });

    it('should resolve latest version when no version specified', async () => {
      const result = await versionManager.resolveVersion();

      expect(result).toEqual({
        valid: true,
        resolved: 'latest',
        isDefault: true,
        available: mockVersions
      });
    });

    it('should resolve latest version when "latest" specified', async () => {
      const result = await versionManager.resolveVersion('latest');

      expect(result).toEqual({
        valid: true,
        resolved: 'latest',
        isDefault: true,
        available: mockVersions
      });
    });

    it('should return error for invalid version', async () => {
      const result = await versionManager.resolveVersion('invalid-version');

      expect(result).toEqual({
        valid: false,
        resolved: 'invalid-version',
        isDefault: false,
        available: mockVersions,
        error: "Version 'invalid-version' not found. Available versions: latest, 1.0.0, 0.9.0"
      });
    });

    it('should handle non-versioned sites', async () => {
      // Mock non-versioned site
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await versionManager.resolveVersion('any-version');

      expect(result).toEqual({
        valid: true,
        resolved: 'default',
        isDefault: true
      });
    });

    it('should handle sites with no available versions', async () => {
      mockFetchService.fetch.mockImplementation((url: string) => {
        if (url.includes('versions.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue([])
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });

      const result = await versionManager.resolveVersion('1.0.0');

      expect(result).toEqual({
        valid: false,
        resolved: '1.0.0',
        isDefault: false,
        error: 'No versions available'
      });
    });

    it('should handle errors during resolution', async () => {
      mockFetchService.fetch.mockRejectedValue(new Error('Network error'));

      const result = await versionManager.resolveVersion('1.0.0');

      // When version detection fails, it falls back to non-versioned behavior
      expect(result).toEqual({
        valid: true,
        resolved: 'default',
        isDefault: true
      });
    });
  });

  describe('buildVersionedUrl', () => {
    it('should build versioned URL for versioned site', async () => {
      const mockVersions = [
        { title: 'Latest', version: 'latest', aliases: ['main'] }
      ];

      mockFetchService.fetch.mockImplementation((url: string) => {
        if (url.includes('versions.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockVersions)
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });

      const result = await versionManager.buildVersionedUrl('search/search_index.json', 'latest');

      expect(result).toBe('https://example.com/latest/search/search_index.json');
    });

    it('should build non-versioned URL for non-versioned site', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await versionManager.buildVersionedUrl('search/search_index.json', 'any-version');

      expect(result).toBe('https://example.com/search/search_index.json');
    });

    it('should throw error for invalid version on versioned site', async () => {
      const mockVersions = [
        { title: 'Latest', version: 'latest', aliases: [] }
      ];

      mockFetchService.fetch.mockImplementation((url: string) => {
        if (url.includes('versions.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockVersions)
          } as any);
        }
        return Promise.resolve({ ok: false, status: 404 } as any);
      });

      await expect(
        versionManager.buildVersionedUrl('search/search_index.json', 'invalid-version')
      ).rejects.toThrow("Version 'invalid-version' not found");
    });
  });

  describe('getAvailableVersions', () => {
    it('should return cached versions', async () => {
      const mockVersions = [
        { title: 'Latest', version: 'latest', aliases: [] }
      ];

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockVersions)
      } as any);

      const result = await versionManager.getAvailableVersions();

      expect(result).toEqual(mockVersions);
    });
  });

  describe('invalidateCache', () => {
    it('should clear all caches', async () => {
      // First, populate caches
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([])
      } as any);

      await versionManager.detectVersioning();
      await versionManager.fetchVersions();

      // Clear caches
      versionManager.invalidateCache();

      // Next calls should fetch again
      await versionManager.detectVersioning();
      await versionManager.fetchVersions();

      expect(mockFetchService.fetch).toHaveBeenCalledTimes(4); // 2 initial + 2 after cache clear
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cleared version caches for https://example.com'
      );
    });
  });

  describe('constructor options', () => {
    it('should use default options when none provided', () => {
      const manager = new VersionManager(baseUrl);
      expect(manager).toBeDefined();
    });

    it('should use custom options when provided', () => {
      const options = {
        cacheTimeout: 10000,
        retryAttempts: 5,
        retryDelay: 2000
      };

      const manager = new VersionManager(baseUrl, options);
      expect(manager).toBeDefined();
    });
  });

  describe('retry logic', () => {
    it('should retry with exponential backoff', async () => {
      const manager = new VersionManager(baseUrl, {
        retryAttempts: 3,
        retryDelay: 10
      });

      mockFetchService.fetch
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        } as any);

      const startTime = Date.now();
      const result = await manager.detectVersioning();
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(3);
      // Should have some delay due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(10);
    });

    it('should fail after max retry attempts', async () => {
      const manager = new VersionManager(baseUrl, {
        retryAttempts: 2,
        retryDelay: 10
      });

      mockFetchService.fetch.mockRejectedValue(new Error('Persistent error'));

      const result = await manager.detectVersioning();

      expect(result).toBe(false);
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
