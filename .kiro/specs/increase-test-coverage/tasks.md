# Implementation Plan

- [x] 1. Enhance SearchIndexFactory test coverage
  - Add comprehensive tests for non-versioned site index loading, cache operations, and index conversion
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Add tests for non-versioned site index loading with multiple path attempts
  - Write tests for successful loading from different paths (search/search_index.json, search_index.json, etc.)
  - Write tests for fallback behavior when primary paths fail
  - Write tests for error handling when all paths fail
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Add tests for cache operations in SearchIndexFactory
  - Write tests for cache hit scenarios (versioned and non-versioned)
  - Write tests for cache miss scenarios requiring index loading
  - Write tests for cache clearing (specific version and all versions)
  - Write tests for cache statistics retrieval
  - _Requirements: 1.1, 1.2_

- [x] 1.3 Add tests for MkDocs to Lunr index conversion
  - Write tests for converting MkDocs index with various document structures
  - Write tests for parent-child relationship handling (articles and sections)
  - Write tests for document map creation with minimal data
  - Write tests for empty or invalid MkDocs indexes
  - _Requirements: 1.1, 1.4_

- [x] 1.4 Add tests for index size estimation and backward compatibility
  - Write tests for index size estimation accuracy
  - Write tests for getIndex() backward compatibility method
  - Write tests for resolveVersion() method
  - Write tests for getAvailableVersions() method
  - _Requirements: 1.1, 1.2_

- [ ] 2. Enhance mkdocsMarkdownConverter test coverage
  - Add tests for tabbed content, SVG processing, and complex HTML conversions
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.1 Add tests for tabbed content processing
  - Write tests for tabbed-set with multiple tabs
  - Write tests for tab content extraction and sequential section creation
  - Write tests for nested content within tabs
  - Write tests for empty or malformed tabbed structures
  - _Requirements: 2.1, 2.4_

- [ ] 2.2 Add tests for SVG processing
  - Write tests for decorative SVG removal (icons in header, nav, footer)
  - Write tests for content SVG preservation (diagrams in main content)
  - Write tests for SVG class-based detection
  - Write tests for SVG parent context detection
  - _Requirements: 2.1, 2.3_

- [ ] 2.3 Add tests for heading search and DOM traversal
  - Write tests for heading search in previous siblings
  - Write tests for heading search traversing up the DOM tree
  - Write tests for heading search with headerlink removal
  - Write tests for heading search fallback behavior
  - _Requirements: 2.1, 2.4_

- [ ] 2.4 Add tests for complex markdown conversions
  - Write tests for nested lists (ul within ol, multiple levels)
  - Write tests for blockquotes with multiple lines
  - Write tests for horizontal rules
  - Write tests for images with title attributes
  - Write tests for complex inline formatting (nested strong/em, code within links)
  - _Requirements: 2.1, 2.4_

- [x] 3. Create comprehensive versionDetection test suite
  - Create new test file and add tests for all versionDetection functions
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.1 Create versionDetection test file and add basic tests
  - Create tests/shared/versionDetection_test.ts file
  - Write tests for detectVersioning() with successful versions.json fetch
  - Write tests for detectVersioning() with failed versions.json fetch
  - Write tests for detectVersioning() caching behavior
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Add tests for URL building functionality
  - Write tests for buildVersionedUrl() with versioned sites
  - Write tests for buildVersionedUrl() with non-versioned sites
  - Write tests for buildVersionedUrl() with different versions
  - Write tests for buildVersionedUrl() with missing version parameter
  - _Requirements: 3.1, 3.2_

- [x] 3.3 Add tests for cache operations and error handling
  - Write tests for clearVersionDetectionCache() functionality
  - Write tests for error handling during version detection
  - Write tests for network timeout scenarios
  - Write tests for malformed versions.json responses
  - _Requirements: 3.1, 3.3_

- [ ] 4. Enhance fetch-doc test coverage
  - Add tests for URL validation, cache operations, and error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.1 Add tests for URL validation and cache key generation
  - Write tests for isValidUrl() with various URL formats
  - Write tests for generateMarkdownCacheKey() with ETag present
  - Write tests for generateMarkdownCacheKey() without ETag (content hash)
  - Write tests for generateContentHash() functionality
  - _Requirements: 4.1, 4.2_

- [ ] 4.2 Add tests for conversion cache operations
  - Write tests for getConversionFromCache() with cache hit
  - Write tests for getConversionFromCache() with cache miss
  - Write tests for saveConversionToCache() success
  - Write tests for cache error handling (ENOENT, not found)
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 4.3 Add tests for fetch and conversion flow
  - Write tests for fetchDocPage() with HTML cache hit and conversion cache hit
  - Write tests for fetchDocPage() with HTML cache hit and conversion cache miss
  - Write tests for fetchDocPage() with HTML cache miss (network fetch)
  - Write tests for ETag-based cache validation
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.4 Add tests for error handling and cache clearing
  - Write tests for fetchDocPage() with invalid URL
  - Write tests for fetchDocPage() with network errors
  - Write tests for fetchDocPage() with timeout
  - Write tests for clearDocCache() functionality
  - _Requirements: 4.1, 4.3_

