
import { VersionNotFoundError } from '../../../src/shared/errors/VersionErrors';
import { SearchIndexFactory } from '../../../src/shared/SearchIndexFactory';
import { searchMkDoc } from '../../../src/tools/searchMkDoc/tool';
import { buildResponse } from '../../../src/tools/shared/buildResponse';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/shared/SearchIndexFactory');
jest.mock('../../../src/tools/shared/buildResponse');
jest.mock('../../../src/shared/versionDetection', () => ({
  buildVersionedUrl: jest.fn((baseUrl, path, version) => {
    if (version) {
      return Promise.resolve(`${baseUrl}/${version}/${path}`);
    }
    return Promise.resolve(`${baseUrl}/${path}`);
  }),
  detectVersioning: jest.fn(() => Promise.resolve(true))
}));
jest.mock('../../../src/services/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }
}));

const MockedSearchIndexFactory = SearchIndexFactory as jest.MockedClass<typeof SearchIndexFactory>;
const mockBuildResponse = buildResponse as jest.MockedFunction<typeof buildResponse>;

describe('[SearchMkDoc Tool]', () => {
  let mockFactory: jest.Mocked<SearchIndexFactory>;
  let mockSearchIndex: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildResponse.mockImplementation(({ content }) => ({ content } as any));
    
    // Create mock search index
    mockSearchIndex = {
      index: {
        search: jest.fn()
      },
      documents: new Map()
    };
    
    // Create mock factory
    mockFactory = {
      getSearchIndex: jest.fn().mockResolvedValue(mockSearchIndex)
    } as any;
    
    MockedSearchIndexFactory.mockImplementation(() => mockFactory);
  });

  describe('When searching successfully', () => {
    it('should return formatted results above confidence threshold', async () => {
      // Setup mock search results
      const mockSearchResults = [
        {
          ref: 'core/logger/',
          score: 0.8,
          originalScore: 0.8,
          document: {
            title: 'Logger',
            preview: 'Logger utility for...',
            isSection: false
          }
        },
        {
          ref: 'core/logger/#config',
          score: 0.6,
          originalScore: 0.6,
          document: {
            title: 'Configuration',
            preview: 'Configure the logger...',
            isSection: true,
            parent: {
              title: 'Logger',
              location: 'core/logger/'
            }
          }
        },
        {
          ref: 'other/low-score/',
          score: 0.05, // Below threshold
          originalScore: 0.05,
          document: {
            title: 'Low Score',
            preview: 'Low relevance...',
            isSection: false
          }
        }
      ];

      // Setup mock documents map
      mockSearchIndex.documents.set('core/logger/', mockSearchResults[0].document);
      mockSearchIndex.documents.set('core/logger/#config', mockSearchResults[1].document);
      mockSearchIndex.documents.set('other/low-score/', mockSearchResults[2].document);
      
      // Mock the search function
      mockSearchIndex.index.search.mockReturnValue(mockSearchResults);

      await searchMkDoc({
        search: 'logger',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockFactory.getSearchIndex).toHaveBeenCalledWith('latest');
      expect(mockSearchIndex.index.search).toHaveBeenCalledWith('logger');

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          query: 'logger',
          version: 'latest',
          total: 2, // Only results above threshold
          results: expect.arrayContaining([
            expect.objectContaining({
              title: 'Logger',
              url: 'https://docs.example.com/latest/core/logger/',
              score: expect.any(Number),
              preview: 'Logger utility for...',
              location: 'core/logger/'
            }),
            expect.objectContaining({
              title: 'Configuration',
              url: 'https://docs.example.com/latest/core/logger/#config',
              score: expect.any(Number),
              preview: 'Configure the logger...',
              location: 'core/logger/#config',
              parentArticle: expect.objectContaining({
                title: 'Logger',
                location: 'core/logger/',
                url: 'https://docs.example.com/latest/core/logger/'
              })
            })
          ])
        }
      });
    });

    it('should use default version when not specified', async () => {
      const mockSearchResults = [
        {
          ref: 'test/',
          score: 0.8,
          originalScore: 0.8,
          document: {
            title: 'Test',
            preview: 'Test content...',
            isSection: false
          }
        }
      ];

      mockSearchIndex.documents.set('test/', mockSearchResults[0].document);
      mockSearchIndex.index.search.mockReturnValue(mockSearchResults);

      await searchMkDoc({
        search: 'test',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockFactory.getSearchIndex).toHaveBeenCalledWith(undefined);
      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: expect.objectContaining({
          query: 'test',
          version: undefined,
          total: 1
        })
      });
    });

    it('should handle results without documents gracefully', async () => {
      const mockSearchResults = [
        {
          ref: 'missing-doc/',
          score: 0.8,
          originalScore: 0.8,
          document: undefined
        }
      ];

      mockSearchIndex.index.search.mockReturnValue(mockSearchResults);

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({
              title: 'missing-doc/',
              preview: ''
            })
          ])
        })
      });
    });
  });

  describe('When search fails', () => {
    it('should handle search errors gracefully', async () => {
      const error = new Error('Search index not found');
      mockFactory.getSearchIndex.mockRejectedValue(error);

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: 'Search failed: Search index not found',
        isError: true
      });
    });

    it('should handle version not found errors with available versions', async () => {
      const availableVersions = [
        { version: 'v1.0', title: 'Version 1.0', aliases: ['1.0'] },
        { version: 'v2.0', title: 'Version 2.0', aliases: ['2.0', 'latest'] }
      ];
      
      const error = new VersionNotFoundError('v3.0', availableVersions);
      mockFactory.getSearchIndex.mockRejectedValue(error);

      await searchMkDoc({
        search: 'test',
        version: 'v3.0',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          error: "Version 'v3.0' not found. Available versions: v1.0, v2.0",
          requestedVersion: 'v3.0',
          availableVersions: [
            { version: 'v1.0', title: 'Version 1.0', aliases: ['1.0'] },
            { version: 'v2.0', title: 'Version 2.0', aliases: ['2.0', 'latest'] }
          ]
        },
        isError: true
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFactory.getSearchIndex.mockRejectedValue('String error');

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: 'Search failed: String error',
        isError: true
      });
    });
  });

  describe('When filtering by confidence threshold', () => {
    it('should only include results above threshold', async () => {
      const mockSearchResults = [
        {
          ref: 'high-score/',
          score: 0.8,
          originalScore: 0.8,
          document: { title: 'High Score', preview: 'High relevance...', isSection: false }
        },
        {
          ref: 'medium-score/',
          score: 0.15,
          originalScore: 0.15,
          document: { title: 'Medium Score', preview: 'Medium relevance...', isSection: false }
        },
        {
          ref: 'low-score/',
          score: 0.05,
          originalScore: 0.05,
          document: { title: 'Low Score', preview: 'Low relevance...', isSection: false }
        }
      ];

      mockSearchResults.forEach(result => {
        mockSearchIndex.documents.set(result.ref, result.document);
      });
      mockSearchIndex.index.search.mockReturnValue(mockSearchResults);

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: expect.objectContaining({
          total: 2, // Only high-score and medium-score above threshold
          results: expect.arrayContaining([
            expect.objectContaining({ title: 'High Score' }),
            expect.objectContaining({ title: 'Medium Score' })
          ])
        })
      });
    });
  });

  describe('When search index is unavailable', () => {
    it('should handle missing search index', async () => {
      mockFactory.getSearchIndex.mockResolvedValue(null);

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: 'Search failed: No search index available for version: latest',
        isError: true
      });
    });

    it('should handle missing index components', async () => {
      mockFactory.getSearchIndex.mockResolvedValue({
        index: null,
        documents: null
      } as any);

      await searchMkDoc({
        search: 'test',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: 'Search failed: No search index available for version: latest',
        isError: true
      });
    });
  });
});
