import { fetchService } from '../services/fetch';
import { ContentType } from '../services/fetch/types';
import { logger } from '../services/logger';

/**
 * Cache for version detection results to avoid repeated checks
 */
const versionDetectionCache = new Map<string, boolean>();

/**
 * Detect if a MkDocs site uses versioning by checking for versions.json
 * @param baseUrl The base URL of the MkDocs site
 * @returns true if the site uses versioning, false otherwise
 */
export async function detectVersioning(baseUrl: string): Promise<boolean> {
  // Check cache first
  if (versionDetectionCache.has(baseUrl)) {
    return versionDetectionCache.get(baseUrl)!;
  }

  try {
    const url = `${baseUrl}/versions.json`;
    const response = await fetchService.fetch(url, {
      contentType: ContentType.WEB_PAGE,
      headers: {
        'Accept': 'application/json'
      }
    });

    const hasVersioning = response.ok;
    versionDetectionCache.set(baseUrl, hasVersioning);
    
    logger.debug(`Version detection for ${baseUrl}: ${hasVersioning ? 'versioned' : 'non-versioned'}`);
    
    return hasVersioning;
  } catch (error) {
    logger.debug(`Version detection failed for ${baseUrl}, assuming non-versioned: ${error}`);
    versionDetectionCache.set(baseUrl, false);
    return false;
  }
}

/**
 * Build the correct URL path based on whether the site uses versioning
 * @param baseUrl The base URL of the MkDocs site
 * @param path The path to append (e.g., 'search/search_index.json' or 'docs/page/')
 * @param version The version to use (only if site is versioned)
 * @returns The complete URL with or without version path
 */
export async function buildVersionedUrl(
  baseUrl: string,
  path: string,
  version?: string
): Promise<string> {
  const hasVersioning = await detectVersioning(baseUrl);
  
  if (hasVersioning) {
    const versionPath = version || 'latest';
    return `${baseUrl}/${versionPath}/${path}`;
  }
  
  return `${baseUrl}/${path}`;
}

/**
 * Clear the version detection cache (useful for testing)
 */
export function clearVersionDetectionCache(): void {
  versionDetectionCache.clear();
}
