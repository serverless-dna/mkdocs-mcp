import { logger } from '../../src/services/logger';
import { IndexLoader } from '../../src/shared/IndexLoader';
import { VersionManager } from '../../src/shared/VersionManager';

// Mock the dependencies
jest.mock('../../src/services/logger');
jest.mock('../../src/shared/VersionManager');

const mockLogger = logger as jest.Mocked<typeof logger>;
const MockVersionManager = VersionManager as jest.MockedClass<typeof VersionManager>;

describe('IndexLoader', () => {
  let indexLoader: IndexLoader<any>;
  let mockVersionManager: jest.Mocked<VersionManager>;
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    mockVersionManager = new MockVersionManager(baseUrl) as jest.Mocked<VersionManager>;
    indexLoader = new IndexLoader(baseUrl, mockVersionManager);
    jest.clearAllMocks();
  });

  afterEach(() => {
    indexLoader.clearLoadingState();
  });

  describe('loadIndex', () => {
    it('should load index successfully with provided loader', async () => {
      const mockData = { index: 'test-data', documents: new Map() };
      const mockLoader = jest.fn().mockResolvedValue(mockData);

      const result = await indexLoader.loadIndex('v1.0', mockLoader);

      expect(result).toEqual(mockData);
      expect(mockLoader).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting index load for key: https://example.com:v1.0'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Index load completed for key: https://example.com:v1.0')
      );
    });

    it('should load index for default version when no version specified', async () => {
      const mockData = { index: 'default-data' };
      const mockLoader = jest.fn().mockResolvedValue(mockData);

      const result = await indexLoader.loadIndex(undefined, mockLoader);

      expect(result).toEqual(mockData);
      expect(mockLoader).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting index load for key: https://example.com:default'
      );
    });

    it('should throw error when no loader function provided', async () => {
      await expect(indexLoader.loadIndex('v1.0')).rejects.toThrow(
        'No loader function provided for index: https://example.com:v1.0'
      );
    });

    it('should handle loader errors and propagate them', async () => {
      const mockError = new Error('Load failed');
      const mockLoader = jest.fn().mockRejectedValue(mockError);

      await expect(indexLoader.loadIndex('v1.0', mockLoader)).rejects.toThrow('Load failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Index load failed for key: https://example.com:v1.0:',
        mockError
      );
    });

    it('should log load time on successful completion', async () => {
      const mockData = { index: 'test-data' };
      const mockLoader = jest.fn().mockResolvedValue(mockData);

      await indexLoader.loadIndex('v1.0', mockLoader);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Index load successful for key: https:\/\/example\.com:v1\.0 \(took \d+ms\)/)
      );
    });
  });

  describe('concurrent access control', () => {
    it('should prevent duplicate loading for same version', async () => {
      const mockData = { index: 'test-data' };
      const mockLoader = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockData), 50))
      );

      // Start two concurrent loads for the same version
      const promise1 = indexLoader.loadIndex('v1.0', mockLoader);
      const promise2 = indexLoader.loadIndex('v1.0', mockLoader);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(mockLoader).toHaveBeenCalledTimes(1); // Should only call loader once
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Index load already in progress for key: https://example.com:v1.0, waiting for completion'
      );
    });

    it('should allow concurrent loading for different versions', async () => {
      const mockData1 = { index: 'test-data-v1' };
      const mockData2 = { index: 'test-data-v2' };
      const mockLoader1 = jest.fn().mockResolvedValue(mockData1);
      const mockLoader2 = jest.fn().mockResolvedValue(mockData2);

      // Start concurrent loads for different versions
      const promise1 = indexLoader.loadIndex('v1.0', mockLoader1);
      const promise2 = indexLoader.loadIndex('v2.0', mockLoader2);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockData1);
      expect(result2).toEqual(mockData2);
      expect(mockLoader1).toHaveBeenCalledTimes(1);
      expect(mockLoader2).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in concurrent loading', async () => {
      const mockError = new Error('Load failed');
      const mockLoader = jest.fn().mockRejectedValue(mockError);

      // Start two concurrent loads that will fail
      const promise1 = indexLoader.loadIndex('v1.0', mockLoader);
      const promise2 = indexLoader.loadIndex('v1.0', mockLoader);

      await expect(Promise.all([promise1, promise2])).rejects.toThrow('Load failed');
      expect(mockLoader).toHaveBeenCalledTimes(1); // Should only call loader once
    });

    it('should clean up loading state after completion', async () => {
      const mockData = { index: 'test-data' };
      const mockLoader = jest.fn().mockResolvedValue(mockData);

      expect(indexLoader.isLoading('v1.0')).toBe(false);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeUndefined();

      await indexLoader.loadIndex('v1.0', mockLoader);

      expect(indexLoader.isLoading('v1.0')).toBe(false);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeUndefined();
    });

    it('should clean up loading state after error', async () => {
      const mockError = new Error('Load failed');
      const mockLoader = jest.fn().mockRejectedValue(mockError);

      expect(indexLoader.isLoading('v1.0')).toBe(false);

      await expect(indexLoader.loadIndex('v1.0', mockLoader)).rejects.toThrow('Load failed');

      expect(indexLoader.isLoading('v1.0')).toBe(false);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeUndefined();
    });
  });

  describe('loading state management', () => {
    it('should track loading state correctly', async () => {
      const mockData = { index: 'test-data' };
      let resolveLoader: (value: any) => void;
      const mockLoader = jest.fn().mockImplementation(() => 
        new Promise(resolve => { resolveLoader = resolve; })
      );

      // Start loading
      const loadPromise = indexLoader.loadIndex('v1.0', mockLoader);

      // Check loading state
      expect(indexLoader.isLoading('v1.0')).toBe(true);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeDefined();
      expect(indexLoader.getLoadingKeys()).toContain('https://example.com:v1.0');

      // Complete loading
      resolveLoader!(mockData);
      await loadPromise;

      // Check state after completion
      expect(indexLoader.isLoading('v1.0')).toBe(false);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeUndefined();
      expect(indexLoader.getLoadingKeys()).not.toContain('https://example.com:v1.0');
    });

    it('should return correct loading keys for multiple concurrent loads', async () => {
      const mockData = { index: 'test-data' };
      let resolveLoader1: (value: any) => void;
      let resolveLoader2: (value: any) => void;
      
      const mockLoader1 = jest.fn().mockImplementation(() => 
        new Promise(resolve => { resolveLoader1 = resolve; })
      );
      const mockLoader2 = jest.fn().mockImplementation(() => 
        new Promise(resolve => { resolveLoader2 = resolve; })
      );

      // Start multiple loads
      const loadPromise1 = indexLoader.loadIndex('v1.0', mockLoader1);
      const loadPromise2 = indexLoader.loadIndex('v2.0', mockLoader2);

      // Check loading state
      const loadingKeys = indexLoader.getLoadingKeys();
      expect(loadingKeys).toContain('https://example.com:v1.0');
      expect(loadingKeys).toContain('https://example.com:v2.0');
      expect(loadingKeys).toHaveLength(2);

      // Complete one load
      resolveLoader1!(mockData);
      await loadPromise1;

      // Check state after partial completion
      const remainingKeys = indexLoader.getLoadingKeys();
      expect(remainingKeys).not.toContain('https://example.com:v1.0');
      expect(remainingKeys).toContain('https://example.com:v2.0');
      expect(remainingKeys).toHaveLength(1);

      // Complete second load
      resolveLoader2!(mockData);
      await loadPromise2;

      // Check final state
      expect(indexLoader.getLoadingKeys()).toHaveLength(0);
    });

    it('should clear all loading state', async () => {
      const mockData = { index: 'test-data' };
      let resolveLoader: (value: any) => void;
      const mockLoader = jest.fn().mockImplementation(() => 
        new Promise(resolve => { resolveLoader = resolve; })
      );

      // Start loading
      const loadPromise = indexLoader.loadIndex('v1.0', mockLoader);

      // Verify loading state exists
      expect(indexLoader.isLoading('v1.0')).toBe(true);
      expect(indexLoader.getLoadingKeys()).toHaveLength(1);

      // Clear loading state
      indexLoader.clearLoadingState();

      // Verify state is cleared
      expect(indexLoader.isLoading('v1.0')).toBe(false);
      expect(indexLoader.getLoadingPromise('v1.0')).toBeUndefined();
      expect(indexLoader.getLoadingKeys()).toHaveLength(0);

      expect(mockLogger.debug).toHaveBeenCalledWith('Cleared all loading state');

      // Complete the original promise (should still work)
      resolveLoader!(mockData);
      await expect(loadPromise).resolves.toEqual(mockData);
    });
  });

  describe('load key generation', () => {
    it('should generate correct load keys for different versions', () => {
      const loader1 = new IndexLoader('https://site1.com', mockVersionManager);
      const loader2 = new IndexLoader('https://site2.com', mockVersionManager);

      // Test with different base URLs and versions
      expect(loader1.isLoading('v1.0')).toBe(false);
      expect(loader2.isLoading('v1.0')).toBe(false);
      expect(loader1.isLoading('v2.0')).toBe(false);
      expect(loader2.isLoading('v2.0')).toBe(false);

      // Keys should be different for different base URLs
      expect(loader1.getLoadingKeys()).toEqual([]);
      expect(loader2.getLoadingKeys()).toEqual([]);
    });

    it('should handle undefined version correctly', () => {
      expect(indexLoader.isLoading()).toBe(false);
      expect(indexLoader.isLoading(undefined)).toBe(false);
      expect(indexLoader.getLoadingPromise()).toBeUndefined();
      expect(indexLoader.getLoadingPromise(undefined)).toBeUndefined();
    });
  });

  describe('error scenarios', () => {
    it('should handle loader function throwing synchronously', async () => {
      const mockError = new Error('Synchronous error');
      const mockLoader = jest.fn().mockImplementation(() => {
        throw mockError;
      });

      await expect(indexLoader.loadIndex('v1.0', mockLoader)).rejects.toThrow('Synchronous error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Index load failed for key: https://example.com:v1.0:',
        mockError
      );
    });

    it('should handle loader function returning rejected promise', async () => {
      const mockError = new Error('Async error');
      const mockLoader = jest.fn().mockRejectedValue(mockError);

      await expect(indexLoader.loadIndex('v1.0', mockLoader)).rejects.toThrow('Async error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Index load failed for key: https://example.com:v1.0:',
        mockError
      );
    });

    it('should handle multiple concurrent loads with mixed success/failure', async () => {
      const mockData = { index: 'success-data' };
      const mockError = new Error('Load failed');
      
      const successLoader = jest.fn().mockResolvedValue(mockData);
      const failLoader = jest.fn().mockRejectedValue(mockError);

      // Start concurrent loads - one success, one failure
      const successPromise = indexLoader.loadIndex('v1.0', successLoader);
      const failPromise = indexLoader.loadIndex('v2.0', failLoader);

      const results = await Promise.allSettled([successPromise, failPromise]);

      expect(results[0].status).toBe('fulfilled');
      expect((results[0] as PromiseFulfilledResult<any>).value).toEqual(mockData);
      
      expect(results[1].status).toBe('rejected');
      expect((results[1] as PromiseRejectedResult).reason).toEqual(mockError);

      expect(successLoader).toHaveBeenCalledTimes(1);
      expect(failLoader).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should work with real-world loading patterns', async () => {
      const mockSearchIndex = {
        index: { /* mock Lunr index */ },
        documents: new Map([
          ['doc1', { title: 'Test Doc 1', content: 'Content 1' }],
          ['doc2', { title: 'Test Doc 2', content: 'Content 2' }]
        ]),
        metadata: { loadedAt: new Date(), size: 1024 }
      };

      const mockLoader = jest.fn().mockImplementation(async () => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockSearchIndex;
      });

      const result = await indexLoader.loadIndex('latest', mockLoader);

      expect(result).toEqual(mockSearchIndex);
      expect(result.documents.size).toBe(2);
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive loads for same version', async () => {
      const mockData = { index: 'test-data' };
      const mockLoader = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockData), 20))
      );

      // Start multiple rapid loads
      const promises = Array.from({ length: 5 }, () => 
        indexLoader.loadIndex('v1.0', mockLoader)
      );

      const results = await Promise.all(promises);

      // All should return the same data
      results.forEach(result => {
        expect(result).toEqual(mockData);
      });

      // Loader should only be called once
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });
  });
});
