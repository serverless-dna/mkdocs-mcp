# Implementation Plan

- [x] 1. Create core MkDocsMarkdownConverter module
  - Create new file `src/services/markdown/mkdocsMarkdownConverter.ts`
  - Define TypeScript interfaces for `ConversionResult` and `CodeExample`
  - Implement basic class structure with constructor
  - Add main `convert(html: string, sourceUrl: string): ConversionResult` method
  - _Requirements: 1.1, 6.1, 6.2, 6.4_

- [x] 2. Implement HTML parsing and content extraction
- [x] 2.1 Set up Cheerio HTML parsing
  - Import and configure Cheerio for HTML parsing
  - Implement HTML loading in convert method
  - Add error handling for malformed HTML
  - _Requirements: 3.1, 6.3_

- [x] 2.2 Implement noise element removal
  - Create `removeNoiseElements` private method
  - Define NOISE_SELECTORS constant array
  - Remove navigation, header, footer, and UI elements
  - Preserve content elements
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 2.3 Implement main content extraction
  - Create `extractMainContent` private method
  - Target `.md-content[data-md-component="content"]` container
  - Implement fallback to body content if container not found
  - _Requirements: 3.1, 3.5_

- [x] 2.4 Implement title extraction
  - Create `extractTitle` private method
  - Extract from h1 element first
  - Fall back to title tag if h1 not found
  - Return "Untitled" as final fallback
  - _Requirements: 7.1_

- [x] 3. Implement tab view processing
- [x] 3.1 Create tab view processor
  - Create `processTabbedContent` private method
  - Detect `.tabbed-set` elements
  - Extract tab labels from label elements
  - Extract tab content from `.tabbed-content` elements
  - _Requirements: 9.1, 9.2_

- [x] 3.2 Convert tabs to sequential sections
  - Create markdown sections for each tab
  - Use tab label as section heading (h3)
  - Preserve tab order
  - Replace tabbed-set with sequential markdown
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 4. Implement SVG processing
- [x] 4.1 Create SVG processor
  - Create `processSVGs` private method
  - Create `isDecorativeSVG` helper method
  - Check for decorative indicators (classes, parent elements)
  - _Requirements: 12.2, 12.4_

- [x] 4.2 Handle decorative vs content SVGs
  - Remove decorative SVGs (icons, UI elements)
  - Preserve content SVGs (diagrams, illustrations)
  - Check parent containers for context
  - _Requirements: 12.1, 12.3, 12.5_

- [x] 5. Implement code block extraction with Mermaid support
- [x] 5.1 Create code block extractor
  - Create `extractCodeExamples` private method
  - Define selectors for code blocks
  - Create `detectLanguage` helper method
  - Extract language from class attributes
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.2 Implement Mermaid diagram extraction
  - Detect `<pre class="mermaid">` elements
  - Detect `<code class="language-mermaid">` elements
  - Extract diagram source code
  - Format as mermaid code block
  - Mark as processed to avoid duplication
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5.3 Implement context extraction for code blocks
  - Create `findNearestHeading` helper method
  - Create `findPrecedingParagraph` helper method
  - Extract title from nearest h2/h3/h4 heading
  - Extract description from preceding paragraph
  - Use defaults when context not found
  - _Requirements: 7.1.1, 7.1.2, 7.1.4, 7.1.5_

- [x] 5.4 Format code examples
  - Format code as fenced markdown blocks
  - Include language identifier
  - Create CodeExample objects with title, description, code
  - _Requirements: 2.4, 7.1.3_

- [x] 6. Implement URL resolution
- [x] 6.1 Create URL resolver for links
  - Create `resolveUrls` private method
  - Create `isAbsoluteUrl` helper method
  - Process all `<a href>` elements
  - Resolve relative URLs to absolute using source URL
  - Handle path-relative and document-relative URLs
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 6.2 Create URL resolver for images
  - Process all `<img src>` elements
  - Resolve relative image URLs to absolute
  - Preserve absolute URLs unchanged
  - _Requirements: 8.3, 11.3_

