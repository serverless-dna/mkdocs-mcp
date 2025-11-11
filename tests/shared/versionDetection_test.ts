import { fetchService } from '../../src/services/fetch';
import { logger } from '../../src/services/logger';
import { buildVersionedUrl, clearVersionDetectionCache, detectVersioning } from '../../src/shared/versionDetection';

// Mock dependencies
jest.mock('../../src/services/fetch');
jest.mock('../../src/services/logger');

const mockFetchService = fetchService as jest.Mocked<typeof fetchService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('versionDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearVersionDetectionCache();
  });

  describe('detectVersioning', () => {
    it('should detect versioned site when versions.json exists', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(true);
      expect(mockFetchService.fetch).toHaveBeenCalledWith(
        'https://docs.example.com/versions.json',
        {
          contentType: 'web-page',
          headers: { 'Accept': 'application/json' }
        }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Version detection for https://docs.example.com: versioned'
      );
    });

    it('should detect non-versioned site when versions.json does not exist', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Version detection for https://docs.example.com: non-versioned'
      );
    });

    it('should cache version detection results', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      // First call
      await detectVersioning('https://docs.example.com');
      // Second call should use cache
      await detectVersioning('https://docs.example.com');

      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      mockFetchService.fetch.mockRejectedValue(new Error('Network error'));

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Version detection failed for https://docs.example.com, assuming non-versioned')
      );
    });

    it('should cache different results for different URLs', async () => {
      mockFetchService.fetch
        .mockResolvedValueOnce({ ok: true, status: 200 } as any)
        .mockResolvedValueOnce({ ok: false, status: 404 } as any);

      const result1 = await detectVersioning('https://docs1.example.com');
      const result2 = await detectVersioning('https://docs2.example.com');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildVersionedUrl', () => {
    it('should build versioned URL when site has versioning', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      const result = await buildVersionedUrl(
        'https://docs.example.com',
        'search/search_index.json',
        'latest'
      );

      expect(result).toBe('https://docs.example.com/latest/search/search_index.json');
    });

    it('should build non-versioned URL when site has no versioning', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await buildVersionedUrl(
        'https://docs.example.com',
        'search/search_index.json',
        'latest'
      );

      expect(result).toBe('https://docs.example.com/search/search_index.json');
    });

    it('should use "latest" as default version when not specified', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      const result = await buildVersionedUrl(
        'https://docs.example.com',
        'search/search_index.json'
      );

      expect(result).toBe('https://docs.example.com/latest/search/search_index.json');
    });

    it('should handle different version strings', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      const result = await buildVersionedUrl(
        'https://docs.example.com',
        'docs/page.html',
        '1.0.0'
      );

      expect(result).toBe('https://docs.example.com/1.0.0/docs/page.html');
    });

    it('should handle paths with leading slashes', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      const result = await buildVersionedUrl(
        'https://docs.example.com',
        '/search/search_index.json',
        'latest'
      );

      expect(result).toBe('https://docs.example.com/latest//search/search_index.json');
    });

    it('should use cached version detection results', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      // First call
      await buildVersionedUrl('https://docs.example.com', 'path1', 'latest');
      // Second call should use cached detection
      await buildVersionedUrl('https://docs.example.com', 'path2', 'latest');

      // Should only call fetch once for version detection
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearVersionDetectionCache', () => {
    it('should clear the cache', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      // First call
      await detectVersioning('https://docs.example.com');
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearVersionDetectionCache();

      // Next call should fetch again
      await detectVersioning('https://docs.example.com');
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache for all URLs', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      // Cache results for multiple URLs
      await detectVersioning('https://docs1.example.com');
      await detectVersioning('https://docs2.example.com');
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(2);

      // Clear cache
      clearVersionDetectionCache();

      // Next calls should fetch again
      await detectVersioning('https://docs1.example.com');
      await detectVersioning('https://docs2.example.com');
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error handling', () => {
    it('should handle timeout errors', async () => {
      mockFetchService.fetch.mockRejectedValue(new Error('Timeout'));

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(false);
    });

    it('should handle malformed responses', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any);

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(true); // Still returns true because response.ok is true
    });

    it('should handle server errors', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: false,
        status: 500
      } as any);

      const result = await detectVersioning('https://docs.example.com');

      expect(result).toBe(false);
    });
  });
});
