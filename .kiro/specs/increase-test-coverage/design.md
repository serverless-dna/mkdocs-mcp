# Design Document: Increase Test Coverage

## Overview

This design outlines the approach to increase test coverage for the MkDocs MCP Search Server from the current 83% patch coverage to meet or exceed project quality standards. The focus is on achieving comprehensive coverage for critical modules while maintaining test quality and avoiding over-testing edge cases.

### Current Coverage Gaps

Based on the coverage report, the following files have significant coverage gaps:

1. **SearchIndexFactory.ts** - 62.75% (54 lines missing)
2. **mkdocsMarkdownConverter.ts** - 86.16% (35 lines missing)
3. **versionDetection.ts** - 26.92% (19 lines missing)
4. **fetch-doc.ts** - 54.54% (10 lines missing)
5. **VersionErrors.ts** - 43.75% (9 lines missing)
6. **server.ts** - 84.61% (8 lines missing)
7. **IndexCache.ts** - 93.96% (7 lines missing)
8. **VersionManager.ts** - 94.33% (6 lines missing)
9. **searchMkDoc/tool.ts** - 92.98% (4 lines missing)
10. **logger.ts** - 96.00% (1 line missing)

### Target Coverage Goals

- **SearchIndexFactory**: 90% line coverage
- **mkdocsMarkdownConverter**: 90% line coverage
- **versionDetection**: 85% line coverage
- **fetch-doc**: 80% line coverage
- **VersionErrors**: 90% line coverage
- **server**: 90% line coverage
- **IndexCache**: 95% line coverage
- **VersionManager**: 95% line coverage
- **searchMkDoc tool**: 95% line coverage
- **logger**: 98% line coverage

## Architecture

### Testing Strategy

The testing approach follows these principles:

1. **Unit Testing Focus**: Test individual functions and methods in isolation using mocks for dependencies
2. **Integration Testing**: Test interactions between components where critical
3. **Error Path Coverage**: Ensure error handling paths are tested
4. **Edge Case Testing**: Cover boundary conditions and unusual inputs
5. **Mock Strategy**: Use Jest mocks for external dependencies (fetch, file system, logger)

### Test Organization

Tests are organized in the `tests/` directory mirroring the `src/` structure:

```
tests/
├── services/
│   ├── fetch/
│   ├── logger/
│   └── markdown/
├── shared/
│   └── errors/
└── tools/
    ├── fetchMkDoc/
    └── searchMkDoc/
```

## Components and Interfaces

### 1. SearchIndexFactory Tests

**File**: `tests/shared/SearchIndexFactory_test.ts`

**Current Coverage**: 62.75% (54 lines missing)

**Missing Coverage Areas**:
- Non-versioned site index loading with multiple path attempts
- Cache hit/miss scenarios for both versioned and non-versioned sites
- MkDocs index to Lunr index conversion
- Document map creation with parent-child relationships
- Index size estimation
- Cache statistics retrieval
- Backward compatibility methods

**Test Cases to Add**:
1. Non-versioned site loading from different paths (search/search_index.json, search_index.json, etc.)
2. Cache operations (set, get, clear) for both versioned and non-versioned indexes
3. MkDocs to Lunr index conversion with various document structures
4. Parent-child relationship handling for sections and articles
5. Index size estimation accuracy
6. Error handling when all index paths fail
7. Successful index loading and caching flow

### 2. mkdocsMarkdownConverter Tests

**File**: `tests/services/markdown/mkdocsMarkdownConverter_test.ts`

**Current Coverage**: 86.16% (35 lines missing)

**Missing Coverage Areas**:
- Tabbed content processing edge cases
- SVG processing (decorative vs content SVGs)
- Heading search in DOM traversal
- Nested list conversion
- Blockquote conversion
- Horizontal rule conversion
- Image with title attribute
- Complex inline element combinations

**Test Cases to Add**:
1. Tabbed content with multiple tabs and nested content
2. SVG elements in different contexts (header, nav, content)
3. Heading search traversing up the DOM tree
4. Nested lists (ul within ol, multiple levels)
5. Blockquotes with multiple lines
6. Horizontal rules in content
7. Images with title attributes
8. Complex inline formatting (nested strong/em, code within links)

### 3. versionDetection Tests

**File**: `tests/shared/versionDetection_test.ts` (NEW)

**Current Coverage**: 26.92% (19 lines missing)

**Missing Coverage Areas**:
- Most of the module is untested
- Cache operations
- URL building for versioned vs non-versioned sites
- Error handling

**Test Cases to Add**:
1. Version detection with successful versions.json fetch
2. Version detection with failed versions.json fetch
3. Version detection caching behavior
4. URL building for versioned sites with different versions
5. URL building for non-versioned sites
6. Cache clearing functionality
7. Error handling during version detection

