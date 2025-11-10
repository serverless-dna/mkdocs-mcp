import { logger } from '../services/logger';

import type { VersionManager } from './VersionManager';

/**
 * Manages loading of search indexes with concurrent access control
 */
export class IndexLoader<T = any> {
  private readonly baseUrl: string;
  private readonly versionManager: VersionManager;
  
  // Loading coordination
  private readonly loadingPromises = new Map<string, Promise<T>>();
  private readonly loadingKeys = new Set<string>();

  constructor(baseUrl: string, versionManager: VersionManager) {
    this.baseUrl = baseUrl;
    this.versionManager = versionManager;
  }

  /**
   * Load an index with concurrent access control
   */
  async loadIndex(version?: string, loader?: () => Promise<T>): Promise<T> {
    // Create a unique key for this load operation
    const loadKey = this.createLoadKey(version);
    
    // Check if this index is already being loaded
    if (this.loadingPromises.has(loadKey)) {
      logger.debug(`Index load already in progress for key: ${loadKey}, waiting for completion`);
      return this.loadingPromises.get(loadKey)!;
    }

    // If no loader provided, throw error
    if (!loader) {
      throw new Error(`No loader function provided for index: ${loadKey}`);
    }

    // Create and store the loading promise
    const loadingPromise = this.executeLoad(loadKey, loader);
    this.loadingPromises.set(loadKey, loadingPromise);
    this.loadingKeys.add(loadKey);

    try {
      const result = await loadingPromise;
      logger.debug(`Index load completed for key: ${loadKey}`);
      return result;
    } finally {
      // Clean up loading state
      this.loadingPromises.delete(loadKey);
      this.loadingKeys.delete(loadKey);
    }
  }

  /**
   * Check if an index is currently being loaded
   */
  isLoading(version?: string): boolean {
    const loadKey = this.createLoadKey(version);
    return this.loadingKeys.has(loadKey);
  }

  /**
   * Get the loading promise for a specific version (if it exists)
   */
  getLoadingPromise(version?: string): Promise<T> | undefined {
    const loadKey = this.createLoadKey(version);
    return this.loadingPromises.get(loadKey);
  }

  /**
   * Get all currently loading keys (for debugging)
   */
  getLoadingKeys(): string[] {
    return Array.from(this.loadingKeys);
  }

  /**
   * Clear all loading state (useful for testing)
   */
  clearLoadingState(): void {
    this.loadingPromises.clear();
    this.loadingKeys.clear();
    logger.debug('Cleared all loading state');
  }

  /**
   * Execute the actual loading with error handling
   */
  private async executeLoad(loadKey: string, loader: () => Promise<T>): Promise<T> {
    logger.debug(`Starting index load for key: ${loadKey}`);
    
    try {
      const startTime = Date.now();
      const result = await loader();
      const loadTime = Date.now() - startTime;
      
      logger.debug(`Index load successful for key: ${loadKey} (took ${loadTime}ms)`);
      return result;
    } catch (error) {
      logger.error(`Index load failed for key: ${loadKey}:`, error);
      throw error;
    }
  }

  /**
   * Create a unique key for load operations
   */
  private createLoadKey(version?: string): string {
    return `${this.baseUrl}:${version || 'default'}`;
  }
}
