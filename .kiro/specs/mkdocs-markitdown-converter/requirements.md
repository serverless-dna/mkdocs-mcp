# Requirements Document

## Introduction

This feature reworks the HTML to Markdown conversion system to work like Microsoft's Markitdown library, specifically optimized for MkDocs Material site HTML. The system will parse MkDocs Material HTML structure, extract clean content, properly identify and label code examples, and return structured JSON API responses instead of plain markdown text.

## Glossary

- **MCP Server**: Model Context Protocol server that provides tools for fetching and converting documentation
- **Markitdown**: Microsoft's library for converting various document formats to markdown
- **MkDocs Material**: A popular Material Design theme for MkDocs documentation sites
- **Converter**: A TypeScript module that transforms HTML content into structured markdown
- **JSON API Response**: A structured JSON object containing markdown content and metadata
- **Code Block**: A section of code in the documentation with language identification and optional labels

## Requirements

### Requirement 1

**User Story:** As an AI assistant using the MCP server, I want to receive structured JSON responses with markdown content, so that I can easily parse and present documentation to users.

#### Acceptance Criteria

1. WHEN THE MCP Server processes a fetchMkDoc request, THE MCP Server SHALL return a JSON object containing markdown content and metadata
2. THE JSON Response SHALL include fields for title, markdown content, and code examples
3. THE JSON Response SHALL be properly typed with TypeScript interfaces
4. THE Markdown Content SHALL be included as a string field within the JSON response
5. THE MCP Server SHALL NOT return raw markdown text as the response

### Requirement 2

**User Story:** As an AI assistant, I want code examples to be properly identified and labeled with their programming language, so that I can accurately present code to developers.

#### Acceptance Criteria

1. WHEN THE Converter encounters a code block in HTML, THE Converter SHALL extract the programming language from class attributes
2. THE Converter SHALL identify code blocks within `<pre><code>` elements, `.highlight` containers, and `.codehilite` containers
3. WHEN a code block has a class like `language-python` or `lang-typescript`, THE Converter SHALL extract the language identifier
4. THE Code Block SHALL be formatted as a fenced code block with the language identifier
5. WHERE no language is specified, THE Converter SHALL use an empty language identifier

### Requirement 3

**User Story:** As an AI assistant, I want the converter to understand MkDocs Material HTML structure, so that I can extract clean content without navigation and UI elements.

#### Acceptance Criteria

1. THE Converter SHALL target the `div.md-content[data-md-component="content"]` container for main content extraction
2. THE Converter SHALL remove navigation elements including `.md-nav`, `.md-sidebar`, `.md-header`, and `.md-footer`
3. THE Converter SHALL remove UI elements including `.md-search`, `.md-tabs`, and `.headerlink`
4. THE Converter SHALL remove script and style tags from the extracted content
5. WHERE the main content container is not found, THE Converter SHALL fall back to body content extraction

### Requirement 4

**User Story:** As an AI assistant, I want headings to be properly converted with anchor links removed, so that the markdown is clean and readable.

#### Acceptance Criteria

1. WHEN THE Converter encounters heading elements (h1-h6), THE Converter SHALL convert them to ATX-style markdown headings
2. THE Converter SHALL remove `.headerlink` elements from headings
3. THE Converter SHALL preserve the heading text content
4. THE Converter SHALL maintain the heading hierarchy levels
5. THE Markdown Headings SHALL use the `#` prefix notation

### Requirement 5

**User Story:** As an AI assistant, I want lists and structured content to be properly formatted, so that documentation structure is preserved.

#### Acceptance Criteria

1. WHEN THE Converter encounters unordered lists, THE Converter SHALL convert them to markdown bullet lists using `*` or `-` markers
2. WHEN THE Converter encounters ordered lists, THE Converter SHALL convert them to numbered markdown lists
3. THE Converter SHALL preserve nested list structures
4. THE Converter SHALL convert links to markdown link format `[text](url)`
5. THE Converter SHALL convert emphasis and strong elements to markdown `*italic*` and `**bold**` syntax

### Requirement 6

**User Story:** As a developer, I want the converter to be modular and testable, so that I can maintain and extend the functionality.

#### Acceptance Criteria

1. THE Converter SHALL be implemented as a separate TypeScript module
2. THE Converter SHALL export a clear interface for HTML to markdown conversion
3. THE Converter SHALL use Cheerio for HTML parsing and DOM manipulation
4. THE Converter SHALL include TypeScript type definitions for all public interfaces
5. THE Converter SHALL follow the existing project code style and patterns

