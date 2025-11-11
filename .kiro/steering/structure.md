# Project Structure

## Directory Organization

```
src/
├── config/           # Configuration modules (cache settings)
├── services/         # Core business logic services
│   ├── fetch/       # HTTP fetching and cache management
│   ├── logger/      # Logging infrastructure
│   └── markdown/    # HTML-to-markdown conversion strategies
├── shared/          # Shared utilities (search index handling)
├── tools/           # MCP tool implementations
│   ├── fetchMkDoc/  # Fetch documentation tool
│   ├── searchMkDoc/ # Search documentation tool
│   └── shared/      # Shared tool utilities (response building)
├── types/           # TypeScript type definitions
├── constants.ts     # Application constants
├── index.ts         # Entry point and CLI argument handling
└── server.ts        # MCP server setup and tool registration
```

## Architecture Patterns

### Service Layer Pattern
- Services are organized by domain (fetch, logger, markdown)
- Each service exports a clean public API via `index.ts`
- Internal implementation details are kept private

### Factory Pattern
- `ConverterFactory` creates HTML-to-markdown converter instances
- Supports multiple converter strategies (node-html-markdown, AI-optimized)
- Default converter optimized for AI consumption

### Tool Pattern
- Each MCP tool is self-contained in its own directory
- Tool structure: `tool.ts` (implementation), `schemas.ts` (Zod validation), `index.ts` (exports)
- Tools export: name, description, schema, and tool function

### Dependency Injection
- Server creation accepts configuration parameters (docsUrl, searchDoc)
- Tools receive dependencies via function parameters
- Enables testing and flexibility

## File Naming Conventions

- **Implementation files**: camelCase (e.g., `cacheManager.ts`)
- **Test files**: `*.spec.ts` suffix (co-located with implementation)
- **Type definition files**: `*.d.ts` or `types.ts`
- **Index files**: `index.ts` for public API exports

## Testing Strategy

- **Unit tests**: Co-located with source files (`*.spec.ts`)
- **Coverage**: Collected from all `src/**/*.ts` except tests, type definitions, and index files
- **Test environment**: Node.js with ts-jest
- **Isolated modules**: Enabled for faster compilation

## Build Artifacts

- **dist/**: Bundled executable output
- **coverage/**: Test coverage reports (HTML, LCOV, JSON)
- **indexes/**: Pre-built Lunr.js search indexes (not in src/)

## Configuration Files

- **Root level**: Package config, build tools, linting, testing
- **.kiro/**: Kiro-specific steering and specifications
- **No nested configs**: All tool configs at project root
