# MkDocs MCP Refactoring Plan

## Overview
This plan outlines the changes needed to refactor the codebase from the Powertools-specific implementation to a generic MkDocs implementation, removing the runtime concept entirely.

## Key Changes

1. **SearchIndexFactory Class**
   - Remove all runtime parameters from methods
   - Update URL construction to use only baseUrl and version
   - Modify caching mechanism to use only version as key
   - Update version resolution to work with generic MkDocs sites

2. **Index File**
   - Update `getSearchIndexUrl` function to remove runtime parameter
   - Update `fetchSearchIndex` function to remove runtime parameter
   - Update `fetchAvailableVersions` function to work with generic MkDocs sites

3. **Tests**
   - Update all test cases to remove runtime references
   - Modify mocks to reflect the new structure without runtimes
   - Update test descriptions to reflect the new functionality
   - Ensure all tests pass with the refactored code

4. **Main Server File**
   - Update tool descriptions to reflect generic MkDocs functionality
   - Update URL construction in search results to use only baseUrl and version
   - Update error handling for version resolution

## Implementation Steps

1. First, refactor the `searchIndex.ts` file to remove runtime parameters
2. Update the tests in `searchIndex.spec.ts` to match the new implementation
3. Update the main server file (`index.ts`) to use the refactored code
4. Run tests to ensure everything works correctly
5. Update documentation to reflect the changes
