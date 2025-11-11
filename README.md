# MkDocs MCP Search Server

A Model Context Protocol (MCP) server that provides search functionality for any [MkDocs](https://squidfunk.github.io/mkdocs-material/) powered site.  This server relies on the existing MkDocs search implementation using the [Lunr.Js](https://lunrjs.com/) search engine.

## Claude Desktop Quickstart

Follow the installation instructions please follow the [Model Context Protocol Quickstart For Claude Desktop users](https://modelcontextprotocol.io/quickstart/user#mac-os-linux).  You will need to add a section tothe MCP configuration file as follows:

```json
{
  "mcpServers": {
    "my-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@serverless-dna/mkdocs-mcp",
        "https://your-doc-site",
        "Describe what you are enabling search for to help your AI Agent"
      ]
    }
  }
}
```

## Overview

This project implements an MCP server that enables Large Language Models (LLMs) to search through any published mkdocs documentation site. It uses lunr.js for efficient local search capabilities and provides results that can be summarized and presented to users.

## Features

- MCP-compliant server for integration with LLMs
- Local search using lunr.js indexes
- Version-specific documentation search capability
- MkDocs Material HTML to Markdown conversion with structured JSON responses
- Code example extraction with language detection and context
- Tab view support for multi-language documentation
- Mermaid diagram preservation
- Automatic URL resolution (relative to absolute)
- Intelligent caching for both search indexes and converted documentation

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Usage

The server can be run as an MCP server that communicates over stdio:

```bash
npx -y @serverless-dna/mkdocs-mcp https://your-doc-site.com
```

### Available Tools

#### Search Tool

The server provides a `searchMkDoc` tool with the following parameters:

- `search`: The search query string
- `version`: Optional version string (only for versioned sites)

**Sample Response:**
```json
{
  "query": "logger",
  "version": "latest",
  "total": 3,
  "results": [
    {
      "title": "Logger",
      "url": "https://docs.example.com/latest/core/logger/",
      "score": 1.2,
      "preview": "Logger utility for structured logging...",
      "location": "core/logger/"
    },
    {
      "title": "Configuration",
      "url": "https://docs.example.com/latest/core/logger/#config",
      "score": 0.8,
      "preview": "Configure the logger with custom settings...",
      "location": "core/logger/#config",
      "parentArticle": {
        "title": "Logger",
        "location": "core/logger/",
        "url": "https://docs.example.com/latest/core/logger/"
      }
    }
  ]
}
```

**Features:**
- Confidence-based filtering (configurable threshold)
- Advanced scoring with title matching and boosting
- Parent article context for section results
- Limited to top results (configurable, default: 10)

#### Fetch Documentation Tool

The server provides a `fetchMkDoc` tool that retrieves and converts documentation pages:

- `url`: The URL of the documentation page to fetch

**Sample Response:**
```json
{
  "title": "Getting Started",
  "markdown": "# Getting Started\n\nThis guide will help you...\n\n## Installation\n\n```bash\nnpm install example\n```",
  "code_examples": [
    {
      "title": "Installation",
      "description": "Install the package using npm",
      "code": "```bash\nnpm install example\n```"
    },
    {
      "title": "Basic Usage",
      "description": "Import and initialize the library",
      "code": "```python\nfrom example import Client\nclient = Client()\n```"
    }
  ],
  "url": "https://docs.example.com/getting-started/"
}
```

## Configuration

The server can be configured using environment variables:

- `SEARCH_CONFIDENCE_THRESHOLD`: Minimum confidence score for search results (default: `0.1`)
- `SEARCH_MAX_RESULTS`: Maximum number of search results to return (default: `10`)
- `CACHE_BASE_PATH`: Base directory for cache storage (default: `<system-tmp>/mkdocs-mcp-cache`)

Example:
```bash
SEARCH_MAX_RESULTS=20 SEARCH_CONFIDENCE_THRESHOLD=0.2 npx @serverless-dna/mkdocs-mcp https://your-doc-site.com
```

**Cache Location:**
By default, the server caches search indexes and converted documentation in the system's temporary directory:
- **macOS/Linux**: `/tmp/mkdocs-mcp-cache` (or `$TMPDIR`)
- **Windows**: `%TEMP%\mkdocs-mcp-cache`

You can override this with the `CACHE_BASE_PATH` environment variable.

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

### Claude Desktop MCP Configuration

During development you can run the MCP Server with Claude Desktop using the following configuration.

The configuration below shows running in windows claude desktop while developing using the Windows Subsystem for Linux (WSL).  Mac or Linux environments you can run in a similar way.  

The output is a bundled file which enables Node installed in windows to run the MCP server since all dependencies are bundled.

```json
{
  "mcpServers": {
    "powertools": {
	"command": "node",
	"args": [
	  "\\\\wsl$\\Ubuntu\\home\\walmsles\\dev\\serverless-dna\\mkdocs-mcp\\dist\\index.js",
    "Search online documentation"
	]
    }
  }
}
```

## How It Works

### Search Functionality
1. The server loads pre-built lunr.js indexes for each supported runtime
2. When a search request is received, it:
   - Loads the appropriate index based on version (currently fixed to latest)
   - Performs the search using lunr.js
   - Returns the search results as JSON
3. The LLM can then use these results to find relevant documentation pages

### Documentation Fetching
1. When a fetch request is received with a URL:
   - Fetches the HTML content (with caching)
   - Parses the MkDocs Material HTML structure using Cheerio
   - Removes navigation, headers, footers, and other UI elements
   - Processes tab views into sequential sections
   - Extracts code blocks with language detection and context
   - Resolves all relative URLs to absolute URLs
   - Converts the cleaned HTML to markdown
   - Returns a structured JSON response with title, markdown, and code examples
2. Results are cached to improve performance on subsequent requests

## License

MIT
