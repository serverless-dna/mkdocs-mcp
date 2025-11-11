// Version management
export type { VersionInfo, VersionManagerOptions,VersionResolution } from './types/version';
export { VersionManager } from './VersionManager';

// Cache management
export { IndexCache } from './IndexCache';
export type { CacheEntry, CacheOptions, CacheStats } from './types/cache';

// Index loading
export { IndexLoader } from './IndexLoader';

// Search index factory
export { SearchIndexFactory } from './SearchIndexFactory';
export type { SearchIndexOptions } from './types/searchIndex';
export type { SearchIndex } from './types/searchIndex';

// Error types
export { IndexLoadError,VersionDetectionError, VersionNotFoundError } from './errors/VersionErrors';

// Legacy exports removed - using SearchIndexFactory only
export { buildVersionedUrl, clearVersionDetectionCache,detectVersioning } from './versionDetection';