### Requirement 7

**User Story:** As an AI assistant, I want the JSON response to include metadata about the converted content, so that I can provide context to users.

#### Acceptance Criteria

1. THE JSON Response SHALL include a `title` field extracted from the h1 or title tag
2. THE JSON Response SHALL include a `markdown` field containing the converted markdown content
3. THE JSON Response SHALL include a `code_examples` array containing structured code example objects
4. WHERE available, THE JSON Response SHALL include a `url` field with the source URL
5. THE JSON Response SHALL be serializable to valid JSON format

### Requirement 7.1

**User Story:** As an AI assistant, I want code examples to be structured with context, so that I can present them meaningfully to developers.

#### Acceptance Criteria

1. THE Code Example Object SHALL include a `title` field extracted from the nearest preceding heading or context
2. THE Code Example Object SHALL include a `description` field with a short summary of the code's purpose
3. THE Code Example Object SHALL include a `code` field containing the code block formatted as markdown with language identifier
4. WHEN extracting description, THE Converter SHALL use text from the paragraph immediately before the code block
5. WHERE no preceding heading exists, THE Converter SHALL use "Code Example" as the default title

### Requirement 8

**User Story:** As an AI assistant, I want all relative URLs in the markdown to be converted to absolute URLs, so that links remain functional when content is viewed outside the original site context.

#### Acceptance Criteria

1. WHEN THE Converter encounters a relative link in the HTML, THE Converter SHALL resolve it to an absolute URL using the source page URL
2. THE Converter SHALL convert relative URLs in anchor tags `<a href="...">` to absolute URLs
3. THE Converter SHALL convert relative URLs in image tags `<img src="...">` to absolute URLs
4. THE Converter SHALL preserve absolute URLs without modification
5. THE Converter SHALL handle both path-relative URLs (starting with `/`) and document-relative URLs (starting with `./` or `../`)

### Requirement 9

**User Story:** As an AI assistant, I want MkDocs tab views to be unpacked into sequential markdown sections, so that all content variations are visible and accessible.

#### Acceptance Criteria

1. WHEN THE Converter encounters a `.tabbed-set` element, THE Converter SHALL extract all tab panels
2. THE Converter SHALL create a separate markdown section for each tab panel
3. THE Converter SHALL use the tab label as the section heading
4. THE Converter SHALL preserve the order of tabs as they appear in the HTML
5. THE Converter SHALL convert each tab's content to markdown independently

### Requirement 10

**User Story:** As an AI assistant, I want Mermaid diagrams to be preserved in the markdown output, so that visual documentation elements remain intact and can be rendered.

#### Acceptance Criteria

1. WHEN THE Converter encounters a Mermaid diagram element, THE Converter SHALL extract the diagram source code
2. THE Converter SHALL format the diagram as a fenced code block with `mermaid` language identifier
3. THE Converter SHALL detect Mermaid diagrams in `<pre class="mermaid">` elements
4. THE Converter SHALL detect Mermaid diagrams in `<code class="language-mermaid">` elements
5. THE Converter SHALL preserve the diagram syntax exactly as it appears in the source

### Requirement 11

**User Story:** As an AI assistant, I want images to be properly converted to markdown format with resolved URLs, so that visual content is accessible and functional.

#### Acceptance Criteria

1. WHEN THE Converter encounters an `<img>` element, THE Converter SHALL convert it to markdown image syntax `![alt](url)`
2. THE Converter SHALL extract the alt text from the `alt` attribute
3. THE Converter SHALL resolve relative image URLs to absolute URLs using the source page URL
4. WHERE an image has a title attribute, THE Converter SHALL include it in the markdown format `![alt](url "title")`
5. THE Converter SHALL preserve image references in the markdown output

### Requirement 12

**User Story:** As an AI assistant, I want inline SVG elements to be preserved or converted appropriately, so that vector graphics and icons are not lost.

#### Acceptance Criteria

1. WHEN THE Converter encounters an inline `<svg>` element, THE Converter SHALL determine if it is decorative or content
2. WHERE an SVG is decorative (icons, UI elements), THE Converter SHALL remove it from the output
3. WHERE an SVG is content (diagrams, illustrations), THE Converter SHALL preserve it as an HTML block in the markdown
4. THE Converter SHALL identify decorative SVGs by checking for classes like `.md-icon`, `.icon`, or parent elements like `.md-header`
5. THE Converter SHALL preserve SVG elements that are direct children of content containers
