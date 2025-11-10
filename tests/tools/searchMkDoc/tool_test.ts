import { SEARCH_CONFIDENCE_THRESHOLD } from '../../../src/constants';
import { searchDocuments } from '../../../src/shared/searchIndex';
import { searchMkDoc } from '../../../src/tools/searchMkDoc/tool';
import { buildResponse } from '../../../src/tools/shared/buildResponse';

import { beforeEach,describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/shared/searchIndex');
jest.mock('../../../src/tools/shared/buildResponse');
jest.mock('../../../src/services/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }
}));

const mockSearchDocuments = searchDocuments as jest.MockedFunction<typeof searchDocuments>;
const mockBuildResponse = buildResponse as jest.MockedFunction<typeof buildResponse>;

describe('[SearchMkDoc Tool]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildResponse.mockImplementation(({ content }) => ({ content } as any));
  });

  describe('When searching successfully', () => {
    it('should return formatted results above confidence threshold', async () => {
      const mockResults = {
        query: 'logger',
        version: 'latest',
        results: [
          {
            ref: 'core/logger/',
            score: 0.8,
            document: {
              title: 'Logger',
              preview: 'Logger utility for...',
              isSection: false
            }
          },
          {
            ref: 'core/logger/#config',
            score: 0.6,
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
            score: 0.05, // Below threshold (0.1)
            document: {
              title: 'Low Score',
              preview: 'Low relevance...',
              isSection: false
            }
          }
        ],
        total: 3
      };

      mockSearchDocuments.mockResolvedValue(mockResults);

      await searchMkDoc({
        search: 'logger',
        version: 'latest',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockSearchDocuments).toHaveBeenCalledWith(
        'https://docs.example.com',
        'logger',
        'latest'
      );

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          query: 'logger',
          version: 'latest',
          total: 2, // Only results above threshold
          results: [
            {
              title: 'Logger',
              url: 'https://docs.example.com/latest/core/logger/',
              score: 0.8,
              preview: 'Logger utility for...',
              location: 'core/logger/'
            },
            {
              title: 'Configuration',
              url: 'https://docs.example.com/latest/core/logger/#config',
              score: 0.6,
              preview: 'Configure the logger...',
              location: 'core/logger/#config',
              parentArticle: {
                title: 'Logger',
                location: 'core/logger/',
                url: 'https://docs.example.com/latest/core/logger/'
              }
            }
          ]
        }
      });
    });

    it('should use default version when not specified', async () => {
      mockSearchDocuments.mockResolvedValue({
        query: 'test',
        version: 'latest',
        results: [],
        total: 0
      });

      await searchMkDoc({
        search: 'test',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockSearchDocuments).toHaveBeenCalledWith(
        'https://docs.example.com',
        'test',
        'latest'
      );
    });

    it('should handle results without documents gracefully', async () => {
      mockSearchDocuments.mockResolvedValue({
        query: 'test',
        version: 'latest',
        results: [
          {
            ref: 'some/page/',
            score: 0.8,
            document: null
          }
        ],
        total: 1
      });

      await searchMkDoc({
        search: 'test',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          query: 'test',
          version: 'latest',
          total: 1,
          results: [
            {
              title: 'some/page/',
              url: 'https://docs.example.com/latest/some/page/',
              score: 0.8,
              preview: '',
              location: 'some/page/'
            }
          ]
        }
      });
    });
  });

  describe('When search fails', () => {
    it('should handle search errors gracefully', async () => {
      const error = new Error('Search index not found');
      mockSearchDocuments.mockRejectedValue(error);

      await searchMkDoc({
        search: 'test',
        docsUrl: 'https://docs.example.com'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: 'Search failed: Search index not found',
        isError: true
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockSearchDocuments.mockRejectedValue('String error');

      await searchMkDoc({
        search: 'test',
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
      mockSearchDocuments.mockResolvedValue({
        query: 'test',
        version: 'latest',
        results: [
          { ref: 'high/', score: SEARCH_CONFIDENCE_THRESHOLD + 0.1, document: { title: 'High' } },
          { ref: 'exact/', score: SEARCH_CONFIDENCE_THRESHOLD, document: { title: 'Exact' } },
          { ref: 'low/', score: SEARCH_CONFIDENCE_THRESHOLD - 0.1, document: { title: 'Low' } }
        ],
        total: 3
      });

      await searchMkDoc({
        search: 'test',
        docsUrl: 'https://docs.example.com'
      });

      const call = mockBuildResponse.mock.calls[0][0];
      expect(call.content.total).toBe(2); // Only high and exact
      expect(call.content.results).toHaveLength(2);
      expect(call.content.results[0].title).toBe('High');
      expect(call.content.results[1].title).toBe('Exact');
    });
  });
});
