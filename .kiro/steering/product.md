# Product Overview

MkDocs MCP Search Server is a Model Context Protocol (MCP) server that enables Large Language Models to search and retrieve documentation from any MkDocs-powered website.

## Core Functionality

- **Search Tool**: Searches MkDocs documentation using pre-built Lunr.js indexes with confidence-based filtering
- **Fetch Tool**: Retrieves and converts documentation pages from HTML to AI-optimized markdown format
- **Caching**: Implements intelligent caching for both search indexes and fetched documentation

## Target Users

- LLM applications (Claude Desktop, etc.) that need to access MkDocs documentation
- Developers building AI agents that require documentation search capabilities
- Teams wanting to make their MkDocs sites accessible to AI assistants

## Key Value Proposition

Provides a standardized MCP interface for any MkDocs site, leveraging existing Lunr.js search infrastructure without requiring modifications to the documentation site itself.
