# Requirements Document

## Introduction

This feature enhances the MkDocs MCP Search Server to properly handle version-aware search indexing. Currently, the system has basic version detection but needs improvements to properly load and manage separate search indexes for different documentation versions, handle sites with and without versioning seamlessly, and provide better version resolution and caching.

## Glossary

- **MkDocs_Site**: A documentation website built with the MkDocs static site generator
- **Search_Index**: A Lunr.js search index containing searchable documentation content for a specific version
- **Version_File**: A JSON file located at `<baseUrl>/versions.json` containing available version information
- **Search_Index_Factory**: The service responsible for creating and managing search indexes
- **Version_Resolution**: The process of determining the correct version to use for search operations
- **Index_Cache**: In-memory storage of loaded search indexes to avoid repeated fetching

## Requirements

### Requirement 1

**User Story:** As an LLM application, I want to search documentation on sites with versioning, so that I can access version-specific content accurately.

#### Acceptance Criteria

1. WHEN a search request includes a version parameter, THE Search_Index_Factory SHALL load the search index specific to that version
2. WHEN a version-specific search index is not cached, THE Search_Index_Factory SHALL fetch and instantiate a new Lunr index for that version
3. WHEN a search request specifies an invalid version, THE Search_Index_Factory SHALL return an error indicating available versions
4. WHERE a site has versioning enabled, THE Search_Index_Factory SHALL maintain separate cached indexes for each requested version
5. WHEN switching between versions in search requests, THE Search_Index_Factory SHALL use the appropriate cached index without re-fetching

### Requirement 2

**User Story:** As an LLM application, I want to search documentation on sites without versioning, so that I can access content on non-versioned sites seamlessly.

#### Acceptance Criteria

1. WHEN a MkDocs_Site does not have a Version_File, THE Search_Index_Factory SHALL load a single default search index
2. WHEN a search request includes a version parameter on a non-versioned site, THE Search_Index_Factory SHALL ignore the version parameter and use the default index
3. THE Search_Index_Factory SHALL cache the default index using a consistent cache key for non-versioned sites
4. WHEN version detection fails, THE Search_Index_Factory SHALL fall back to non-versioned behavior

### Requirement 3

**User Story:** As a system administrator, I want version resolution to work with aliases, so that users can reference versions by common names like "latest" or "stable".

#### Acceptance Criteria

1. WHEN a Version_File contains version aliases, THE Search_Index_Factory SHALL resolve alias names to actual version identifiers
2. WHEN a search request uses "latest" without explicit version data, THE Search_Index_Factory SHALL determine the latest version from available versions
3. THE Search_Index_Factory SHALL cache version resolution results to avoid repeated Version_File fetching
4. WHEN version aliases change, THE Search_Index_Factory SHALL invalidate related cached indexes

### Requirement 4

**User Story:** As a developer, I want efficient index management, so that the system performs well with multiple versions and concurrent requests.

#### Acceptance Criteria

1. THE Search_Index_Factory SHALL implement memory-efficient caching with configurable limits
2. WHEN memory usage exceeds thresholds, THE Search_Index_Factory SHALL evict least-recently-used indexes
3. THE Search_Index_Factory SHALL handle concurrent requests for the same version without duplicate index loading
4. WHEN index loading fails, THE Search_Index_Factory SHALL provide detailed error information including available versions

### Requirement 5

**User Story:** As a system integrator, I want proper error handling for version scenarios, so that I can diagnose and resolve version-related issues.

#### Acceptance Criteria

1. WHEN a Version_File is malformed or inaccessible, THE Search_Index_Factory SHALL log appropriate warnings and fall back to non-versioned behavior
2. WHEN a version-specific search index is missing, THE Search_Index_Factory SHALL return an error with available version information
3. THE Search_Index_Factory SHALL provide version validation methods that return detailed resolution results
4. WHEN network errors occur during version detection, THE Search_Index_Factory SHALL implement appropriate retry logic with exponential backoff
