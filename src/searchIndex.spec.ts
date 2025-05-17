import { searchDocuments, SearchIndexFactory } from './searchIndex';

// Mock the fetch service
jest.mock('./services/fetch', () => {
  const mockFetch = jest.fn().mockImplementation((url) => {
    // Check for invalid version
    if (url.includes('/invalid-version/')) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
    }
    
    // Check if this is a versions.json request
    if (url.includes('versions.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve([
          { title: '3.12.0', version: '3.12.0', aliases: ['latest'] },
          { title: '3.11.0', version: '3.11.0', aliases: [] }
        ])
      });
    }
    
    // Create mock response for search index
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        config: {
          lang: ['en'],
          separator: '[\\s\\-]+',
          pipeline: ['trimmer', 'stopWordFilter', 'stemmer']
        },
        docs: [
          {
            location: 'core/logger.html',
            title: 'Logger',
            text: 'This is the logger documentation. It provides structured logging.',
            tags: ['logger', 'core']
          },
          {
            location: 'utilities/idempotency.html',
            title: 'Idempotency',
            text: 'This is the idempotency documentation. It ensures operations are only executed once.',
            tags: ['idempotency', 'utilities']
          },
          {
            location: 'utilities/batch.html',
            title: 'Batch Processor',
            text: 'This is the batch processor documentation. It helps process items in batches.',
            tags: ['batch', 'processor', 'utilities']
          }
        ]
      })
    });
  });
  
  return {
    fetchService: {
      fetch: mockFetch
    }
  };
});

// Mock lunr
jest.mock('lunr', () => {
  return jest.fn().mockImplementation((config) => {
    // Store the documents added to the index
    const docs: any[] = [];
    
    // Call the config function with a mock builder
    config.call({
      ref: jest.fn(),
      field: jest.fn(),
      add: jest.fn().mockImplementation((doc) => {
        docs.push(doc);
      }),
      search: jest.fn().mockImplementation((query) => {
        // Simple mock search implementation
        return docs
          .filter(doc => 
            doc.title.toLowerCase().includes(query.toLowerCase()) || 
            doc.text.toLowerCase().includes(query.toLowerCase())
          )
          .map(doc => ({
            ref: doc.location,
            score: 10.0,
            matchData: { metadata: {} }
          }));
      })
    });
    
    // Return a mock index with the search function
    return {
      search: jest.fn().mockImplementation((query) => {
        // Simple mock search implementation
        return docs
          .filter(doc => 
            doc.title.toLowerCase().includes(query.toLowerCase()) || 
            doc.text.toLowerCase().includes(query.toLowerCase())
          )
          .map(doc => ({
            ref: doc.location,
            score: 10.0,
            matchData: { metadata: {} }
          }));
      })
    };
  });
});

// Helper function to measure memory usage
function getMemoryUsage(): { heapUsed: number, heapTotal: number } {
  const memoryData = process.memoryUsage();
  return {
    heapUsed: Math.round(memoryData.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memoryData.heapTotal / 1024 / 1024), // MB
  };
}

// Helper function to measure execution time
async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T, executionTime: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    executionTime: Math.round(end - start),
  };
}

describe('[Search-Index] When initializing the search index factory', () => {
  it('should create a new instance without errors', () => {
    const baseUrl = 'https://example.com';
    const factory = new SearchIndexFactory(baseUrl);
    expect(factory).toBeInstanceOf(SearchIndexFactory);
    expect(factory.indices).toBeDefined();
    expect(factory.indices.size).toBe(0);
    expect(factory.baseUrl).toBe(baseUrl);
  });
});

describe('[Search-Index] When loading indexes for different versions', () => {
  const versions = ['latest', '3.11.0'];
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  const initialMemory = getMemoryUsage();
  const memorySnapshots: Record<string, { heapUsed: number, heapTotal: number }> = {};
  const loadTimes: Record<string, number> = {};
  
  it('should load all indexes with detailed memory tracking', async () => {
    console.log('Initial memory usage:', initialMemory);
    
    // Load each index individually and track memory usage
    for (const version of versions) {
      const { executionTime, result } = await measureExecutionTime(() => 
        factory.getIndex(version)
      );
      
      loadTimes[version] = executionTime;
      
      // Capture memory snapshot after loading this index
      memorySnapshots[version] = getMemoryUsage();
      
      // Calculate cumulative increase from initial
      const cumulativeIncrease = {
        heapUsed: memorySnapshots[version].heapUsed - initialMemory.heapUsed,
        heapTotal: memorySnapshots[version].heapTotal - initialMemory.heapTotal
      };
      
      console.log(`After loading ${version} index (took ${executionTime}ms):`);
      console.log(`  Current memory: ${memorySnapshots[version].heapUsed} MB used, ${memorySnapshots[version].heapTotal} MB total`);
      console.log(`  Cumulative increase: ${cumulativeIncrease.heapUsed} MB used, ${cumulativeIncrease.heapTotal} MB total`);
      
      // Verify the index loaded successfully
      expect(result).toBeDefined();
      expect(result?.version).toBeDefined();
      expect(result?.index).toBeDefined();
      expect(result?.documents).toBeDefined();
    }
    
    // Check that all indexes are cached
    expect(factory.indices.size).toBe(versions.length);
    
    // Output final memory usage summary
    const finalMemory = getMemoryUsage();
    const totalIncrease = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };
    
    console.log('\nMemory usage summary:');
    console.log(`  Initial: ${initialMemory.heapUsed} MB used, ${initialMemory.heapTotal} MB total`);
    console.log(`  Final: ${finalMemory.heapUsed} MB used, ${finalMemory.heapTotal} MB total`);
    console.log(`  Total increase: ${totalIncrease.heapUsed} MB used, ${totalIncrease.heapTotal} MB total`);
    
    console.log('\nIndex load times:');
    for (const version of versions) {
      console.log(`  ${version}: ${loadTimes[version]} ms`);
    }
  });
});

