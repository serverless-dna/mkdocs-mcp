import { fetchService } from '../services/fetch';
import { ContentType } from '../services/fetch/types';
import { logger } from '../services/logger';

import { VersionNotFoundError } from './errors/VersionErrors';
import type { SearchIndex, SearchIndexOptions } from './types/searchIndex';
import type { VersionInfo } from './types/version';
import { IndexCache } from './IndexCache';
import { IndexLoader } from './IndexLoader';
import { VersionManager } from './VersionManager';

import lunr from 'lunr';

// Define the structure of MkDocs search index
interface MkDocsSearchIndex {
    config: {
        lang: string[];
        separator: string;
        pipeline: string[];
    };
    docs: Array<{
        location: string;
        title: string;
        text: string;
        tags?: string[];
    }>;
}

/**
 * Enhanced SearchIndexFactory with robust version-aware search indexing
 */
export class EnhancedSearchIndexFactory {
  private readonly versionManager: VersionManager;
  private readonly indexCache: IndexCache<SearchIndex>;
  private readonly indexLoader: IndexLoader<SearchIndex>;
  private readonly baseUrl: string;
  private hasVersioning: boolean | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(baseUrl: string, options: SearchIndexOptions = {}) {
    this.baseUrl = baseUrl;
    this.versionManager = new VersionManager(baseUrl, options.versionOptions);
    this.indexCache = new IndexCache<SearchIndex>(options.cacheOptions);
    this.indexLoader = new IndexLoader<SearchIndex>(baseUrl, this.versionManager);

    logger.debug(`Enhanced SearchIndexFactory initialized for ${baseUrl}`);
  }

