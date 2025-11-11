# Design Document: MkDocs Markitdown Converter

## Overview

This design implements a TypeScript-based HTML to Markdown converter specifically optimized for MkDocs Material sites, inspired by Microsoft's Markitdown library. The converter will parse MkDocs Material HTML structure, extract clean content, properly identify and label code examples with context, resolve relative URLs to absolute URLs, and return structured JSON API responses.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  MCP Tool       │
│  (fetchMkDoc)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fetch Service  │
│  (HTML fetch)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  MkDocsMarkdownConverter        │
│  ┌───────────────────────────┐  │
│  │ HTML Parsing (Cheerio)    │  │
│  ├───────────────────────────┤  │
│  │ Content Extraction        │  │
│  ├───────────────────────────┤  │
│  │ Tab View Processing       │  │
│  ├───────────────────────────┤  │
│  │ SVG Processing            │  │
│  ├───────────────────────────┤  │
│  │ Code Block Extraction     │  │
│  ├───────────────────────────┤  │
│  │ Image & URL Resolution    │  │
│  ├───────────────────────────┤  │
│  │ Markdown Generation       │  │
│  └───────────────────────────┘  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│  JSON Response  │
│  Builder        │
└─────────────────┘
```

### Component Interaction Flow

1. **MCP Tool** receives request with URL
2. **Fetch Service** retrieves HTML content
3. **MkDocsMarkdownConverter** processes HTML:
   - Parses HTML with Cheerio
   - Removes noise elements (nav, header, footer, etc.)
   - Extracts main content from `.md-content` container
   - Processes tab views into sequential sections
   - Processes SVG elements (remove decorative, preserve content)
   - Identifies and extracts code blocks with context (including Mermaid)
   - Resolves all relative URLs to absolute URLs (links and images)
   - Converts HTML to clean markdown
4. **JSON Response Builder** structures the output
5. **MCP Tool** returns JSON response to client

## Components and Interfaces

### 1. MkDocsMarkdownConverter

**Purpose:** Core converter class that transforms MkDocs Material HTML to structured markdown

**Interface:**
```typescript
interface ConversionResult {
  title: string;
  markdown: string;
  code_examples: CodeExample[];
  url?: string;
}

interface CodeExample {
  title: string;
  description: string;
  code: string;  // Markdown formatted code block
}

