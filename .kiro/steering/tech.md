# Technology Stack

## Core Technologies

- **Runtime**: Node.js 20+ (bundled for standalone execution)
- **Language**: TypeScript 5.8+ with strict mode enabled
- **Build System**: esbuild (bundled, minified output with sourcemaps)
- **Package Manager**: npm
- **Module System**: ESNext with Node resolution

## Key Dependencies

- **@modelcontextprotocol/sdk**: MCP server implementation
- **lunr**: Search engine for documentation indexes
- **cheerio**: HTML parsing and manipulation
- **node-html-markdown**: HTML to markdown conversion
- **cacache**: File-based caching system
- **make-fetch-happen**: HTTP client with caching support
- **zod**: Schema validation and type safety

## Development Tools

- **Testing**: Jest with ts-jest preset
- **Linting**: ESLint 9 with TypeScript, import sorting, and Prettier integration
- **Release**: Semantic Release with changelog and git automation

## Common Commands

```bash
# Install dependencies
npm install

# Build (includes lint check, cleans dist, bundles, and makes executable)
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Development build with MCP inspector
npm run dev:build

# Release (semantic versioning)
npm run release

# Dry-run release
npm run release:dry-run
```

## Build Configuration

- **Target**: ES2022, Node 20+
- **Output**: Single bundled executable in `dist/index.js` with shebang
- **Bundling**: All dependencies bundled (no externals)
- **Source Maps**: Enabled for debugging
- **Minification**: Enabled for production

## Code Quality Standards

- **Coverage Thresholds**: Branches 25%, Functions 50%, Lines 55%, Statements 10%
- **TypeScript**: Strict mode with isolated modules
- **Import Order**: Enforced via simple-import-sort plugin
- **Unused Imports**: Automatically detected and warned
