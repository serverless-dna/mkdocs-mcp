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

The server provides a `search_docs` tool with the following parameters:

- `search`: The search query string
- `version`: Optional version string (defaults to 'latest')

#### Fetch Documentation Tool

The server provides a `fetch_mkdoc` tool that retrieves and converts documentation pages:

- `url`: The URL of the documentation page to fetch

**Response Format:**
```json
{
  "title": "Page Title",
  "markdown": "# Page Title\n\nConverted markdown content...",
  "code_examples": [
    {
      "title": "Example Title",
      "description": "Short description of the code",
      "code": "```python\ncode here\n```"
    }
  ],
  "url": "https://docs.example.com/page"
}
```

The converter is optimized for MkDocs Material sites and:
- Extracts clean content from MkDocs Material HTML structure
- Identifies and labels code blocks with programming languages
- Extracts code examples with surrounding context (title and description)
- Unpacks tab views into sequential sections
- Preserves Mermaid diagrams as code blocks
- Converts images to markdown format
- Resolves all relative URLs to absolute URLs

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
