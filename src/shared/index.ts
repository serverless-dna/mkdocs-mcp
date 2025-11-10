// Version management
export type { VersionInfo, VersionManagerOptions,VersionResolution } from './types/version';
export { VersionManager } from './VersionManager';

// Error types
export { IndexLoadError,VersionDetectionError, VersionNotFoundError } from './errors/VersionErrors';

// Legacy exports for backward compatibility
export type { SearchIndex } from './searchIndex';
export { searchDocuments, SearchIndexFactory } from './searchIndex';
export { buildVersionedUrl, clearVersionDetectionCache,detectVersioning } from './versionDetection';
