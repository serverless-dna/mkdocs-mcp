/**
 * Cache-related type definitions for IndexCache
 */

export interface CacheOptions {
  maxSize?: number;
  maxMemoryMB?: number;
  ttlMinutes?: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  memoryUsageMB: number;
  maxMemoryMB: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  lastAccessed: number;
  size: number;
}