class MkDocsMarkdownConverter {
  convert(html: string, sourceUrl: string): ConversionResult;
  private extractTitle($: CheerioAPI): string;
  private removeNoiseElements($: CheerioAPI): void;
  private extractMainContent($: CheerioAPI): Cheerio<Element>;
  private extractCodeExamples($: CheerioAPI, sourceUrl: string): CodeExample[];
  private resol CheerioAPI, sourceUrl: string): void;
  private convertToMarkdown($: CheerioAPI, content: Cheerio<Element>): string;
}
```

### 2. Code Block Extractor

**Purpose:** Identifies code blocks and extracts them with surrounding context

**Logic:**
- Searches for `<pre><code>`, `.highlight code`, `.codehilite code` elements
- Extracts language from class attributes (e.g., `language-python`, `lang-typescript`)
- Finds nearest preceding heading (h2, h3, h4) for title
- Extracts preceding paragraph for description
- Formats code as fenced markdown block with language identifier
- **Special handling for Mermaid:** Preserves `<pre class="mermaid">` and `<code class="language-mermaid">` as mermaid code blocks

**Algorithm:**
```typescript
function extractCodeExamples($: CheerioAPI, sourceUrl: string): CodeExample[] {
  const examples: CodeExample[] = [];
  
  // Handle Mermaid diagrams first (special case)
  $('pre.mermaid, code.language-mermaid').each((_, element) => {
    const $element = $(element);
    const diagram = $element.text().trim();
    
    if (!diagram) return;
    
    const $container = $element.closest('pre, div');
    const title = findNearestHeading($container) || 'Diagram';
    const description = findPrecedingParagraph($container) || 'Mermaid diagram';
    
    examples.push({
      title,
      description,
      code: `\`\`\`mermaid\n${diagram}\n\`\`\``
    });
    
    // Mark as processed to avoid duplicate extraction
    $element.attr('data-processed', 'true');
  });
  
  // Handle regular code blocks
  $('pre code, .highlight code, .codehilite code').each((_, element) => {
    const $code = $(element);
    
    // Skip if already processed (e.g., mermaid)
    if ($code.attr('data-processed')) return;
    
    const code = $code.text().trim();
    if (!code) return;
    
    // Extract language
    const language = detectLanguage($code);
    
    // Find context
    const $pre = $code.closest('pre');
    const title = findNearestHeading($pre);
    const description = findPrecedingParagraph($pre);
    
    // Format as markdown code block
    const formattedCode = `\`\`\`${language}\n${code}\n\`\`\``;
    
    examples.push({
      title,
      description,
      code: formattedCode
    });
  });
  
  return examples;
}
```

### 3. URL Resolver

**Purpose:** Converts all relative URLs to absolute URLs

**Logic:**
- Uses Node.js `URL` class for URL resolution
- Handles path-relative URLs (`/path/to/page`)
- Handles document-relative URLs (`../page`, `./page`)
- Processes both `<a href>` and `<img src>` attributes
- Preserves absolute URLs unchanged

**Algorithm:**
```typescript
function resolveUrls($: CheerioAPI, sourceUrl: string): void {
  const baseUrl = new URL(sourceUrl);
  
  // Resolve links
  $('a[href]').each((_, element) => {
    const $link = $(element);
    const href = $link.attr('href');
    
    if (href && !isAbsoluteUrl(href)) {
      const absoluteUrl = new URL(href, baseUrl).href;
      $link.attr('href', absoluteUrl);
    }
  });
  
  // Resolve images
  $('img[src]').each((_, element) => {
    const $img = $(element);
    const src = $img.attr('src');
    
    if (src && !isAbsoluteUrl(src)) {
      const absoluteUrl = new URL(src, baseUrl).href;
      $img.attr('src', absoluteUrl);
    }
  });
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
```

### 4. Markdown Generator

**Purpose:** Converts cleaned HTML to markdown format

**Conversion Rules:**
- **Headings:** `<h1>` → `# Heading`, `<h2>` → `## Heading`, etc.
- **Paragraphs:** `<p>` → text with blank line after
- **Links:** `<a href="url">text</a>` → `[text](url)`
- **Images:** `<img src="url" alt="text">` → `![text](url)`
- **Images with title:** `<img src="url" alt="text" title="title">` → `![text](url "title")`
- **Emphasis:** `<em>` or `<i>` → `*text*`
- **Strong:** `<strong>` or `<b>` → `**text**`
- **Lists:** `<ul><li>` → `* item` or `- item`
- **Ordered Lists:** `<ol><li>` → `1. item`
- **Code:** `<code>` → `` `code` ``
- **Code Blocks:** Already handled by Code Block Extractor
- **Content SVGs:** Preserved as HTML blocks in markdown
- **Decorative SVGs:** Removed during noise cleanup

**Implementation Approach:**
Use a simple recursive HTML walker that converts elements to markdown syntax. For complex conversions, we can leverage existing libraries like `turndown` or implement custom logic.

**Image Handling:**
```typescript
function convertImages($: CheerioAPI, sourceUrl: string): void {
  $('img').each((_, element) => {
    const $img = $(element);
    const src = $img.attr('src');
    const alt = $img.attr('alt') || '';
    const title = $img.attr('title');
    
    if (!src) return;
    
    // Resolve relative URLs
    const absoluteSrc = isAbsoluteUrl(src) ? src : new URL(src, sourceUrl).href;
    
    // Create markdown image syntax
    let markdown = `![${alt}](${absoluteSrc}`;
    if (title) {
      markdown += ` "${title}"`;
    }
    markdown += ')';
    
    // Replace img element with markdown text node
    $img.replaceWith(markdown);
  });
}
```

**SVG Handling:**
```typescript
function processSVGs($: CheerioAPI): void {
  $('svg').each((_, element) => {
    const $svg = $(element);
    
    // Check if SVG is decorative
    if (isDecorativeSVG($svg)) {
      $svg.remove();
      return;
    }
    
    // Preserve content SVGs as HTML
    // Markdown supports inline HTML, so we keep the SVG element
    // No action needed - it will be preserved in the HTML-to-markdown conversion
  });
}

function isDecorativeSVG($svg: Cheerio<Element>): boolean {
  // Check for decorative indicators
  const classes = $svg.attr('class') || '';
  const parent = $svg.parent();
  const parentClasses = parent.attr('class') || '';
  
  return (
    classes.includes('md-icon') ||
    classes.includes('icon') ||
    parentClasses.includes('md-header') ||
    parentClasses.includes('md-nav') ||
    parentClasses.includes('md-footer') ||
    $svg.closest('.md-header, .md-nav, .md-footer').length > 0
  );
}
```

### 5. Tab View Handler

**Purpose:** Unpacks MkDocs Material tab views into sequential markdown sections

**Tab View Structure:**
MkDocs Material uses tabbed content with structure like:
```html
<div class="tabbed-set">
  <input type="radio" id="tab-1" name="tabs">
  <label for="tab-1">Python</label>
  <div class="tabbed-content">
    <!-- Python content -->
  </div>
  
  <input type="radio" id="tab-2" name="tabs">
  <label for="tab-2">TypeScript</label>
  <div class="tabbed-content">
    <!-- TypeScript content -->
  </div>
</div>
```

**Conversion Strategy:**
```typescript
function processTabbedContent($: CheerioAPI): void {
  $('.tabbed-set').each((_, tabSet) => {
    const $tabSet = $(tabSet);
    const tabs: Array<{label: string, content: Cheerio<Element>}> = [];
    
    // Extract all tabs
    $tabSet.find('input[type="radio"]').each((_, input) => {
      const $input = $(input);
      const id = $input.attr('id');
      const $label = $tabSet.find(`label[for="${id}"]`);
      const $content = $label.next('.tabbed-content');
      
      tabs.push({
        label: $label.text().trim(),
        content: $content
      });
    });
    
    // Replace tabbed-set with sequential sections
    const sections = tabs.map(tab => {
      return `
### ${tab.label}

${convertToMarkdown($, tab.content)}
`;
    }).join('\n\n');
    
    $tabSet.replaceWith(sections);
  });
}
```

**Output Format:**
```markdown
### Python

```python
# Python code example
```

### TypeScript

```typescript
// TypeScript code example
```
```

### 6. Noise Element Removal

**Purpose:** Removes MkDocs Material UI elements that don't belong in content

**Elements to Remove:**
```typescript
const NOISE_SELECTORS = [
  'nav',
  '.md-nav',
  '.md-sidebar',
  '.md-header',
  '.md-footer',
  '.md-source',
  '.md-search',
  '.md-tabs',  // Top navigation tabs, not content tabs
  '.headerlink',
  '.md-announce',
  'script',
  'style',
  '.md-dialog',
  '.md-overlay',
  'input[type="radio"][name^="__tabbed"]'  // Tab control inputs
];

function removeNoiseElements($: CheerioAPI): void {
  $(NOISE_SELECTORS.join(', ')).remove();
}
```

**Note:** `.tabbed-set` is NOT removed as it contains content. It's processed by the Tab View Handler.

## Data Models

### ConversionResult

```typescript
interface ConversionResult {
  /** Page title extracted from h1 or title tag */
  title: string;
  
  /** Full markdown content of the page */
  markdown: string;
  
  /** Array of code examples with context */
  code_examples: CodeExample[];
  
  /** Source URL of the page (optional) */
  url?: string;
}
```

### CodeExample

```typescript
interface CodeExample {
  /** Title from nearest heading or "Code Example" */
  title: string;
  
  /** Short description from preceding paragraph */
  description: string;
  
  /** Markdown formatted code block with language identifier */
  code: string;
}
```

## Error Handling

### HTML Parsing Errors
- **Issue:** Malformed HTML
- **Handling:** Cheerio is forgiving; log warning and continue
- **Fallback:** Return partial content with error note in markdown

### Missing Content Container
- **Issue:** `.md-content` not found
- **Handling:** Fall back to `<body>` content extraction
- **Logging:** Warn that expected structure not found

### URL Resolution Errors
- **Issue:** Invalid URL format
- **Handling:** Keep original relative URL, log warning
- **Impact:** Some links may not work, but conversion continues

### Code Block Extraction Errors
- **Issue:** Unable to determine language or context
- **Handling:** Use empty language identifier, generic title/description
- **Impact:** Code still included, just with less metadata

## Testing Strategy

### Unit Tests

1. **HTML Parsing Tests**
   - Test with valid MkDocs Material HTML
   - Test with minimal HTML structure
   - Test with malformed HTML

2. **Code Block Extraction Tests**
   - Test language detection from various class formats
   - Test context extraction (title, description)
   - Test with multiple code blocks
   - Test with code blocks without context

3. **URL Resolution Tests**
   - Test path-relative URLs (`/docs/page`)
   - Test document-relative URLs (`../page`, `./page`)
   - Test absolute URLs (should remain unchanged)
   - Test with various base URLs

4. **Markdown Conversion Tests**
   - Test heading conversion
   - Test list conversion (ordered and unordered)
   - Test link conversion
   - Test emphasis and strong conversion
   - Test nested structures

5. **Noise Removal Tests**
   - Test removal of navigation elements
   - Test removal of UI elements
   - Test that content elements are preserved

6. **Image Conversion Tests**
   - Test image conversion to markdown syntax
   - Test alt text extraction
   - Test title attribute handling
   - Test relative image URL resolution
   - Test absolute image URLs remain unchanged

7. **SVG Processing Tests**
   - Test decorative SVG removal (icons in headers/nav)
   - Test content SVG preservation (diagrams in content)
   - Test SVG detection logic
   - Test SVG in various container contexts

8. **Mermaid Diagram Tests**
   - Test mermaid diagram extraction from `<pre class="mermaid">`
   - Test mermaid diagram extraction from `<code class="language-mermaid">`
   - Test diagram syntax preservation
   - Test mermaid formatting as code block

9. **Tab View Tests**
   - Test tab extraction and unpacking
   - Test tab label extraction
   - Test sequential section creation
   - Test content conversion within tabs

### Integration Tests

1. **End-to-End Conversion**
   - Test with real MkDocs Material HTML (use example file)
   - Verify JSON structure matches interface
   - Verify all code examples are extracted
   - Verify URLs are resolved

2. **MCP Tool Integration**
   - Test fetchMkDoc tool returns proper JSON
   - Test error responses are properly formatted
   - Test with various documentation URLs

### Test Data

Use `docs/mkdocs-site-example.html` as primary test fixture:
- Contains real MkDocs Material structure
- Has multiple code examples
- Has various heading levels
- Has lists, links, and formatted text

## Implementation Plan

### Phase 1: Core Converter
1. Create `MkDocsMarkdownConverter` class
2. Implement HTML parsing with Cheerio
3. Implement noise element removal
4. Implement basic markdown conversion

### Phase 2: Code Block Extraction
1. Implement code block detection
2. Implement language extraction
3. Implement context extraction (title, description)
4. Format as markdown code blocks

### Phase 3: URL Resolution
1. Implement URL resolution logic
2. Handle different URL types
3. Update links and images

### Phase 4: Integration
1. Update `fetchMkDoc` tool to use new converter
2. Update response builder for JSON structure
3. Add TypeScript interfaces

### Phase 5: Testing
1. Write unit tests for each component
2. Write integration tests
3. Test with real documentation sites

## Dependencies

- **cheerio**: HTML parsing and DOM manipulation
- **@types/cheerio**: TypeScript types for Cheerio
- Existing project dependencies (no new external dependencies needed)

## Migration Strategy

### Backward Compatibility

The new converter will replace the existing converters:
- Remove or deprecate `NodeHtmlMarkdownConverter`
- Remove or deprecate `AIOptimizedMarkdownConverter`
- Keep `ConverterFactory` but update to use new converter

### Rollout Plan

1. Implement new converter alongside existing ones
2. Add feature flag or configuration to switch converters
3. Test thoroughly with various documentation sites
4. Switch default converter to new implementation
5. Remove old converters after validation period

## Performance Considerations

### Memory Usage
- Cheerio loads entire HTML into memory
- For large pages (>1MB), consider streaming or chunking
- Current implementation should handle typical documentation pages (<500KB)

### Processing Time
- HTML parsing: O(n) where n is HTML size
- Code block extraction: O(m) where m is number of code blocks
- URL resolution: O(l) where l is number of links
- Expected total time: <100ms for typical page

### Optimization Opportunities
- Cache compiled selectors
- Batch URL resolutions
- Lazy load code example extraction if not needed

## Security Considerations

### XSS Prevention
- All HTML is parsed, not executed
- Output is markdown text, not HTML
- No user input is directly embedded in output

### URL Validation
- Validate URLs before resolution
- Reject javascript: and data: URLs
- Only allow http: and https: protocols

### Resource Limits
- Limit HTML input size (e.g., 10MB max)
- Limit number of code examples extracted (e.g., 100 max)
- Timeout for conversion process (e.g., 30 seconds)

## Future Enhancements

1. **Table Support**: Convert HTML tables to markdown tables
2. **Image Optimization**: Download and embed images as base64
3. **Mermaid Diagram Support**: Preserve mermaid diagrams in markdown
4. **Admonition Support**: Convert MkDocs admonitions to markdown equivalents
5. **Multi-language Support**: Handle internationalized documentation
6. **Caching**: Cache converted results to improve performance

