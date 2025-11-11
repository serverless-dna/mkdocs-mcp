import { fetchService } from '../../src/services/fetch';
import { VersionNotFoundError } from '../../src/shared/errors/VersionErrors';
import { SearchIndexFactory } from '../../src/shared/SearchIndexFactory';

import { beforeEach, describe, expect, it } from 'vitest';

// Mock dependencies
vi.mock('../../src/services/fetch');
vi.mock('../../src/services/logger');

const mockFetchService = fetchService as vi.Mocked<typeof fetchService>;

describe('[SearchIndexFactory]', () => {
  let factory: SearchIndexFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: true });
  });

  describe('Version Error Handling', () => {
    it('should throw VersionNotFoundError when invalid version is requested with available versions', async () => {
      // Mock the version manager to return versioned site and invalid version
      const mockVersionManager = {
        detectVersioning: vi.fn().mockResolvedValue(true),
        resolveVersion: vi.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: [
            { version: 'v1.0', title: 'Version 1.0', aliases: ['1.0'] },
            { version: 'v2.0', title: 'Version 2.0', aliases: ['2.0', 'latest'] }
          ],
          error: 'Version not found'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Expect the method to throw VersionNotFoundError
      await expect(factory.getSearchIndex('3.x')).rejects.toThrow(VersionNotFoundError);
      
      // Verify the error contains the correct information
      try {
        await factory.getSearchIndex('3.x');
      } catch (error) {
        expect(error).toBeInstanceOf(VersionNotFoundError);
        if (error instanceof VersionNotFoundError) {
          expect(error.requestedVersion).toBe('3.x');
          expect(error.availableVersions).toHaveLength(2);
          expect(error.availableVersions[0].version).toBe('v1.0');
          expect(error.availableVersions[1].version).toBe('v2.0');
        }
      }
    });

    it('should return undefined when invalid version is requested without available versions', async () => {
      // Mock the version manager to return versioned site and invalid version without available versions
      const mockVersionManager = {
        detectVersioning: vi.fn().mockResolvedValue(true),
        resolveVersion: vi.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: undefined,
          error: 'Version detection failed'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Should return undefined instead of throwing
      const result = await factory.getSearchIndex('3.x');
      expect(result).toBeUndefined();
    });

    it('should return undefined when invalid version is requested with empty available versions', async () => {
      // Mock the version manager to return versioned site and invalid version with empty available versions
      const mockVersionManager = {
        detectVersioning: vi.fn().mockResolvedValue(true),
        resolveVersion: vi.fn().mockResolvedValue({
          valid: false,
          resolved: '3.x',
          available: [],
          error: 'Version not found'
        })
      };

      // Replace the version manager
      (factory as any).versionManager = mockVersionManager;

      // Should return undefined instead of throwing
      const result = await factory.getSearchIndex('3.x');
      expect(result).toBeUndefined();
    });

    it('should handle non-versioned sites correctly', async () => {
      // Create a factory for non-versioned site
      const nonVersionedFactory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
      
      // Mock successful fetch response
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          config: { lang: ['en'], separator: ' ', pipeline: [] },
          docs: [
            { location: 'index/', title: 'Home', text: 'Welcome to the docs' }
          ]
        })
      } as any);

      // Should return search index for non-versioned site
      const result = await nonVersionedFactory.getSearchIndex('3.x');
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
    });
  });

  describe('Non-versioned Site Index Loading', () => {
    let nonVersionedFactory: SearchIndexFactory;

    beforeEach(() => {
      nonVersionedFactory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
    });

    it('should load index from first successful path (search/search_index.json)', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
      expect(mockFetchService.fetch).toHaveBeenCalledWith(
        'https://docs.example.com/search/search_index.json',
        expect.any(Object)
      );
    });

    it('should try fallback paths when primary path fails', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      // First two paths fail, third succeeds
      mockFetchService.fetch
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue(mockIndex)
        } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(3);
      expect(mockFetchService.fetch).toHaveBeenNthCalledWith(
        1,
        'https://docs.example.com/search/search_index.json',
        expect.any(Object)
      );
      expect(mockFetchService.fetch).toHaveBeenNthCalledWith(
        2,
        'https://docs.example.com/search_index.json',
        expect.any(Object)
      );
      expect(mockFetchService.fetch).toHaveBeenNthCalledWith(
        3,
        'https://docs.example.com/assets/javascripts/search_index.json',
        expect.any(Object)
      );
    });

    it('should throw error when all paths fail', async () => {
      // All paths fail
      mockFetchService.fetch.mockRejectedValue(new Error('Not found'));

      await expect(nonVersionedFactory.getSearchIndex()).rejects.toThrow('Not found');
      
      // Should have tried all 4 paths
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(4);
    });

    it('should cache loaded index for non-versioned site', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      // First call should fetch
      const result1 = await nonVersionedFactory.getSearchIndex();
      expect(result1).toBeDefined();
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await nonVersionedFactory.getSearchIndex();
      expect(result2).toBeDefined();
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
      
      // Results should be the same
      expect(result1).toBe(result2);
    });

    it('should ignore version parameter for non-versioned sites', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      // Request with version should be ignored
      const result = await nonVersionedFactory.getSearchIndex('1.0.0');
      
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
    });

    it('should load index from last fallback path (js/search_index.json)', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      // First three paths fail, last succeeds
      mockFetchService.fetch
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue(mockIndex)
        } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(mockFetchService.fetch).toHaveBeenCalledTimes(4);
      expect(mockFetchService.fetch).toHaveBeenNthCalledWith(
        4,
        'https://docs.example.com/js/search_index.json',
        expect.any(Object)
      );
    });
  });

  describe('Cache Operations', () => {
    let versionedFactory: SearchIndexFactory;
    const mockVersions = [
      { version: 'latest', title: 'Latest', aliases: ['main'] },
      { version: '1.0.0', title: 'Version 1.0', aliases: [] }
    ];

    beforeEach(() => {
      versionedFactory = new SearchIndexFactory('https://docs.example.com', { 
        hasVersioning: true,
        availableVersions: mockVersions
      });
    });

    it('should return cached index on subsequent calls for versioned site', async () => {
      // Mock version manager
      const mockVersionManager = {
        resolveVersion: vi.fn().mockResolvedValue({
          valid: true,
          resolved: 'latest',
          isDefault: true,
          available: mockVersions
        })
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      // Mock index loader
      const mockIndexLoader = {
        loadIndex: vi.fn().mockResolvedValue({
          version: 'latest',
          url: 'https://docs.example.com/latest/search/search_index.json',
          index: {},
          documents: new Map(),
          metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: true }
        })
      };
      (versionedFactory as any).indexLoader = mockIndexLoader;

      // First call - should load
      const result1 = await versionedFactory.getSearchIndex('latest');
      expect(result1).toBeDefined();
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await versionedFactory.getSearchIndex('latest');
      expect(result2).toBeDefined();
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(1); // Still 1

      // Results should be the same object
      expect(result1).toBe(result2);
    });

    it('should clear cache for specific version', async () => {
      // Mock version manager
      const mockVersionManager = {
        resolveVersion: vi.fn().mockResolvedValue({
          valid: true,
          resolved: '1.0.0',
          isDefault: false,
          available: mockVersions
        })
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      // Mock index loader
      const mockIndexLoader = {
        loadIndex: vi.fn().mockResolvedValue({
          version: '1.0.0',
          url: 'https://docs.example.com/1.0.0/search/search_index.json',
          index: {},
          documents: new Map(),
          metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: false }
        })
      };
      (versionedFactory as any).indexLoader = mockIndexLoader;

      // Load index
      await versionedFactory.getSearchIndex('1.0.0');
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(1);

      // Clear cache for this version
      await versionedFactory.clearCache('1.0.0');

      // Next call should reload
      await versionedFactory.getSearchIndex('1.0.0');
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache when no version specified', async () => {
      // Mock version manager
      const mockVersionManager = {
        resolveVersion: vi.fn()
          .mockResolvedValueOnce({
            valid: true,
            resolved: 'latest',
            isDefault: true,
            available: mockVersions
          })
          .mockResolvedValueOnce({
            valid: true,
            resolved: '1.0.0',
            isDefault: false,
            available: mockVersions
          })
          .mockResolvedValueOnce({
            valid: true,
            resolved: 'latest',
            isDefault: true,
            available: mockVersions
          })
          .mockResolvedValueOnce({
            valid: true,
            resolved: '1.0.0',
            isDefault: false,
            available: mockVersions
          })
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      // Mock index loader
      const mockIndexLoader = {
        loadIndex: vi.fn()
          .mockResolvedValueOnce({
            version: 'latest',
            url: 'https://docs.example.com/latest/search/search_index.json',
            index: {},
            documents: new Map(),
            metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: true }
          })
          .mockResolvedValueOnce({
            version: '1.0.0',
            url: 'https://docs.example.com/1.0.0/search/search_index.json',
            index: {},
            documents: new Map(),
            metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: false }
          })
          .mockResolvedValueOnce({
            version: 'latest',
            url: 'https://docs.example.com/latest/search/search_index.json',
            index: {},
            documents: new Map(),
            metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: true }
          })
          .mockResolvedValueOnce({
            version: '1.0.0',
            url: 'https://docs.example.com/1.0.0/search/search_index.json',
            index: {},
            documents: new Map(),
            metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: false }
          })
      };
      (versionedFactory as any).indexLoader = mockIndexLoader;

      // Load two different versions
      await versionedFactory.getSearchIndex('latest');
      await versionedFactory.getSearchIndex('1.0.0');
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(2);

      // Clear all cache
      await versionedFactory.clearCache();

      // Next calls should reload both
      await versionedFactory.getSearchIndex('latest');
      await versionedFactory.getSearchIndex('1.0.0');
      expect(mockIndexLoader.loadIndex).toHaveBeenCalledTimes(4);
    });

    it('should return cache statistics', () => {
      const stats = versionedFactory.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('memoryUsageMB');
      expect(stats).toHaveProperty('maxMemoryMB');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should track cache hits and misses', async () => {
      // Mock version manager
      const mockVersionManager = {
        resolveVersion: vi.fn().mockResolvedValue({
          valid: true,
          resolved: 'latest',
          isDefault: true,
          available: mockVersions
        })
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      // Mock index loader
      const mockIndexLoader = {
        loadIndex: vi.fn().mockResolvedValue({
          version: 'latest',
          url: 'https://docs.example.com/latest/search/search_index.json',
          index: {},
          documents: new Map(),
          metadata: { loadedAt: new Date(), size: 1000, documentCount: 1, isDefault: true }
        })
      };
      (versionedFactory as any).indexLoader = mockIndexLoader;

      // First call - cache miss
      await versionedFactory.getSearchIndex('latest');
      let stats = versionedFactory.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Second call - cache hit
      await versionedFactory.getSearchIndex('latest');
      stats = versionedFactory.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('MkDocs to Lunr Index Conversion', () => {
    let nonVersionedFactory: SearchIndexFactory;

    beforeEach(() => {
      nonVersionedFactory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
    });

    it('should convert MkDocs index with articles and sections', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'guide/', title: 'Guide', text: 'Guide content', tags: ['guide'] },
          { location: 'guide/#section1', title: 'Section 1', text: 'Section 1 content', tags: [] },
          { location: 'guide/#section2', title: 'Section 2', text: 'Section 2 content', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.documents).toBeDefined();
      expect(result?.documents.size).toBe(3);
      
      // Check article
      const article = result?.documents.get('guide/');
      expect(article).toBeDefined();
      expect(article?.title).toBe('Guide');
      expect(article?.isSection).toBe(false);
      
      // Check sections
      const section1 = result?.documents.get('guide/#section1');
      expect(section1).toBeDefined();
      expect(section1?.title).toBe('Section 1');
      expect(section1?.isSection).toBe(true);
      expect(section1?.parent).toBeDefined();
      expect(section1?.parent.title).toBe('Guide');
    });

    it('should handle MkDocs index with tags', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome', tags: ['intro', 'home'] },
          { location: 'api/', title: 'API', text: 'API docs', tags: ['api', 'reference'] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      const homeDoc = result?.documents.get('index/');
      expect(homeDoc?.tags).toEqual(['intro', 'home']);
      
      const apiDoc = result?.documents.get('api/');
      expect(apiDoc?.tags).toEqual(['api', 'reference']);
    });

    it('should handle MkDocs index without tags', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome' }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      const homeDoc = result?.documents.get('index/');
      expect(homeDoc?.tags).toEqual([]);
    });

    it('should create preview text from document content', async () => {
      const longText = 'A'.repeat(300);
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: longText, tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      const homeDoc = result?.documents.get('index/');
      expect(homeDoc?.preview).toBeDefined();
      expect(homeDoc?.preview.length).toBeLessThanOrEqual(203); // 200 chars + '...'
      expect(homeDoc?.preview).toContain('...');
    });

    it('should skip empty documents in index', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: '', title: '', text: '', tags: [] },
          { location: 'index/', title: 'Home', text: 'Welcome', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.index).toBeDefined();
      // Empty document should still be in documents map but not in searchable index
      expect(result?.documents.size).toBe(2);
    });

    it('should create searchable Lunr index', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home Page', text: 'Welcome to the documentation', tags: [] },
          { location: 'guide/', title: 'User Guide', text: 'Learn how to use the system', tags: ['tutorial'] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.index).toBeDefined();
      
      // Test that the index is searchable
      const searchResults = result?.index.search('guide');
      expect(searchResults).toBeDefined();
      expect(searchResults!.length).toBeGreaterThan(0);
    });

    it('should handle parent-child relationships correctly', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'guide/', title: 'Guide', text: 'Guide content', tags: [] },
          { location: 'guide/#intro', title: 'Introduction', text: 'Intro content', tags: [] },
          { location: 'guide/#advanced', title: 'Advanced', text: 'Advanced content', tags: [] },
          { location: 'api/', title: 'API', text: 'API content', tags: [] },
          { location: 'api/#methods', title: 'Methods', text: 'Methods content', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      
      // Check guide sections
      const intro = result?.documents.get('guide/#intro');
      expect(intro?.parent?.title).toBe('Guide');
      expect(intro?.parent?.location).toBe('guide/');
      
      const advanced = result?.documents.get('guide/#advanced');
      expect(advanced?.parent?.title).toBe('Guide');
      
      // Check API sections
      const methods = result?.documents.get('api/#methods');
      expect(methods?.parent?.title).toBe('API');
      expect(methods?.parent?.location).toBe('api/');
    });
  });

  describe('Index Size Estimation and Metadata', () => {
    let nonVersionedFactory: SearchIndexFactory;

    beforeEach(() => {
      nonVersionedFactory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
    });

    it('should estimate index size correctly', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome', tags: [] },
          { location: 'guide/', title: 'Guide', text: 'Guide content', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.metadata).toBeDefined();
      expect(result?.metadata.size).toBeGreaterThan(0);
      expect(result?.metadata.documentCount).toBe(2);
    });

    it('should include metadata with loadedAt timestamp', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const beforeLoad = new Date();
      const result = await nonVersionedFactory.getSearchIndex();
      const afterLoad = new Date();
      
      expect(result).toBeDefined();
      expect(result?.metadata.loadedAt).toBeDefined();
      expect(result?.metadata.loadedAt.getTime()).toBeGreaterThanOrEqual(beforeLoad.getTime());
      expect(result?.metadata.loadedAt.getTime()).toBeLessThanOrEqual(afterLoad.getTime());
    });

    it('should mark non-versioned index as default', async () => {
      const mockIndex = {
        config: { lang: ['en'], separator: ' ', pipeline: [] },
        docs: [
          { location: 'index/', title: 'Home', text: 'Welcome', tags: [] }
        ]
      };

      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await nonVersionedFactory.getSearchIndex();
      
      expect(result).toBeDefined();
      expect(result?.metadata.isDefault).toBe(true);
    });
  });

  describe('Backward Compatibility Methods', () => {
    let factory: SearchIndexFactory;
    const mockIndex = {
      config: { lang: ['en'], separator: ' ', pipeline: [] },
      docs: [
        { location: 'index/', title: 'Home', text: 'Welcome', tags: [] }
      ]
    };

    beforeEach(() => {
      factory = new SearchIndexFactory('https://docs.example.com', { hasVersioning: false });
    });

    it('should support getIndex() method for backward compatibility', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await factory.getIndex();
      
      expect(result).toBeDefined();
      expect(result?.version).toBe('default');
    });

    it('should support getIndex() with version parameter', async () => {
      mockFetchService.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockIndex)
      } as any);

      const result = await factory.getIndex('latest');
      
      expect(result).toBeDefined();
    });

    it('should support resolveVersion() method', async () => {
      const versionedFactory = new SearchIndexFactory('https://docs.example.com', { 
        hasVersioning: true,
        availableVersions: [
          { version: 'latest', title: 'Latest', aliases: ['main'] }
        ]
      });

      // Mock version manager
      const mockVersionManager = {
        resolveVersion: vi.fn().mockResolvedValue({
          valid: true,
          resolved: 'latest',
          isDefault: true,
          available: [{ version: 'latest', title: 'Latest', aliases: ['main'] }]
        })
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      const result = await versionedFactory.resolveVersion('latest');
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.resolved).toBe('latest');
      expect(result.available).toBeDefined();
    });

    it('should support getAvailableVersions() method', async () => {
      const versionedFactory = new SearchIndexFactory('https://docs.example.com', { 
        hasVersioning: true,
        availableVersions: [
          { version: 'latest', title: 'Latest', aliases: ['main'] },
          { version: '1.0.0', title: 'Version 1.0', aliases: [] }
        ]
      });

      // Mock version manager
      const mockVersionManager = {
        getAvailableVersions: vi.fn().mockResolvedValue([
          { version: 'latest', title: 'Latest', aliases: ['main'] },
          { version: '1.0.0', title: 'Version 1.0', aliases: [] }
        ])
      };
      (versionedFactory as any).versionManager = mockVersionManager;

      const result = await versionedFactory.getAvailableVersions();
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result![0].version).toBe('latest');
      expect(result![1].version).toBe('1.0.0');
    });
  });
});