  /**
   * Initialize the factory by detecting versioning upfront
   */
  private async initialize(): Promise<void> {
    if (this.hasVersioning !== null) {
      return; // Already initialized
    }

    try {
      this.hasVersioning = await this.versionManager.detectVersioning();
      logger.debug(`Site versioning detected: ${this.hasVersioning ? 'enabled' : 'disabled'} for ${this.baseUrl}`);
    } catch (error) {
      logger.warn(`Failed to detect versioning for ${this.baseUrl}, assuming non-versioned:`, error);
      this.hasVersioning = false;
    }
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise === null) {
      this.initializationPromise = this.initialize();
    }
    await this.initializationPromise;
  }

  /**
   * Get a search index for the specified version
   */
  async getSearchIndex(version?: string): Promise<SearchIndex | undefined> {
    try {
      // Ensure initialization is complete
      await this.ensureInitialized();

      // Handle non-versioned sites
      if (!this.hasVersioning) {
        if (version && version !== 'latest') {
          logger.warn(`Version '${version}' requested for non-versioned site, ignoring version parameter`);
        }
        return this.getSearchIndexForNonVersionedSite();
      }

      // Handle versioned sites
      return this.getSearchIndexForVersionedSite(version);

    } catch (error) {
      // Re-throw VersionNotFoundError to preserve version information
      if (error instanceof VersionNotFoundError) {
        throw error;
      }
      
      logger.error(`Failed to get search index for version ${version}:`, error);
      return undefined;
    }
  }

  /**
   * Get search index for non-versioned sites
   */
  private async getSearchIndexForNonVersionedSite(): Promise<SearchIndex | undefined> {
    const cacheKey = this.createCacheKey('default');

    // Check cache first
    const cachedIndex = this.indexCache.get(cacheKey);
    if (cachedIndex) {
      logger.debug(`Cache hit for non-versioned search index: ${cacheKey}`);
      return cachedIndex;
    }

    // Load the index directly without version resolution
    const searchIndex = await this.loadSearchIndexDirect('search/search_index.json', 'default');

    // Cache the loaded index
    this.indexCache.set(cacheKey, searchIndex);
    
    logger.debug(`Non-versioned search index loaded and cached: ${cacheKey}`);
    return searchIndex;
  }

  /**
   * Get search index for versioned sites
   */
  private async getSearchIndexForVersionedSite(version?: string): Promise<SearchIndex | undefined> {
    // Resolve the version
    const resolution = await this.versionManager.resolveVersion(version);
    
    if (!resolution.valid) {
      // If we have available versions, throw VersionNotFoundError
      if (resolution.available && resolution.available.length > 0) {
        throw new VersionNotFoundError(version || 'undefined', resolution.available);
      }
      
      logger.warn(`Invalid version requested: ${version}. ${resolution.error}`);
      return undefined;
    }

    const resolvedVersion = resolution.resolved;
    const cacheKey = this.createCacheKey(resolvedVersion);

    // Check cache first
    const cachedIndex = this.indexCache.get(cacheKey);
    if (cachedIndex) {
      logger.debug(`Cache hit for versioned search index: ${cacheKey}`);
      return cachedIndex;
    }

    // Load the index using the IndexLoader
    const searchIndex = await this.indexLoader.loadIndex(
      resolvedVersion,
      () => this.loadSearchIndex(resolvedVersion, resolution.isDefault)
    );

    // Cache the loaded index
    this.indexCache.set(cacheKey, searchIndex);
    
    logger.debug(`Versioned search index loaded and cached: ${cacheKey}`);
    return searchIndex;
  }

  /**
   * Resolve a version string to actual version information
   */
  async resolveVersion(version: string): Promise<{ valid: boolean; resolved: string; available?: VersionInfo[] }> {
    const resolution = await this.versionManager.resolveVersion(version);
    return {
      valid: resolution.valid,
      resolved: resolution.resolved,
      available: resolution.available
    };
  }

  /**
   * Get available versions for the site
   */
  async getAvailableVersions(): Promise<VersionInfo[] | undefined> {
    return this.versionManager.getAvailableVersions();
  }

  /**
   * Clear cache for a specific version or all versions
   */
  async clearCache(version?: string): Promise<void> {
    if (version) {
      const resolution = await this.versionManager.resolveVersion(version);
      const cacheKey = this.createCacheKey(resolution.resolved);
      this.indexCache.delete(cacheKey);
      logger.debug(`Cleared cache for version: ${version} (${cacheKey})`);
    } else {
      this.indexCache.clear();
      logger.debug('Cleared all search index cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.indexCache.getStats();
  }

  /**
   * Backward compatibility method for existing code
   */
  async getIndex(version = 'latest'): Promise<SearchIndex | undefined> {
    return this.getSearchIndex(version);
  }

  /**
   * Load a search index from the remote source (for versioned sites)
   */
  private async loadSearchIndex(version: string, isDefault: boolean): Promise<SearchIndex> {
    logger.debug(`Loading search index for version: ${version}`);
    
    try {
      // Build the search index URL
      const indexUrl = await this.versionManager.buildVersionedUrl('search/search_index.json', version);
      
      return this.loadSearchIndexDirect(indexUrl, version, isDefault);

    } catch (error) {
      logger.error(`Failed to load search index for version ${version}:`, error);
      throw error;
    }
  }

  /**
   * Load a search index directly from a URL (for both versioned and non-versioned sites)
   */
  private async loadSearchIndexDirect(indexPath: string, version: string, isDefault: boolean = true): Promise<SearchIndex> {
    logger.debug(`Loading search index from: ${indexPath}`);
    
    try {
      // Build the full URL
      const indexUrl = indexPath.startsWith('http') ? indexPath : `${this.baseUrl}/${indexPath}`;
      
      // Fetch the MkDocs search index
      const response = await fetchService.fetch(indexUrl, {
        contentType: ContentType.WEB_PAGE,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch search index: ${response.status} ${response.statusText}`);
      }

      const mkDocsIndex = await response.json() as MkDocsSearchIndex;
      
      // Convert to Lunr index
      const { index, documents } = this.mkDocsToLunrIndex(mkDocsIndex);
      
      // Calculate metadata
      const size = this.estimateIndexSize(index, documents);
      const documentCount = documents.size;

      // Create the search index
      const searchIndex: SearchIndex = {
        version,
        url: indexUrl,
        index,
        documents,
        metadata: {
          loadedAt: new Date(),
          size,
          documentCount,
          isDefault
        }
      };

      logger.debug(`Search index loaded successfully: ${documentCount} documents, ${(size / 1024 / 1024).toFixed(2)}MB`);
      
      return searchIndex;

    } catch (error) {
      logger.error(`Failed to load search index from ${indexPath}:`, error);
      throw error;
    }
  }

  /**
   * Convert MkDocs search index to Lunr index
   */
  private mkDocsToLunrIndex(mkDocsIndex: MkDocsSearchIndex): { index: lunr.Index, documents: Map<string, any> } {
    // Create a document map for quick lookups - with minimal data
    const documents = new Map<string, any>();
    
    // First pass: identify articles and create parent-child relationships
    const articleMap = new Map<string, any>(); // Maps article path to article document
    
    // Add document data to the map with parent/child relationships
    for (const doc of mkDocsIndex.docs) {
        const [articlePath] = doc.location.split('#');
        const isSection = doc.location.includes('#');
        
        const docData = {
            title: doc.title,
            location: doc.location,
            // Store a truncated preview of text instead of the full content
            preview: doc.text ? doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : '') : '',
            // Optionally store tags if needed
            tags: doc.tags || [],
            // Add parent/child relationship info
            isSection,
            articlePath,
            parent: undefined as any // Will be set for sections
        };
        
        if (isSection) {
            // This is a section - link it to its parent article
            const parentArticle = articleMap.get(articlePath);
            if (parentArticle) {
                docData.parent = parentArticle;
            }
        } else {
            // This is an article - store it for sections to reference
            articleMap.set(articlePath, docData);
        }
        
        documents.set(doc.location, docData);
    }
    
    // Create a new lunr index
    const index = lunr(function() {
        // Configure the index based on mkdocs config
        this.ref('location');
        this.field('title', { boost: 1000 });
        this.field('text', { boost: 1 });
        this.field('tags', { boost: 1000000 });
        
        // Add documents to the index
        for (const doc of mkDocsIndex.docs) {
            // Skip empty documents
            if (!doc.location && !doc.title && !doc.text) continue;
            
            this.add({
                location: doc.location,
                title: doc.title,
                text: doc.text,
                tags: doc.tags || []
            });
        }
    });
    
    return { index, documents };
  }

  /**
   * Estimate the memory size of a search index
   */
  private estimateIndexSize(index: lunr.Index, documents: Map<string, any>): number {
    let size = 0;
    
    // Estimate Lunr index size (rough approximation)
    size += 1024 * 1024; // Base estimate: 1MB for Lunr index
    
    // Estimate documents map size
    size += documents.size * 500; // Estimate 500 bytes per document entry
    
    return size;
  }

  /**
   * Create a cache key for a version
   */
  private createCacheKey(version: string): string {
    return `${this.baseUrl}:${version}`;
  }
}
