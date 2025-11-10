import { logger } from '../../src/services/logger';
import { IndexCache } from '../../src/shared/IndexCache';

// Mock the logger
jest.mock('../../src/services/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('IndexCache', () => {
  let cache: IndexCache<any>;

  beforeEach(() => {
    cache = new IndexCache();
    jest.clearAllMocks();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const testValue = { data: 'test' };
      
      cache.set('key1', testValue);
      const retrieved = cache.get('key1');
      
      expect(retrieved).toEqual(testValue);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should check if keys exist', () => {
      cache.set('key1', { data: 'test' });
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', { data: 'test' });
      
      expect(cache.has('key1')).toBe(true);
      const deleted = cache.delete('key1');
      
      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false when deleting non-existent keys', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      expect(cache.size()).toBe(2);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should return current size', () => {
      expect(cache.size()).toBe(0);
      
      cache.set('key1', { data: 'test1' });
      expect(cache.size()).toBe(1);
      
      cache.set('key2', { data: 'test2' });
      expect(cache.size()).toBe(2);
      
      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });

    it('should return all keys', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new IndexCache({ ttlMinutes: 0.001 }); // ~60ms
      
      shortTTLCache.set('key1', { data: 'test' });
      expect(shortTTLCache.has('key1')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shortTTLCache.has('key1')).toBe(false);
      expect(shortTTLCache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      const longTTLCache = new IndexCache({ ttlMinutes: 60 });
      
      longTTLCache.set('key1', { data: 'test' });
      expect(longTTLCache.has('key1')).toBe(true);
      expect(longTTLCache.get('key1')).toEqual({ data: 'test' });
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when size limit exceeded', () => {
      const smallCache = new IndexCache({ 
        maxSize: 2,
        maxMemoryMB: 1000 // High memory limit to avoid memory-based eviction
      });
      
      smallCache.set('key1', { data: 'test1' });
      smallCache.set('key2', { data: 'test2' });
      expect(smallCache.size()).toBe(2);
      
      // Access key1 to make it more recently used
      smallCache.get('key1');
      
      // Add key3, should evict key2 (least recently used)
      smallCache.set('key3', { data: 'test3' });
      
      expect(smallCache.size()).toBe(2);
      expect(smallCache.has('key1')).toBe(true); // Most recently used
      expect(smallCache.has('key2')).toBe(false); // Should be evicted
      expect(smallCache.has('key3')).toBe(true); // Newly added
    });

    it('should update last accessed time on get operations', () => {
      const smallCache = new IndexCache({ 
        maxSize: 2,
        maxMemoryMB: 1000 // High memory limit to avoid memory-based eviction
      });
      
      smallCache.set('key1', { data: 'test1' });
      smallCache.set('key2', { data: 'test2' });
      
      // Access key1 to make it more recently used
      smallCache.get('key1');
      
      // Add key3, should evict key2
      smallCache.set('key3', { data: 'test3' });
      
      expect(smallCache.has('key1')).toBe(true);
      expect(smallCache.has('key2')).toBe(false);
      expect(smallCache.has('key3')).toBe(true);
    });

    it('should handle eviction when cache is full', () => {
      const tinyCache = new IndexCache({ maxSize: 1 });
      
      tinyCache.set('key1', { data: 'test1' });
      expect(tinyCache.size()).toBe(1);
      
      tinyCache.set('key2', { data: 'test2' });
      expect(tinyCache.size()).toBe(1);
      expect(tinyCache.has('key1')).toBe(false);
      expect(tinyCache.has('key2')).toBe(true);
    });
  });

  describe('memory management', () => {
    it('should estimate size for search index objects', () => {
      const searchIndex = {
        index: {}, // Mock Lunr index
        documents: new Map([
          ['doc1', { title: 'Test 1', content: 'Content 1' }],
          ['doc2', { title: 'Test 2', content: 'Content 2' }]
        ]),
        metadata: { loadedAt: new Date(), size: 1000 }
      };
      
      cache.set('search-index', searchIndex);
      
      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should handle memory limit eviction', () => {
      const memoryLimitedCache = new IndexCache({ 
        maxSize: 100, // High size limit
        maxMemoryMB: 0.001 // Very low memory limit (~1KB)
      });
      
      // Add a large object that should trigger memory-based eviction
      const largeObject = {
        index: {},
        documents: new Map(),
        metadata: { size: 1000000 } // 1MB
      };
      
      memoryLimitedCache.set('large1', largeObject);
      memoryLimitedCache.set('large2', largeObject);
      
      // Should evict due to memory constraints
      expect(memoryLimitedCache.size()).toBeLessThan(2);
    });

    it('should handle JSON stringify fallback for size estimation', () => {
      const regularObject = { 
        name: 'test',
        data: [1, 2, 3, 4, 5],
        nested: { prop: 'value' }
      };
      
      cache.set('regular-object', regularObject);
      
      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should handle size estimation errors gracefully', () => {
      // Create an object that will cause JSON.stringify to fail
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;
      
      // Should not throw an error
      expect(() => {
        cache.set('circular', circularObject);
      }).not.toThrow();
      
      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', { data: 'test' });
      
      // Hit
      cache.get('key1');
      // Miss
      cache.get('nonexistent');
      // Another hit
      cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2/3);
    });

    it('should track evictions', () => {
      const smallCache = new IndexCache({ maxSize: 1 });
      
      smallCache.set('key1', { data: 'test1' });
      smallCache.set('key2', { data: 'test2' }); // Should evict key1
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key1', { data: 'test' });
      
      // No requests yet
      let stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
      
      // 1 hit, 0 misses
      cache.get('key1');
      stats = cache.getStats();
      expect(stats.hitRate).toBe(1);
      
      // 1 hit, 1 miss
      cache.get('nonexistent');
      stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5);
    });

    it('should provide comprehensive statistics', () => {
      const testCache = new IndexCache({ 
        maxSize: 10, 
        maxMemoryMB: 100,
        ttlMinutes: 30 
      });
      
      testCache.set('key1', { data: 'test' });
      testCache.get('key1'); // hit
      testCache.get('nonexistent'); // miss
      
      const stats = testCache.getStats();
      
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.evictions).toBe(0);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.maxMemoryMB).toBe(100);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset statistics on clear', () => {
      cache.set('key1', { data: 'test' });
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss
      
      let stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      cache.clear();
      
      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('constructor options', () => {
    it('should use default options when none provided', () => {
      const defaultCache = new IndexCache();
      const stats = defaultCache.getStats();
      
      expect(stats.maxSize).toBe(50);
      expect(stats.maxMemoryMB).toBe(500);
    });

    it('should use custom options when provided', () => {
      const customCache = new IndexCache({
        maxSize: 20,
        maxMemoryMB: 100,
        ttlMinutes: 30
      });
      
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(20);
      expect(stats.maxMemoryMB).toBe(100);
    });

    it('should log initialization parameters', () => {
      new IndexCache({
        maxSize: 25,
        maxMemoryMB: 200,
        ttlMinutes: 45
      });
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'IndexCache initialized with maxSize: 25, maxMemoryMB: 200MB, ttlMinutes: 45'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle replacing existing keys', () => {
      cache.set('key1', { data: 'original' });
      expect(cache.get('key1')).toEqual({ data: 'original' });
      
      cache.set('key1', { data: 'updated' });
      expect(cache.get('key1')).toEqual({ data: 'updated' });
      expect(cache.size()).toBe(1);
    });

    it('should handle empty cache operations', () => {
      expect(cache.size()).toBe(0);
      expect(cache.keys()).toEqual([]);
      expect(cache.get('any')).toBeUndefined();
      expect(cache.has('any')).toBe(false);
      expect(cache.delete('any')).toBe(false);
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should handle null and undefined values', () => {
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);
      
      expect(cache.get('null-key')).toBe(null);
      expect(cache.get('undefined-key')).toBe(undefined);
      expect(cache.has('null-key')).toBe(true);
      expect(cache.has('undefined-key')).toBe(true);
    });

    it('should handle very large objects', () => {
      const largeArray = new Array(10000).fill('test data');
      const largeObject = {
        data: largeArray,
        metadata: { size: largeArray.length }
      };
      
      expect(() => {
        cache.set('large-object', largeObject);
      }).not.toThrow();
      
      expect(cache.get('large-object')).toEqual(largeObject);
    });
  });

  describe('concurrent access simulation', () => {
    it('should handle multiple rapid operations', () => {
      const operations = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 100; i++) {
        operations.push(() => cache.set(`key${i}`, { data: `test${i}` }));
        operations.push(() => cache.get(`key${i % 50}`)); // Some hits, some misses
      }
      
      // Execute all operations
      operations.forEach(op => op());
      
      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hits + stats.misses).toBeGreaterThan(0);
    });
  });
});
