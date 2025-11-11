import { readFileSync } from 'fs';
import { join } from 'path';

import { MkDocsMarkdownConverter } from '../../../src/services/markdown/mkdocsMarkdownConverter';

import { describe, expect,it } from '@jest/globals';

describe('MkDocsMarkdownConverter', () => {
  let converter: MkDocsMarkdownConverter;
  
  beforeEach(() => {
    converter = new MkDocsMarkdownConverter();
  });
  
  describe('Basic HTML parsing', () => {
    it('should parse valid HTML', () => {
      const html = '<html><body><h1>Test</h1><p>Content</p></body></html>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test');
      expect(result.markdown).toContain('Test');
    });
    
    it('should handle minimal HTML', () => {
      const html = '<h1>Title</h1>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.title).toBe('Title');
    });
    
    it('should handle malformed HTML gracefully', () => {
      const html = '<h1>Test<p>Missing closing tags';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result).toBeDefined();
      // Cheerio auto-closes tags, so title includes both elements
      expect(result.title).toContain('Test');
    });
  });
  
  describe('Title extraction', () => {
    it('should extract title from h1', () => {
      const html = '<h1>Page Title</h1><p>Content</p>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.title).toBe('Page Title');
    });
    
    it('should fall back to title tag', () => {
      const html = '<html><head><title>Document Title</title></head><body><p>Content</p></body></html>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.title).toBe('Document Title');
    });
    
    it('should use "Untitled" as final fallback', () => {
      const html = '<p>Content without title</p>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.title).toBe('Untitled');
    });
  });
  
  describe('Content extraction', () => {
    it('should extract from md-content container', () => {
      const html = `
        <div class="md-header">Header</div>
        <div class="md-content" data-md-component="content">
          <h1>Main Content</h1>
          <p>This is the content</p>
        </div>
        <div class="md-footer">Footer</div>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('Main Content');
      expect(result.markdown).toContain('This is the content');
      expect(result.markdown).not.toContain('Header');
      expect(result.markdown).not.toContain('Footer');
    });
  });
  
  describe('Code block extraction', () => {
    it('should extract code blocks with language', () => {
      const html = `
        <h2>Example</h2>
        <p>Here is some code:</p>
        <pre><code class="language-python">def hello():
    print("Hello")</code></pre>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.code_examples).toHaveLength(1);
      expect(result.code_examples[0].title).toBe('Example');
      expect(result.code_examples[0].description).toContain('Here is some code');
      expect(result.code_examples[0].code).toContain('```python');
      expect(result.code_examples[0].code).toContain('def hello()');
    });
    
    it('should handle code blocks without context', () => {
      const html = '<pre><code>some code</code></pre>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.code_examples).toHaveLength(1);
      expect(result.code_examples[0].title).toBe('Code Example');
    });
  });
  
  describe('Mermaid diagram extraction', () => {
    it('should extract mermaid diagrams', () => {
      const html = `
        <h2>Diagram</h2>
        <pre class="mermaid">graph TD
    A --> B</pre>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.code_examples).toHaveLength(1);
      expect(result.code_examples[0].code).toContain('```mermaid');
      expect(result.code_examples[0].code).toContain('graph TD');
    });
  });
  
  describe('URL resolution', () => {
    it('should resolve relative links', () => {
      const html = '<a href="/docs/page">Link</a>';
      const result = converter.convert(html, 'https://example.com/docs/');
      
      expect(result.markdown).toContain('https://example.com/docs/page');
    });
    
    it('should resolve relative images', () => {
      const html = '<img src="../images/pic.png" alt="Picture">';
      const result = converter.convert(html, 'https://example.com/docs/page/');
      
      expect(result.markdown).toContain('https://example.com/docs/images/pic.png');
    });
    
    it('should preserve absolute URLs', () => {
      const html = '<a href="https://other.com/page">Link</a>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('https://other.com/page');
    });
  });
  
  describe('Markdown conversion', () => {
    it('should convert headings', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('# H1');
      expect(result.markdown).toContain('## H2');
      expect(result.markdown).toContain('### H3');
    });
    
    it('should convert lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('* Item 1');
      expect(result.markdown).toContain('* Item 2');
    });
    
    it('should convert emphasis and strong', () => {
      const html = '<p>This is <em>italic</em> and <strong>bold</strong></p>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('*italic*');
      expect(result.markdown).toContain('**bold**');
    });
    
    it('should convert links', () => {
      const html = '<a href="https://example.com">Link text</a>';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('[Link text](https://example.com)');
    });
    
    it('should convert images', () => {
      const html = '<img src="image.png" alt="Alt text">';
      const result = converter.convert(html, 'https://example.com');
      
      expect(result.markdown).toContain('![Alt text](https://example.com/image.png)');
    });
  });
  
  describe('Integration test with real MkDocs HTML', () => {
    it('should convert the example MkDocs page', () => {
      const examplePath = join(__dirname, '../../fixtures/mkdocs-site-example.html');
      const html = readFileSync(examplePath, 'utf-8');
      
      const result = converter.convert(html, 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/graph/');
      
      // Verify basic structure
      expect(result.title).toBe('Graph Multi-Agent Pattern');
      expect(result.markdown).toBeTruthy();
      expect(result.code_examples.length).toBeGreaterThan(0);
      expect(result.url).toBe('https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/graph/');
      
      // Verify code examples have context
      const firstExample = result.code_examples[0];
      expect(firstExample.title).toBeTruthy();
      expect(firstExample.code).toContain('```');
      
      // Verify markdown contains key content
      expect(result.markdown).toContain('Graph Multi-Agent Pattern');
      expect(result.markdown).toContain('How Graphs Work');
    });
  });
  
  describe('Tabbed content processing', () => {
    it('should convert tabbed-set with multiple tabs', () => {
      const html = `
        <body>
          <div class="tabbed-set">
            <input type="radio" id="tab1" name="tabs">
            <label for="tab1">Python</label>
            <div class="tabbed-content"><p>Python code here</p></div>
            
            <input type="radio" id="tab2" name="tabs">
            <label for="tab2">JavaScript</label>
            <div class="tabbed-content"><p>JavaScript code here</p></div>
          </div>
        </body>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      // The tabbed content is processed and converted to markdown
      expect(result.markdown).toContain('Python');
      expect(result.markdown).toContain('Python code here');
      expect(result.markdown).toContain('JavaScript');
      expect(result.markdown).toContain('JavaScript code here');
    });

    it('should handle tabbed content with nested elements', () => {
      const html = `
        <body>
          <div class="tabbed-set">
            <input type="radio" id="tab1" name="tabs">
            <label for="tab1">Example</label>
            <div class="tabbed-content">
              <h4>Nested Heading</h4>
              <p>Nested paragraph</p>
              <ul><li>List item</li></ul>
            </div>
          </div>
        </body>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      // The tab label is inserted as a heading, and nested content is preserved
      expect(result.markdown).toContain('Nested Heading');
      expect(result.markdown).toContain('Nested paragraph');
      expect(result.markdown).toContain('List item');
    });

    it('should handle empty tabbed content', () => {
      const html = `
        <body>
          <div class="tabbed-set">
            <input type="radio" id="tab1" name="tabs">
            <label for="tab1">Empty Tab</label>
            <div class="tabbed-content"></div>
          </div>
        </body>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      // Should not crash with empty content
      expect(result).toBeDefined();
      expect(result.markdown).toBeDefined();
    });

    it('should handle tabbed-set without matching labels', () => {
      const html = `
        <body>
          <div class="tabbed-set">
            <input type="radio" id="tab1" name="tabs">
            <label for="nonexistent">Orphan Label</label>
          </div>
        </body>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      // Should not crash, just produce minimal output
      expect(result).toBeDefined();
      expect(result.markdown).toBeDefined();
    });

    it('should process multiple tabbed-sets independently', () => {
      const html = `
        <body>
          <div class="tabbed-set">
            <input type="radio" id="tab1" name="tabs1">
            <label for="tab1">Tab A</label>
            <div class="tabbed-content"><p>Content A</p></div>
          </div>
          <p>Between tabs</p>
          <div class="tabbed-set">
            <input type="radio" id="tab2" name="tabs2">
            <label for="tab2">Tab B</label>
            <div class="tabbed-content"><p>Content B</p></div>
          </div>
        </body>
      `;
      const result = converter.convert(html, 'https://example.com');
      
      // Content from both tabs should be present
      expect(result.markdown).toContain('Content A');
      expect(result.markdown).toContain('Between tabs');
      expect(result.markdown).toContain('Content B');
    });
  });

  describe('JSON serializability', () => {
    it('should produce JSON-serializable output', () => {
      const html = '<h1>Test</h1><p>Content</p>';
      const result = converter.convert(html, 'https://example.com');
      
      // Should not throw
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);
      
      expect(parsed.title).toBe(result.title);
      expect(parsed.markdown).toBe(result.markdown);
      expect(parsed.code_examples).toEqual(result.code_examples);
    });
  });
});