- [x] 5. Create comprehensive VersionErrors test suite
  - Create new test file and add tests for all error classes
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.1 Create VersionErrors test file and add VersionNotFoundError tests
  - Create tests/shared/errors/VersionErrors_test.ts file
  - Write tests for VersionNotFoundError instantiation with available versions
  - Write tests for VersionNotFoundError message formatting
  - Write tests for VersionNotFoundError property accessibility (requestedVersion, availableVersions)
  - Write tests for VersionNotFoundError name property
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.2 Add VersionDetectionError tests
  - Write tests for VersionDetectionError instantiation with cause
  - Write tests for VersionDetectionError message formatting
  - Write tests for VersionDetectionError property accessibility (baseUrl, cause)
  - Write tests for VersionDetectionError name property
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.3 Add IndexLoadError tests
  - Write tests for IndexLoadError instantiation with version
  - Write tests for IndexLoadError instantiation without version
  - Write tests for IndexLoadError message formatting
  - Write tests for IndexLoadError property accessibility (baseUrl, version, cause)
  - Write tests for IndexLoadError name property
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Enhance server test coverage
  - Add tests for version detection at startup and schema selection
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Add tests for server creation with version detection
  - Write tests for createServer() with versioned site (versions.json exists)
  - Write tests for createServer() with non-versioned site (versions.json missing)
  - Write tests for createServer() with versions.json fetch error
  - Write tests for createServer() with empty versions.json
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.2 Add tests for tool list response with schema selection
  - Write tests for ListToolsRequest with versioned site (includes version parameter)
  - Write tests for ListToolsRequest with non-versioned site (excludes version parameter)
  - Write tests for tool descriptions including available versions
  - Write tests for tool schema validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Enhance IndexCache test coverage
  - Add edge case tests for memory estimation and eviction
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7.1 Add edge case tests for IndexCache
  - Write tests for memory estimation with unknown object structures
  - Write tests for expired entry removal during set operations
  - Write tests for multiple evictions in single constraint enforcement
  - Write tests for cache with maxSize=0
  - Write tests for cache with maxMemoryMB=0
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8. Enhance VersionManager test coverage
  - Add edge case tests for version resolution and retry logic
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8.1 Add edge case tests for VersionManager
  - Write tests for version resolution with empty aliases array
  - Write tests for fetchVersions() with network timeout
  - Write tests for retry logic with partial failures and exponential backoff
  - Write tests for cache timeout edge cases
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9. Enhance searchMkDoc tool test coverage
  - Add tests for advanced scoring logic and error formatting
  - _Requirements: 6.4, 6.5_

- [ ] 9.1 Add tests for advanced search scoring
  - Write tests for search with title match boost
  - Write tests for search with exact title match boost
  - Write tests for search with tag match boost
  - Write tests for search with article vs section boost
  - Write tests for combined boost calculations
  - _Requirements: 6.4_

- [ ] 9.2 Add tests for search result formatting and error handling
  - Write tests for search results with parent article context for sections
  - Write tests for VersionNotFoundError response formatting
  - Write tests for generic error response formatting
  - Write tests for confidence threshold filtering
  - _Requirements: 6.4, 6.5_

- [ ] 10. Enhance logger test coverage
  - Add test for debug level logging with environment variable
  - _Requirements: 6.5_

- [ ] 10.1 Add debug level logging test
  - Write test for debug() method with LOG_LEVEL=DEBUG environment variable
  - Write test verifying debug messages are logged when level is DEBUG
  - Write test verifying debug messages are filtered when level is INFO
  - _Requirements: 6.5_

- [ ] 11. Verify coverage targets and run final validation
  - Run coverage report and verify all targets are met
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11.1 Run coverage report and validate results
  - Execute npm run test:ci to generate coverage report
  - Verify SearchIndexFactory coverage ≥ 90%
  - Verify mkdocsMarkdownConverter coverage ≥ 90%
  - Verify versionDetection coverage ≥ 85%
  - Verify fetch-doc coverage ≥ 80%
  - Verify VersionErrors coverage ≥ 90%
  - Verify server coverage ≥ 90%
  - Verify IndexCache coverage ≥ 95%
  - Verify VersionManager coverage ≥ 95%
  - Verify searchMkDoc tool coverage ≥ 95%
  - Verify logger coverage ≥ 98%
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5_