### 4. fetch-doc Tests

**File**: `tests/fetch-doc_test.ts`

**Current Coverage**: 54.54% (10 lines missing)

**Missing Coverage Areas**:
- URL validation logic
- Cache key generation with and without ETag
- Content hash generation
- Conversion cache operations (get, save)
- Cache hit/miss scenarios for both HTML and conversion
- Error handling in cache operations

**Test Cases to Add**:
1. URL validation for various URL formats
2. Cache key generation with ETag present
3. Cache key generation without ETag (using content hash)
4. Conversion cache hit when HTML is cached
5. Conversion cache miss requiring re-conversion
6. Cache save operations
7. Error handling in cache get/save operations
8. Clear cache functionality

### 5. VersionErrors Tests

**File**: `tests/shared/errors/VersionErrors_test.ts` (NEW)

**Current Coverage**: 43.75% (9 lines missing)

**Missing Coverage Areas**:
- VersionDetectionError instantiation and properties
- IndexLoadError instantiation and properties
- Error message formatting
- Error properties accessibility

**Test Cases to Add**:
1. VersionNotFoundError with available versions
2. VersionNotFoundError message formatting
3. VersionDetectionError with cause
4. VersionDetectionError message formatting
5. IndexLoadError with version
6. IndexLoadError without version
7. IndexLoadError message formatting
8. Error name properties
9. Error property accessibility (requestedVersion, availableVersions, baseUrl, cause)

### 6. server Tests

**File**: `tests/server_test.ts`

**Current Coverage**: 84.61% (8 lines missing)

**Missing Coverage Areas**:
- Version detection at server startup
- Handling of versioned vs non-versioned sites
- Tool schema selection based on versioning
- Error handling in server creation

**Test Cases to Add**:
1. Server creation with versioned site (versions.json exists)
2. Server creation with non-versioned site (versions.json missing)
3. Tool list response with versioned site schema
4. Tool list response with non-versioned site schema
5. Error handling when versions.json fetch fails
6. Available versions in tool description for versioned sites

### 7. IndexCache Tests

**File**: `tests/shared/IndexCache_test.ts`

**Current Coverage**: 93.96% (7 lines missing)

**Missing Coverage Areas**:
- Edge cases in memory estimation
- Expired entry removal during constraint enforcement
- Specific eviction scenarios

**Test Cases to Add**:
1. Memory estimation for objects without known structure
2. Expired entry removal during set operations
3. Multiple evictions in a single constraint enforcement
4. Edge case: cache with maxSize=0
5. Edge case: cache with maxMemoryMB=0

### 8. VersionManager Tests

**File**: `tests/shared/VersionManager_test.ts`

**Current Coverage**: 94.33% (6 lines missing)

**Missing Coverage Areas**:
- Edge cases in version resolution
- Error handling in fetchVersions
- Specific retry scenarios

**Test Cases to Add**:
1. Version resolution with empty aliases array
2. fetchVersions with network timeout
3. Retry logic with partial failures
4. Cache timeout edge cases

### 9. searchMkDoc Tool Tests

**File**: `tests/tools/searchMkDoc/tool_test.ts`

**Current Coverage**: 92.98% (4 lines missing)

**Missing Coverage Areas**:
- Advanced scoring logic (title match, tag match, article vs section boost)
- Parent article context for sections
- Error response formatting

**Test Cases to Add**:
1. Search with title match boost
2. Search with tag match boost
3. Search with article vs section boost
4. Search results with parent article context for sections
5. VersionNotFoundError response formatting
6. Generic error response formatting

### 10. logger Tests

**File**: `tests/services/logger/logger_test.ts`

**Current Coverage**: 96.00% (1 line missing)

**Missing Coverage Areas**:
- Debug level logging when LOG_LEVEL is set to DEBUG

**Test Cases to Add**:
1. Debug logging with LOG_LEVEL=DEBUG environment variable

## Data Models

### Test Data Structures

#### Mock Search Index
```typescript
const mockSearchIndex = {
  config: {
    lang: ['en'],
    separator: ' ',
    pipeline: ['stemmer']
  },
  docs: [
    {
      location: 'index/',
      title: 'Home',
      text: 'Welcome to the documentation',
      tags: ['intro']
    },
    {
      location: 'guide/getting-started/',
      title: 'Getting Started',
      text: 'Learn how to get started',
      tags: ['guide']
    },
    {
      location: 'guide/getting-started/#installation',
      title: 'Installation',
      text: 'Install the package',
      tags: []
    }
  ]
};
```

