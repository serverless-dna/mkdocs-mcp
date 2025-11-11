import { fetchDocPage } from '../../../src/fetch-doc';
import { fetchMkDoc } from '../../../src/tools/fetchMkDoc/tool';
import { buildResponse } from '../../../src/tools/shared/buildResponse';

import { beforeEach,describe, expect, it } from 'vitest';

// Mock dependencies
vi.mock('../../../src/fetch-doc');
vi.mock('../../../src/tools/shared/buildResponse');
vi.mock('../../../src/services/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

const mockFetchDocPage = fetchDocPage as vi.MockedFunction<typeof fetchDocPage>;
const mockBuildResponse = buildResponse as vi.MockedFunction<typeof buildResponse>;

describe('[FetchMkDoc Tool]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildResponse.mockImplementation(({ content }) => ({ content } as any));
  });

  describe('When fetching successfully', () => {
    it('should return the fetched document content', async () => {
      const mockResult = {
        title: 'Logger Documentation',
        content: '# Logger\n\nThis is the logger documentation...',
        url: 'https://docs.example.com/latest/core/logger/',
        version: 'latest'
      };

      mockFetchDocPage.mockResolvedValue(mockResult);

      await fetchMkDoc({
        url: 'https://docs.example.com/latest/core/logger/'
      });

      expect(mockFetchDocPage).toHaveBeenCalledWith(
        'https://docs.example.com/latest/core/logger/'
      );

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: mockResult
      });
    });

    it('should handle different URL formats', async () => {
      const mockResult = {
        title: 'Configuration',
        content: '# Configuration\n\nConfigure your logger...',
        url: 'https://docs.example.com/v2.0/advanced/config/',
        version: 'v2.0'
      };

      mockFetchDocPage.mockResolvedValue(mockResult);

      await fetchMkDoc({
        url: 'https://docs.example.com/v2.0/advanced/config/'
      });

      expect(mockFetchDocPage).toHaveBeenCalledWith(
        'https://docs.example.com/v2.0/advanced/config/'
      );
    });
  });

  describe('When fetch fails', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Page not found');
      mockFetchDocPage.mockRejectedValue(error);

      await fetchMkDoc({
        url: 'https://docs.example.com/nonexistent/'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          title: 'Error',
          markdown: 'Fetch failed: Page not found',
          code_examples: [],
          url: 'https://docs.example.com/nonexistent/'
        },
        isError: true
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFetchDocPage.mockRejectedValue('Network timeout');

      await fetchMkDoc({
        url: 'https://docs.example.com/timeout/'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          title: 'Error',
          markdown: 'Fetch failed: Network timeout',
          code_examples: [],
          url: 'https://docs.example.com/timeout/'
        },
        isError: true
      });
    });

    it('should handle invalid URLs', async () => {
      const error = new Error('Invalid URL format');
      mockFetchDocPage.mockRejectedValue(error);

      await fetchMkDoc({
        url: 'invalid://url'
      });

      expect(mockBuildResponse).toHaveBeenCalledWith({
        content: {
          title: 'Error',
          markdown: 'Fetch failed: Invalid URL format',
          code_examples: [],
          url: 'invalid://url'
        },
        isError: true
      });
    });
  });
});
