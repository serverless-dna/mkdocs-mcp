# MkDocs MCP Search Server

A Model Context Protocol (MCP) server that provides search functionality for any [MkDocs](https://squidfunk.github.io/mkdocs-material/) powered site.  This server relies on the existing MkDocs search implementation using the [Lunr.Js](https://lunrjs.com/) search engine.

## Claude Desktop Quickstart

Follow the installation instructions please follow the [Model Context Protocol Quickstart For Claude Desktop users](https://modelcontextprotocol.io/quickstart/user#mac-os-linux).  You will need to add a section to the MCP configuration file as follows:

### For Versioned Documentation Sites

```json
{
  "mcpServers": {
    "my-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@serverless-dna/mkdocs-mcp",
        "https://your-doc-site",
        "--versioned",
        "Describe what you are enabling search for to help your AI Agent"
      ]
    }
  }
}
```

### For Non-Versioned Documentation Sites

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
- Support for both versioned and non-versioned documentation sites
- Conditional tool schema based on site type
- Version-specific documentation search capability (when using `--versioned` flag)

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Usage

The server can be run as an MCP server that communicates over stdio:

### For Versioned Documentation Sites

```bash
npx -y @serverless-dna/mkdocs-mcp https://your-doc-site.com --versioned
```

### For Non-Versioned Documentation Sites

```bash
npx -y @serverless-dna/mkdocs-mcp https://your-doc-site.com
```

### Search Tool

The server provides a `search` tool with parameters that depend on the site type:

**For versioned sites (with `--versioned` flag):**
- `search`: The search query string
- `version`: Optional version string (defaults to 'latest')

**For non-versioned sites (default):**
- `search`: The search query string

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

1. The server loads pre-built lunr.js indexes for each supported runtime
2. When a search request is received, it:
   - Loads the appropriate index based on version (currently fixed to latest)
   - Performs the search using lunr.js
   - Returns the search results as JSON
3. The LLM can then use these results to find relevant documentation pages

## License

MIT