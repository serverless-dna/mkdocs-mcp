// Version management
export type { VersionInfo, VersionManagerOptions,VersionResolution } from './types/version';
export { VersionManager } from './VersionManager';

// Cache management
export { IndexCache } from './IndexCache';
export type { CacheEntry, CacheOptions, CacheStats } from './types/cache';

// Index loading
export { IndexLoader } from './IndexLoader';

// Enhanced search index factory
export { EnhancedSearchIndexFactory } from './EnhancedSearchIndexFactory';
export type { SearchIndexOptions } from './types/searchIndex';
export type { SearchIndex } from './types/searchIndex';

// Error types
export { IndexLoadError,VersionDetectionError, VersionNotFoundError } from './errors/VersionErrors';

// Legacy exports for backward compatibility
export type { SearchIndex as LegacySearchIndex } from './searchIndex';
export { searchDocuments, SearchIndexFactory } from './searchIndex';
export { buildVersionedUrl, clearVersionDetectionCache,detectVersioning } from './versionDetection';