#### Mock Versions
```typescript
const mockVersions = [
  {
    version: 'latest',
    title: 'Latest',
    aliases: ['main', 'stable']
  },
  {
    version: '1.0.0',
    title: 'Version 1.0',
    aliases: ['v1']
  }
];
```

#### Mock HTML Samples
```typescript
const mockTabbedHTML = `
  <div class="tabbed-set">
    <input type="radio" id="tab1" name="tabs">
    <label for="tab1">Tab 1</label>
    <div class="tabbed-content">Content 1</div>
    
    <input type="radio" id="tab2" name="tabs">
    <label for="tab2">Tab 2</label>
    <div class="tabbed-content">Content 2</div>
  </div>
`;
```

## Error Handling

### Error Testing Strategy

1. **Network Errors**: Mock fetch failures to test retry logic and fallback behavior
2. **Invalid Data**: Test with malformed JSON, missing fields, invalid types
3. **Cache Errors**: Test cache read/write failures
4. **Version Errors**: Test VersionNotFoundError, VersionDetectionError, IndexLoadError
5. **Conversion Errors**: Test HTML parsing errors, URL resolution errors

### Error Scenarios to Cover

- Fetch timeout
- Network connection failure
- 404 responses
- 500 server errors
- Malformed JSON responses
- Missing required fields
- Invalid data types
- Cache corruption
- File system errors
- Circular references in objects

## Testing Strategy

### Mock Strategy

**Dependencies to Mock**:
- `fetchService` - Mock HTTP requests and responses
- `logger` - Mock logging to avoid stderr output during tests
- `cacache` - Mock file-based caching operations
- File system operations (fs module)

**Mock Patterns**:
```typescript
// Mock fetch service
jest.mock('../../src/services/fetch');
const mockFetchService = fetchService as jest.Mocked<typeof fetchService>;

// Mock logger
jest.mock('../../src/services/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

// Setup mock responses
mockFetchService.fetch.mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(mockData)
} as any);
```

### Test Execution

**Test Commands**:
- `npm test` - Run all tests
- `npm run test:ci` - Run tests with coverage report
- `npm run lint` - Check code quality

**Coverage Thresholds** (from jest.config.js):
- Branches: 25%
- Functions: 50%
- Lines: 55%
- Statements: 10%

### Test Quality Guidelines

1. **Descriptive Test Names**: Use clear, descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Follow AAA pattern for test structure
3. **One Assertion Per Test**: Focus each test on a single behavior
4. **Mock Isolation**: Ensure mocks are cleared between tests
5. **Avoid Over-Mocking**: Only mock external dependencies, not internal logic
6. **Test Real Behavior**: Test actual functionality, not implementation details

## Implementation Approach

### Phase 1: High-Impact Modules (Priority 1)

Focus on modules with the most missing coverage:

1. **SearchIndexFactory** (54 lines missing)
   - Add tests for non-versioned site loading
   - Add tests for cache operations
   - Add tests for index conversion

2. **mkdocsMarkdownConverter** (35 lines missing)
   - Add tests for tabbed content
   - Add tests for SVG processing
   - Add tests for complex conversions

3. **versionDetection** (19 lines missing)
   - Create comprehensive test suite
   - Cover all functions and error paths

### Phase 2: Medium-Impact Modules (Priority 2)

4. **fetch-doc** (10 lines missing)
   - Add cache operation tests
   - Add URL validation tests

5. **VersionErrors** (9 lines missing)
   - Create comprehensive error tests

6. **server** (8 lines missing)
   - Add version detection tests
   - Add schema selection tests

### Phase 3: Polish and Edge Cases (Priority 3)

7. **IndexCache** (7 lines missing)
   - Add edge case tests

8. **VersionManager** (6 lines missing)
   - Add edge case tests

9. **searchMkDoc tool** (4 lines missing)
   - Add scoring logic tests

10. **logger** (1 line missing)
    - Add debug level test

## Success Criteria

### Coverage Targets

- Overall patch coverage: ≥ 90%
- SearchIndexFactory: ≥ 90% line coverage
- mkdocsMarkdownConverter: ≥ 90% line coverage
- versionDetection: ≥ 85% line coverage
- fetch-doc: ≥ 80% line coverage
- All other modules: ≥ 90% line coverage

### Quality Metrics

- All tests pass consistently
- No flaky tests
- Test execution time < 30 seconds
- Clear, descriptive test names
- Proper mock isolation
- No test interdependencies

### Validation

1. Run `npm run test:ci` to generate coverage report
2. Verify coverage thresholds are met
3. Verify all tests pass
4. Review coverage report HTML for any remaining gaps
5. Ensure build passes with `npm run build`
