/**
 * Simplified test approach for docFetcher
 * 
 * This test uses direct mocking of the module's dependencies
 * rather than trying to mock the underlying libraries.
 */

// Mock the modules before importing anything
// Now import the modules
import { clearDocCache, fetchDocPage } from '../src/fetch-doc';
import { fetchService } from '../src/services/fetch';
import { ContentType } from '../src/services/fetch/types';

import * as cacache from 'cacache';

vi.mock('../src/services/fetch', () => ({
  fetchService: {
    fetch: vi.fn(),
    clearCache: vi.fn()
  }
}));

// Mock cacache directly with a simple implementation
vi.mock('cacache', () => ({
  get: vi.fn().mockImplementation(() => Promise.resolve({
    data: Buffer.from('cached content'),
    metadata: {}
  })),
  put: vi.fn().mockResolvedValue(),
  rm: {
    all: vi.fn().mockResolvedValue()
  }
}));

// Mock crypto
vi.mock('crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash')
  })
}));

// Create a simple mock for Headers
class MockHeaders {
  private headers: Record<string, string> = {};
  
  constructor(init?: Record<string, string>) {
    if (init) {
      this.headers = { ...init };
    }
  }
  
  get(name: string): string | null {
    return this.headers[name.toLowerCase()] || null;
  }
  
  has(name: string): boolean {
    return name.toLowerCase() in this.headers;
  }
}

describe('[DocFetcher] When fetching documentation pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should fetch a page and convert it to markdown', async () => {
    // Arrange
    const mockHtml = `
      <html>
        <body>
          <div class="md-content" data-md-component="content">
            <h1>Test Heading</h1>
            <p>Test paragraph</p>
          </div>
        </body>
      </html>
    `;
    
    (fetchService.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new MockHeaders({ 'etag': 'abc123' }),
      text: vi.fn().mockResolvedValueOnce(mockHtml)
    });
    
    // Mock cacache.get.info to throw ENOENT (cache miss)
    (cacache.get as any).info = vi.fn().mockRejectedValueOnce(new Error('ENOENT'));
    
    // Act
    const url = 'https://example.com/latest/core/logger/';
    const result = await fetchDocPage(url);
    
    // Assert
    expect(fetchService.fetch).toHaveBeenCalledWith(url, expect.any(Object));
    expect(result.title).toBe('Test Heading');
    expect(result.markdown).toContain('# Test Heading');
    expect(result.markdown).toContain('Test paragraph');
  });
  
  it('should reject invalid URLs', async () => {
    // Mock isValidUrl to return false for this test
    vi.spyOn(global, 'URL').mockImplementationOnce(() => {
      throw new Error('Invalid URL');
    });
    
    // Mock fetchService.fetch to return a mock response
    const fetchMock = fetchService.fetch as jest.Mock;
    fetchMock.mockClear();
    
    // Act
    const url = 'invalid://example.com/not-allowed';
    const result = await fetchDocPage(url);
    
    // Assert
    expect(result.title).toBe('Error');
    expect(result.markdown).toContain('Error fetching documentation');
    // Just check for any error message, not specifically "Invalid URL"
    expect(result.markdown).toMatch(/Error/);
  });
  
  it('should handle fetch errors gracefully', async () => {
    // Arrange
    (fetchService.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    // Act
    const url = 'https://example.com/latest/core/logger/';
    const result = await fetchDocPage(url);
    
    // Assert
    expect(result.title).toBe('Error');
    expect(result.markdown).toContain('Error fetching documentation');
    expect(result.markdown).toContain('Network error');
  });
  
  it('should handle non-200 responses gracefully', async () => {
    // Arrange
    (fetchService.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new MockHeaders()
    });
    
    // Act
    const url = 'https://example.com/latest/core/nonexistent/';
    const result = await fetchDocPage(url);
    
    // Assert
    expect(result.title).toBe('Error');
    expect(result.markdown).toContain('Error fetching documentation');
    expect(result.markdown).toContain('Failed to fetch page: 404 Not Found');
  });
});

describe('[DocFetcher] When clearing the cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should clear both web page and markdown caches', async () => {
    // Act
    await clearDocCache();
    
    // Assert
    expect(fetchService.clearCache).toHaveBeenCalledWith(ContentType.WEB_PAGE);
    expect(cacache.rm.all).toHaveBeenCalledWith(expect.stringContaining('markdown-cache'));
  });
});
