import type { VersionInfo } from '../types/version';

/**
 * Error thrown when a requested version is not found
 */
export class VersionNotFoundError extends Error {
  constructor(
    public readonly requestedVersion: string,
    public readonly availableVersions: VersionInfo[]
  ) {
    super(`Version '${requestedVersion}' not found. Available versions: ${availableVersions.map(v => v.version).join(', ')}`);
    this.name = 'VersionNotFoundError';
  }
}

/**
 * Error thrown when version detection fails
 */
export class VersionDetectionError extends Error {
  constructor(
    public readonly baseUrl: string,
    public readonly cause: Error
  ) {
    super(`Failed to detect versioning for ${baseUrl}: ${cause.message}`);
    this.name = 'VersionDetectionError';
  }
}

/**
 * Error thrown when search index loading fails
 */
export class IndexLoadError extends Error {
  constructor(
    public readonly baseUrl: string,
    public readonly version: string | undefined,
    public readonly cause: Error
  ) {
    super(`Failed to load search index for ${baseUrl}${version ? ` (version: ${version})` : ''}: ${cause.message}`);
    this.name = 'IndexLoadError';
  }
}
