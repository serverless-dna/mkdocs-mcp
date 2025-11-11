import { logger } from '../services/logger';

import type { CacheEntry, CacheOptions, CacheStats } from './types/cache';

/**
 * LRU Cache implementation for search indexes with memory management
 */
export class IndexCache<T = any> {
  private readonly options: Required<CacheOptions>;
  private readonly cache = new Map<string, CacheEntry<T>>();
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 50, // Default max 50 entries
      maxMemoryMB: options.maxMemoryMB ?? 500, // Default max 500MB
      ttlMinutes: options.ttlMinutes ?? 60 // Default 60 minutes TTL
    };

    logger.debug(`IndexCache initialized with maxSize: ${this.options.maxSize}, maxMemoryMB: ${this.options.maxMemoryMB}MB, ttlMinutes: ${this.options.ttlMinutes}`);
  }

  /**
   * Get an item from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    const now = Date.now();
    const ageMinutes = (now - entry.timestamp) / (1000 * 60);
    
    if (ageMinutes > this.options.ttlMinutes) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug(`Cache entry expired for key: ${key} (age: ${ageMinutes.toFixed(1)} minutes)`);
      return undefined;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = now;
    this.stats.hits++;
    
    logger.debug(`Cache hit for key: ${key}`);
    return entry.value;
  }

  /**
   * Set an item in the cache
   */
  set(key: string, value: T): void {
    const now = Date.now();
    const size = this.estimateSize(value);
    
    // For new entries, set lastAccessed to a time slightly in the past
    // so they don't automatically become the most recently used
    const lastAccessed = this.cache.has(key) ? now : now - 1000; // 1 second ago for new entries
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      lastAccessed,
      size
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    this.cache.set(key, entry);
    
    logger.debug(`Cache set for key: ${key} (size: ${(size / 1024 / 1024).toFixed(2)}MB)`);

    // Enforce size and memory limits
    this.enforceConstraints();
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check TTL
    const now = Date.now();
    const ageMinutes = (now - entry.timestamp) / (1000 * 60);
    
    if (ageMinutes > this.options.ttlMinutes) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache entry deleted for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    
    logger.debug(`Cache cleared (removed ${size} entries)`);
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsageMB = this.getCurrentMemoryUsage() / 1024 / 1024;
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      memoryUsageMB,
      maxMemoryMB: this.options.maxMemoryMB,
      hitRate
    };
  }

  /**
   * Get all cache keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Enforce cache size and memory constraints using LRU eviction
   */
  private enforceConstraints(): void {
    // First, remove expired entries
    this.removeExpiredEntries();

    // Enforce size constraint
    while (this.cache.size > this.options.maxSize) {
      this.evictLRU();
    }

    // Enforce memory constraint
    let currentMemoryMB = this.getCurrentMemoryUsage() / 1024 / 1024;
    while (currentMemoryMB > this.options.maxMemoryMB && this.cache.size > 0) {
      this.evictLRU();
      currentMemoryMB = this.getCurrentMemoryUsage() / 1024 / 1024; // Recalculate after eviction
    }
  }

  /**
   * Remove expired entries from the cache
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const ageMinutes = (now - entry.timestamp) / (1000 * 60);
      if (ageMinutes > this.options.ttlMinutes) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      logger.debug(`Removed expired cache entry: ${key}`);
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Get current memory usage in bytes
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return totalSize;
  }

  /**
   * Estimate the memory size of a cache value
   */
  private estimateSize(value: T): number {
    try {
      // For objects with known structure, we can be more precise
      if (value && typeof value === 'object') {
        // If it's a search index with known properties
        if ('index' in value && 'documents' in value && 'metadata' in value) {
          let size = 0;
          
          // Estimate index size (Lunr index)
          if ((value as any).index) {
            size += 1024 * 1024; // Base estimate for Lunr index: 1MB
          }
          
          // Estimate documents map size
          if ((value as any).documents && (value as any).documents instanceof Map) {
            const docsMap = (value as any).documents as Map<string, any>;
            size += docsMap.size * 500; // Estimate 500 bytes per document entry
          }
          
          // Add metadata size
          size += 1024; // Small overhead for metadata
          
          return size;
        }
      }
      
      // Fallback: JSON stringify approach (less accurate but works for any object)
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Rough estimate: 2 bytes per character
    } catch (error) {
      // If JSON.stringify fails, use a default estimate
      logger.debug(`Failed to estimate size for cache value, using default: ${error}`);
      return 1024 * 1024; // Default 1MB estimate
    }
  }
}