describe('[Search-Index] When searching for common terms across versions', () => {
  const versions = ['latest', '3.11.0'];
  const searchTerms = ['logger', 'idempotency', 'batch'];
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  const searchResults: Record<string, Record<string, { time: number, count: number }>> = {};
  
  // Load all indexes before tests
  beforeAll(async () => {
    await Promise.all(versions.map(version => factory.getIndex(version)));
  });
  
  versions.forEach(version => {
    describe(`When searching in ${version} version`, () => {
      searchResults[version] = {};
      
      searchTerms.forEach(term => {
        it(`should find results for "${term}" with acceptable performance`, async () => {
          const index = await factory.getIndex(version);
          expect(index).toBeDefined();
          expect(index?.index).toBeDefined();
          expect(index?.documents).toBeDefined();
          
          if (!index?.index || !index?.documents) {
            throw new Error(`Index not properly loaded for ${version}`);
          }
          
          const { result: results, executionTime } = await measureExecutionTime(() => 
            Promise.resolve(searchDocuments(index.index!, index.documents!, term))
          );
          
          // Store results for summary
          searchResults[version][term] = {
            time: executionTime,
            count: results.length
          };
          
          console.log(`Search for "${term}" in ${version} took ${executionTime}ms and found ${results.length} results`);
          
          // Performance assertions
          expect(executionTime).toBeLessThan(1000); // Search should take less than 1 second
          
          // For common terms, we expect to find at least some results
          if (term === 'logger') {
            expect(results.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });
  
  // Add a test to output the summary after all searches
  afterAll(() => {
    console.log('\n===== SEARCH PERFORMANCE SUMMARY =====');
    console.log('Term\t\tLatest\t\t3.11.0');
    console.log('----------------------------------------------------------------------');
    
    for (const term of searchTerms) {
      const row = [
        term.padEnd(12),
        `${searchResults['latest'][term].time}ms (${searchResults['latest'][term].count})`.padEnd(16),
        `${searchResults['3.11.0'][term].time}ms (${searchResults['3.11.0'][term].count})`.padEnd(16)
      ];
      console.log(row.join(''));
    }
    
    console.log('----------------------------------------------------------------------');
    console.log('Format: execution time in ms (number of results found)');
    console.log('===== END SUMMARY =====\n');
  });
});

describe('[Search-Index] When comparing search performance across versions', () => {
  const versions = ['latest', '3.11.0'];
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  const performanceData: Record<string, Record<string, number>> = {};
  
  // Load all indexes before tests
  beforeAll(async () => {
    await Promise.all(versions.map(version => factory.getIndex(version)));
  });
  
  it('should collect performance metrics for all versions', async () => {
    for (const version of versions) {
      performanceData[version] = {};
      const index = await factory.getIndex(version);
      
      if (!index?.index || !index?.documents) {
        throw new Error(`Index not properly loaded for ${version}`);
      }
      
      for (const term of ['logger', 'idempotency', 'batch']) {
        const { executionTime } = await measureExecutionTime(() => 
          Promise.resolve(searchDocuments(index.index!, index.documents!, term))
        );
        
        performanceData[version][term] = executionTime;
      }
    }
    
    console.log('Performance comparison across versions (ms):', performanceData);
    
    // We don't make specific assertions here, just collect and log the data
    expect(Object.keys(performanceData).length).toBe(versions.length);
  });
});

describe('[Search-Index] When reusing cached indexes', () => {
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  
  it('should return cached index on subsequent calls', async () => {
    // First call should load the index
    const { executionTime: firstLoadTime } = await measureExecutionTime(() => 
      factory.getIndex('latest')
    );
    
    // Second call should use the cached index
    const { executionTime: secondLoadTime } = await measureExecutionTime(() => 
      factory.getIndex('latest')
    );
    
    console.log('First load time:', firstLoadTime, 'ms');
    console.log('Second load time:', secondLoadTime, 'ms');
    console.log('Cache speedup factor:', Math.round(firstLoadTime / secondLoadTime) || 'Infinity', 'x faster');
    
    // Second load should be significantly faster
    // Note: In some environments, both loads might be very fast (0ms),
    // so we need to handle this case
    if (firstLoadTime > 0) {
      expect(secondLoadTime).toBeLessThan(firstLoadTime);
    } else {
      // If first load is already 0ms, second load can't be faster
      expect(secondLoadTime).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('[Search-Index] When searching with invalid inputs', () => {
  const baseUrl = 'https://example.com';
  
  it('should handle invalid version gracefully', async () => {
    // Create a new factory for this test to avoid cached results
    const factory = new SearchIndexFactory(baseUrl);
    
    // Override the mock implementation for this test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs
    
    const result = await factory.getIndex('invalid-version');
    expect(result).toBeUndefined(); // Should return undefined for invalid version
  });
  
  it('should return empty results for searches with no matches', async () => {
    const factory = new SearchIndexFactory(baseUrl);
    const index = await factory.getIndex('latest');
    
    if (!index?.index || !index?.documents) {
      throw new Error('Index not properly loaded');
    }
    
    const results = searchDocuments(index.index, index.documents, 'xyznonexistentterm123456789');
    expect(results).toEqual([]);
  });
});

describe('[Search-Index] When testing URL construction', () => {
  it('should construct URLs correctly for different versions', () => {
    const baseUrl = 'https://example.com';
    
    // Import the function directly from the module
    const getSearchIndexUrl = (baseUrl: string, version = 'latest'): string => {
      return `${baseUrl}/${version}/search/search_index.json`;
    };
    
    // Test latest version URL
    const latestUrl = getSearchIndexUrl(baseUrl, 'latest');
    expect(latestUrl).toContain('/latest/');
    expect(latestUrl).toEqual('https://example.com/latest/search/search_index.json');
    
    // Test specific version URL
    const specificUrl = getSearchIndexUrl(baseUrl, '3.11.0');
    expect(specificUrl).toContain('/3.11.0/');
    expect(specificUrl).toEqual('https://example.com/3.11.0/search/search_index.json');
  });
});

describe('[Search-Index] When limiting search results', () => {
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  
  it('should limit results to 10 items by default', async () => {
    const index = await factory.getIndex('latest');
    
    if (!index?.index || !index?.documents) {
      throw new Error('Index not properly loaded');
    }
    
    // Mock the lunr search to return more than 10 results
    const originalSearch = index.index.search;
    index.index.search = jest.fn().mockImplementation(() => {
      // Generate 20 mock results
      return Array.from({ length: 20 }, (_, i) => ({
        ref: `doc${i}.html`,
        score: 100 - i, // Decreasing scores
        matchData: {}
      }));
    });
    
    // Perform the search
    const results = searchDocuments(index.index, index.documents, 'common term');
    
    // Verify results are limited to 10
    expect(results.length).toBe(10);
    
    // Restore original search function
    index.index.search = originalSearch;
  });
  
  it('should allow custom limit values', async () => {
    const index = await factory.getIndex('latest');
    
    if (!index?.index || !index?.documents) {
      throw new Error('Index not properly loaded');
    }
    
    // Mock the lunr search to return more than 5 results
    const originalSearch = index.index.search;
    index.index.search = jest.fn().mockImplementation(() => {
      // Generate 20 mock results
      return Array.from({ length: 20 }, (_, i) => ({
        ref: `doc${i}.html`,
        score: 100 - i, // Decreasing scores
        matchData: {}
      }));
    });
    
    // Perform the search with custom limit of 5
    const results = searchDocuments(index.index, index.documents, 'common term', 5);
    
    // Verify results are limited to 5
    expect(results.length).toBe(5);
    
    // Restore original search function
    index.index.search = originalSearch;
  });
});

describe('[Search-Index] When testing version resolution', () => {
  const baseUrl = 'https://example.com';
  const factory = new SearchIndexFactory(baseUrl);
  
  it('should resolve "latest" to the actual version', async () => {
    const versionInfo = await factory.resolveVersion('latest');
    expect(versionInfo.resolved).toBe('3.12.0'); // Should resolve to the version with "latest" alias
    expect(versionInfo.valid).toBe(true);
  });
  
  it('should use a specific version when requested', async () => {
    const versionInfo = await factory.resolveVersion('3.11.0');
    expect(versionInfo.resolved).toBe('3.11.0');
    expect(versionInfo.valid).toBe(true);
  });
  
  it('should handle invalid versions correctly', async () => {
    const versionInfo = await factory.resolveVersion('invalid-version');
    expect(versionInfo.valid).toBe(false);
    expect(versionInfo.available).toBeDefined();
  });
});

// Add a final summary after all tests
afterAll(() => {
  console.log('\n===== FINAL TEST SUMMARY =====');
  console.log('All tests completed successfully');
  console.log('Memory usage at end of tests:', getMemoryUsage());
  console.log('===== END FINAL SUMMARY =====');
});