- [x] 7. Implement markdown generation
- [x] 7.1 Create markdown converter
  - Create `convertToMarkdown` private method
  - Implement heading conversion (h1-h6 to # syntax)
  - Remove `.headerlink` elements from headings
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.2 Implement text formatting conversion
  - Convert emphasis (`<em>`, `<i>`) to `*text*`
  - Convert strong (`<strong>`, `<b>`) to `**text**`
  - Convert inline code (`<code>`) to backticks
  - Convert links to markdown format `[text](url)`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7.3 Implement list conversion
  - Convert unordered lists to markdown bullets
  - Convert ordered lists to numbered lists
  - Preserve nested list structures
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7.4 Implement image conversion
  - Convert `<img>` elements to markdown syntax
  - Extract alt text from alt attribute
  - Extract title from title attribute
  - Format as `![alt](url)` or `![alt](url "title")`
  - _Requirements: 11.1, 11.2, 11.4, 11.5_

- [x] 8. Build JSON response structure
- [x] 8.1 Assemble ConversionResult object
  - Populate title field
  - Populate markdown field
  - Populate code_examples array
  - Populate url field if available
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4_

- [x] 8.2 Ensure JSON serializability
  - Verify all fields are JSON-serializable
  - Test JSON.stringify on result
  - _Requirements: 1.3, 7.5_

- [x] 9. Integrate with MCP tool
- [x] 9.1 Update fetchMkDoc tool
  - Import MkDocsMarkdownConverter
  - Instantiate converter
  - Pass HTML and URL to converter
  - Receive ConversionResult
  - _Requirements: 1.1_

- [x] 9.2 Update response builder
  - Modify buildResponse to handle ConversionResult
  - Return JSON object instead of plain text
  - Ensure proper JSON formatting
  - _Requirements: 1.1, 1.4_

- [x] 9.3 Update TypeScript types
  - Export ConversionResult interface
  - Export CodeExample interface
  - Add types to tool response
  - _Requirements: 1.3, 6.4_

- [x] 10. Write comprehensive tests
- [x] 10.1 Create test file structure
  - Create `src/services/markdown/mkdocsMarkdownConverter.spec.ts`
  - Set up test fixtures using `docs/mkdocs-site-example.html`
  - Import necessary testing utilities

- [x] 10.2 Write HTML parsing tests
  - Test with valid MkDocs Material HTML
  - Test with minimal HTML structure
  - Test with malformed HTML
  - Test error handling

- [x] 10.3 Write content extraction tests
  - Test main content extraction from `.md-content`
  - Test fallback to body content
  - Test title extraction from h1 and title tag
  - Test noise element removal

- [x] 10.4 Write tab view tests
  - Test tab detection and extraction
  - Test tab label extraction
  - Test sequential section creation
  - Test content conversion within tabs

- [x] 10.5 Write SVG processing tests
  - Test decorative SVG removal
  - Test content SVG preservation
  - Test SVG detection logic
  - Test various container contexts

- [x] 10.6 Write code block extraction tests
  - Test language detection from class attributes
  - Test context extraction (title, description)
  - Test multiple code blocks
  - Test code blocks without context
  - Test Mermaid diagram extraction
  - Test code formatting

- [x] 10.7 Write URL resolution tests
  - Test path-relative URLs
  - Test document-relative URLs
  - Test absolute URLs remain unchanged
  - Test with various base URLs
  - Test image URL resolution

- [x] 10.8 Write markdown conversion tests
  - Test heading conversion
  - Test list conversion
  - Test link conversion
  - Test image conversion
  - Test emphasis and strong conversion
  - Test nested structures

- [x] 10.9 Write integration tests
  - Test end-to-end conversion with example HTML
  - Verify JSON structure matches interface
  - Verify all code examples extracted
  - Verify URLs resolved
  - Test MCP tool integration

- [ ] 11. Update documentation and cleanup
- [x] 11.1 Add JSDoc comments
  - Document all public methods
  - Document interfaces
  - Add usage examples

- [x] 11.2 Update project README
  - Document new converter
  - Add usage examples
  - Update API documentation

- [x] 11.3 Remove deprecated converters
  - Mark old converters as deprecated
  - Update ConverterFactory if needed
  - Plan migration path for existing users
