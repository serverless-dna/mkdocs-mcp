import { fetchService } from '../services/fetch';
import { ContentType } from '../services/fetch/types';
import { logger } from '../services/logger';

import type { VersionInfo, VersionManagerOptions,VersionResolution } from './types/version';

/**
 * Enhanced version manager for MkDocs sites with robust version detection,
 * resolution, and alias handling capabilities
 */
export class VersionManager {
  private readonly baseUrl: string;
  private readonly options: Required<VersionManagerOptions>;
  
  // Caches
  private versionDetectionCache = new Map<string, boolean>();
  private versionsCache = new Map<string, { data: VersionInfo[]; timestamp: number }>();
  
  constructor(baseUrl: string, options: VersionManagerOptions = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      cacheTimeout: options.cacheTimeout ?? 5 * 60 * 1000, // 5 minutes default
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000 // 1 second base delay
    };
  }

  /**
   * Detect if a MkDocs site uses versioning by checking for versions.json
   */
  async detectVersioning(): Promise<boolean> {
    // Check cache first
    if (this.versionDetectionCache.has(this.baseUrl)) {
      return this.versionDetectionCache.get(this.baseUrl)!;
    }

    try {
      const url = `${this.baseUrl}/versions.json`;
      const response = await this.fetchWithRetry(url);

      const hasVersioning = response.ok;
      this.versionDetectionCache.set(this.baseUrl, hasVersioning);
      
      logger.debug(`Version detection for ${this.baseUrl}: ${hasVersioning ? 'versioned' : 'non-versioned'}`);
      
      return hasVersioning;
    } catch (error) {
      logger.debug(`Version detection failed for ${this.baseUrl}, assuming non-versioned: ${error}`);
      this.versionDetectionCache.set(this.baseUrl, false);
      return false;
    }
  }

  /**
   * Fetch available versions for the site
   */
  async fetchVersions(): Promise<VersionInfo[] | undefined> {
    // Check cache first
    const cached = this.versionsCache.get(this.baseUrl);
    if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/versions.json`;
      const response = await this.fetchWithRetry(url);
      
      if (!response.ok) {
        logger.debug(`Versions file not available at ${url}: ${response.status}`);
        return undefined;
      }
      
      const versions = await response.json() as VersionInfo[];
      
      // Validate the structure
      if (!Array.isArray(versions)) {
        logger.warn(`Invalid versions.json format at ${url}: expected array`);
        return undefined;
      }

      // Validate each version entry
      const validVersions = versions.filter(v => {
        if (!v.version || typeof v.version !== 'string') {
          logger.warn(`Invalid version entry in ${url}: missing or invalid version field`, v);
          return false;
        }
        if (!v.title || typeof v.title !== 'string') {
          logger.warn(`Invalid version entry in ${url}: missing or invalid title field`, v);
          return false;
        }
        if (v.aliases && !Array.isArray(v.aliases)) {
          logger.warn(`Invalid version entry in ${url}: aliases must be an array`, v);
          return false;
        }
        return true;
      });

      // Ensure aliases is always an array
      const normalizedVersions = validVersions.map(v => ({
        ...v,
        aliases: v.aliases || []
      }));

      // Cache the result
      this.versionsCache.set(this.baseUrl, {
        data: normalizedVersions,
        timestamp: Date.now()
      });

      logger.debug(`Fetched ${normalizedVersions.length} versions for ${this.baseUrl}`);
      
      return normalizedVersions;
    } catch (error) {
      logger.info(`Error fetching versions from ${this.baseUrl}: ${error}`);
      return undefined;
    }
  }

  /**
   * Resolve a version string to actual version information
   */
  async resolveVersion(version?: string): Promise<VersionResolution> {
    try {
      // Check if site has versioning
      const hasVersioning = await this.detectVersioning();
      
      if (!hasVersioning) {
        // Non-versioned site - ignore version parameter
        return {
          valid: true,
          resolved: 'default',
          isDefault: true
        };
      }

      // Get available versions
      const availableVersions = await this.fetchVersions();
      
      if (!availableVersions || availableVersions.length === 0) {
        return {
          valid: false,
          resolved: version || 'latest',
          isDefault: false,
          error: 'No versions available'
        };
      }

      // If no version specified, use the first version (typically latest)
      if (!version || version === 'latest') {
        const latestVersion = availableVersions[0];
        return {
          valid: true,
          resolved: latestVersion.version,
          isDefault: true,
          available: availableVersions
        };
      }

      // Check if version exists directly
      const directMatch = availableVersions.find(v => v.version === version);
      if (directMatch) {
        return {
          valid: true,
          resolved: directMatch.version,
          isDefault: false,
          available: availableVersions
        };
      }

      // Check if version is an alias
      const aliasMatch = availableVersions.find(v => v.aliases.includes(version));
      if (aliasMatch) {
        return {
          valid: true,
          resolved: aliasMatch.version,
          isDefault: false,
          available: availableVersions
        };
      }

      // Version not found
      return {
        valid: false,
        resolved: version,
        isDefault: false,
        available: availableVersions,
        error: `Version '${version}' not found. Available versions: ${availableVersions.map(v => v.version).join(', ')}`
      };

    } catch (error) {
      logger.error(`Error resolving version '${version}' for ${this.baseUrl}:`, error);
      return {
        valid: false,
        resolved: version || 'latest',
        isDefault: false,
        error: `Version resolution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Build the correct URL path based on whether the site uses versioning
   */
  async buildVersionedUrl(path: string, version?: string): Promise<string> {
    const hasVersioning = await this.detectVersioning();
    
    if (hasVersioning) {
      // Resolve the version to get the actual version string
      const resolution = await this.resolveVersion(version);
      if (!resolution.valid) {
        throw new Error(resolution.error || `Invalid version: ${version}`);
      }
      
      return `${this.baseUrl}/${resolution.resolved}/${path}`;
    }
    
    return `${this.baseUrl}/${path}`;
  }

  /**
   * Get available versions (cached if possible)
   */
  async getAvailableVersions(): Promise<VersionInfo[] | undefined> {
    return this.fetchVersions();
  }

  /**
   * Invalidate all caches
   */
  invalidateCache(): void {
    this.versionDetectionCache.clear();
    this.versionsCache.clear();
    logger.debug(`Cleared version caches for ${this.baseUrl}`);
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        const response = await fetchService.fetch(url, {
          contentType: ContentType.WEB_PAGE,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
          logger.debug(`Fetch attempt ${attempt} failed for ${url}, retrying in ${delay}ms: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to fetch ${url} after ${this.options.retryAttempts} attempts`);
  }
}
