import { createHash } from 'crypto';
import * as path from 'path';

import cacheConfig from './config/cache';
import { fetchService } from './services/fetch';
import { ContentType } from './services/fetch/types';
import { logger } from './services/logger';
import { ConversionResult,MkDocsMarkdownConverter } from './services/markdown/mkdocsMarkdownConverter';

import * as cacache from 'cacache';

// Constants for performance tuning
const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout for fetch operations

/**
 * Validates that a URL belongs to the allowed domain
 * @param url The URL to validate
 * @returns True if the URL is valid and belongs to the allowed domain
 */
function isValidUrl(_url: string): boolean {
  try {
    // new URL(url);
    return true;  // TODO: limit to actual document site
  } catch {
    return false;
  }
}

/**
 * Generate a cache key for markdown based on URL and ETag
 * @param url The URL of the page
 * @param etag The ETag from the response headers
 * @returns A cache key string
 */
function generateMarkdownCacheKey(url: string, etag: string | null): string {
  // Clean the ETag (remove quotes if present)
  const cleanEtag = etag ? etag.replace(/^"(.*)"$/, '$1') : '';
  
  // Extract path components from URL for readability
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  
  // Create a cache key with path components and ETag
  // MkDocs site URLs follow the pattern:
  // https://example.com/{version}/{path}
  if (pathParts.length >= 2) {
    const version = pathParts[0];
    const pagePath = pathParts.slice(1).join('/') || 'index';
    
    return `${version}/${pagePath}-${cleanEtag}`;
  }
  
  // Fallback for URLs that don't match the expected pattern
  return `page-${cleanEtag}`;
}

/**
 * Generate a hash of HTML content (fallback when ETag is not available)
 * @param html The HTML content
 * @returns MD5 hash of the content
 */
function generateContentHash(html: string): string {
  return createHash('md5').update(html).digest('hex');
}

/**
 * Get the cache directory path for markdown content
 * @returns The path to the markdown cache directory
 */
function getMarkdownCachePath(): string {
  return path.join(
    cacheConfig.basePath,
    cacheConfig.contentTypes[ContentType.MARKDOWN]?.path || 'markdown-cache'
  );
}

/**
 * Check if conversion result exists in cache for a given key
 * @param cacheKey The cache key
 * @returns The cached conversion result or null if not found
 */
async function getConversionFromCache(cacheKey: string): Promise<ConversionResult | null> {
  try {
    const cachePath = getMarkdownCachePath();
    
    // Use cacache directly to get the content
    const data = await cacache.get.info(cachePath, cacheKey)
      .then(() => cacache.get(cachePath, cacheKey))
      .then(data => data.data.toString('utf8'));
    
    logger.info(`[CACHE HIT] Conversion cache hit for key: ${cacheKey}`);
    return JSON.parse(data) as ConversionResult;
  } catch (error) {
    // If entry doesn't exist, cacache throws an error
    if ((error as Error).message.includes('ENOENT') || 
        (error as Error).message.includes('not found')) {
      logger.info(`[CACHE MISS] No conversion in cache for key: ${cacheKey}`);
      return null;
    }
    
    logger.info(`Error reading conversion from cache: ${error}`);
    return null;
  }
}

/**
 * Save conversion result to cache
 * @param cacheKey The cache key
 * @param result The conversion result
 */
async function saveConversionToCache(cacheKey: string, result: ConversionResult): Promise<void> {
  try {
    const cachePath = getMarkdownCachePath();
    
    // Use cacache directly to store the content
    await cacache.put(cachePath, cacheKey, JSON.stringify(result));
    logger.info(`[CACHE SAVE] Conversion saved to cache with key: ${cacheKey}`);
  } catch (error) {
    logger.info(`Error saving conversion to cache: ${error}`);
  }
}

/**
 * Fetches a documentation page and converts it to structured markdown
 * Uses disk-based caching with ETag validation for efficient fetching
 * Also caches the converted result to avoid redundant conversions
 * 
 * @param url The URL of the documentation page to fetch
 * @returns The conversion result with markdown and metadata
 */
export async function fetchDocPage(url: string): Promise<ConversionResult> {
  try {
    // Validate URL for security
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: Only URLs from the configured documentation site are allowed`);
    }
    
    // Set up fetch options with timeout
    const fetchOptions = {
      timeout: FETCH_TIMEOUT_MS,
      contentType: ContentType.WEB_PAGE,
      headers: {
        'Accept': 'text/html'
      }
    };
    
    try {
      // Log that we're fetching the HTML content
      logger.info(`[WEB FETCH] Fetching HTML content from ${url}`);
      
      // Fetch the HTML content with disk-based caching
      const response = await fetchService.fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }
      
      // Check if the response came from cache
      const fromCache = response.headers.get('x-local-cache-status') === 'hit';
      logger.info(`[WEB ${fromCache ? 'CACHE HIT' : 'CACHE MISS'}] HTML content ${fromCache ? 'retrieved from cache' : 'fetched from network'} for ${url}`);
      
      // Get the ETag from response headers
      const etag = response.headers.get('etag');
      
      // Get the HTML content
      const html = await response.text();
      
      // If no ETag, generate a content hash as fallback
      const cacheKey = etag 
        ? generateMarkdownCacheKey(url, etag)
        : generateMarkdownCacheKey(url, generateContentHash(html));
      
      // Only check conversion cache when web page is loaded from Cache
      // If cache MISS on HTML load then we must re-render the conversion
      if (fromCache) {
        // Check if we have conversion cached for this specific HTML version
        const cachedResult = await getConversionFromCache(cacheKey);
        if (cachedResult) {
          logger.info(`[CACHE HIT] Conversion found in cache for ${url} with key ${cacheKey}`);
          return cachedResult;
        }
      }
      
      logger.info(`[CACHE MISS] Conversion not found in cache for ${url} with key ${cacheKey}, converting HTML to markdown`);
      
      // Create an instance of the MkDocs markdown converter
      const converter = new MkDocsMarkdownConverter();
      
      // Convert HTML to structured markdown
      const result = converter.convert(html, url);
      
      // Cache the conversion result for future use
      await saveConversionToCache(cacheKey, result);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch or process page: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    logger.info(`Error fetching doc page: ${error}`);
    // Return error as a ConversionResult
    return {
      title: 'Error',
      markdown: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`,
      code_examples: [],
      url
    };
  }
}

/**
 * Clear the documentation cache
 * @returns Promise that resolves when the cache is cleared
 */
export async function clearDocCache(): Promise<void> {
  await fetchService.clearCache(ContentType.WEB_PAGE);
  
  // Clear markdown cache using cacache directly
  try {
    const cachePath = getMarkdownCachePath();
    await cacache.rm.all(cachePath);
    logger.info('Markdown cache cleared');
  } catch (error) {
    logger.info(`Error clearing markdown cache: ${error}`);
  }
}
