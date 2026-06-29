/**
 * Export the FetchService and related types from the fetch module.
 *
 * The singleton `fetchService` exported here is created at module-load time
 * with the global cache configuration. Authentication is read from environment
 * variables and applied automatically — for public sites this is a no-op, for
 * the `github-api` scheme it injects the PAT and rewrites GitHub Pages URLs
 * to the GitHub Contents API. The on-disk cache is namespaced by the auth
 * identity so that two different identities sharing a CACHE_BASE_PATH never
 * read each other's cached responses.
 */
import baseCacheConfig from '../../config/cache';
import { logger } from '../logger';

import { authConfigCacheKey, loadAuthConfigFromEnv } from './auth';
import { FetchService } from './fetch';
import type { CacheConfig } from './types';

/**
 * Build a cache config whose per-content-type paths are nested under a
 * subdirectory derived from the auth identity. This keeps cached payloads
 * for distinct identities (e.g. different PATs / different repos) physically
 * separate so they cannot leak across identities.
 */
const namespaceCacheConfig = (config: CacheConfig, namespace: string): CacheConfig => {
  if (!config.contentTypes) return config;
  return {
    ...config,
    contentTypes: Object.fromEntries(
      Object.entries(config.contentTypes).map(([key, value]) => [
        key,
        value ? { ...value, path: `${namespace}/${value.path}` } : value,
      ])
    ) as CacheConfig['contentTypes'],
  };
};

let authConfig;
try {
  authConfig = loadAuthConfigFromEnv();
} catch (error) {
  // We can't reach the MCP transport from here to surface this nicely, so the
  // best we can do is log + rethrow. Misconfiguration must not be silent —
  // otherwise users would see "request failed" errors with no hint that the
  // root cause was a missing token.
  logger.error(`Failed to load auth configuration: ${error instanceof Error ? error.message : String(error)}`);
  throw error;
}

const cacheNamespace = authConfigCacheKey(authConfig);
const cacheConfig = namespaceCacheConfig(baseCacheConfig, cacheNamespace);

if (authConfig.type !== 'none') {
  logger.info(`FetchService auth scheme: ${authConfig.type} (cache namespace: ${cacheNamespace})`);
}

// Create and export a global instance of FetchService
export const fetchService = new FetchService(cacheConfig, authConfig);

// Export types and classes for when direct instantiation is needed
export * from './auth';
export { CacheManager } from './cacheManager';
export { FetchService } from './fetch';
export * from './types';
