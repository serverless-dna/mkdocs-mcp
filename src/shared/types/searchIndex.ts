import type { CacheOptions } from './cache';
import type { VersionManagerOptions } from './version';

/**
 * Options for configuring the SearchIndexFactory
 */
export interface SearchIndexOptions {
  cacheOptions?: CacheOptions;
  versionOptions?: VersionManagerOptions;
}

/**
 * Enhanced SearchIndex interface with metadata
 */
export interface SearchIndex {
  version: string;
  url: string;
  index: any | undefined; // Lunr.Index
  documents: Map<string, any> | undefined;
  metadata: IndexMetadata;
}

/**
 * Metadata about a loaded search index
 */
export interface IndexMetadata {
  loadedAt: Date;
  size: number;
  documentCount: number;
  isDefault: boolean;
}
