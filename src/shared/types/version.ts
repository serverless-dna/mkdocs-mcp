/**
 * Version-related type definitions for MkDocs version management
 */

export interface VersionInfo {
  title: string;
  version: string;
  aliases: string[];
}

export interface VersionResolution {
  valid: boolean;
  resolved: string;
  isDefault: boolean;
  available?: VersionInfo[];
  error?: string;
}

export interface VersionManagerOptions {
  cacheTimeout?: number; // Cache timeout in milliseconds
  retryAttempts?: number; // Number of retry attempts for network failures
  retryDelay?: number; // Base delay for exponential backoff in milliseconds
}
