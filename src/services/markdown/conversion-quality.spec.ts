import { NodeHtmlMarkdownConverter } from './nodeHtmlMarkdownConverter';

describe('[Markdown Quality Assessment]', () => {
  let converter: NodeHtmlMarkdownConverter;

  beforeEach(() => {
    converter = new NodeHtmlMarkdownConverter();
  });

  describe('Complex HTML structures', () => {
    it('should handle Material for MkDocs admonitions', () => {
      const html = `
        <div class="admonition note">
          <p class="admonition-title">Note</p>
          <p>This is a note admonition with <strong>bold text</strong> and <code>inline code</code>.</p>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Admonition result:', result);
      
      // Should preserve structure and formatting
      expect(result).toContain('Note');
      expect(result).toContain('**bold text**');
      expect(result).toContain('`inline code`');
    });

    it('should handle code blocks with syntax highlighting', () => {
      const html = `
        <div class="highlight">
          <pre><code class="language-python">
def hello_world():
    print("Hello, World!")
    return True
          </code></pre>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Code block result:', result);
      
      expect(result).toContain('```python');
      expect(result).toContain('def hello_world()');
      expect(result).toContain('print("Hello, World!")');
    });

    it('should handle tables', () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>name</code></td>
              <td>string</td>
              <td>The logger name</td>
            </tr>
            <tr>
              <td><code>level</code></td>
              <td>LogLevel</td>
              <td>The log level</td>
            </tr>
          </tbody>
        </table>
      `;
      
      const result = converter.convert(html);
      console.log('Table result:', result);
      
      // Should create markdown table
      expect(result).toContain('Parameter');
      expect(result).toContain('Type');
      expect(result).toContain('Description');
    });

    it('should handle nested lists', () => {
      const html = `
        <ul>
          <li>First level item
            <ul>
              <li>Second level item</li>
              <li>Another second level
                <ul>
                  <li>Third level item</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>Another first level item</li>
        </ul>
      `;
      
      const result = converter.convert(html);
      console.log('Nested list result:', result);
      
      expect(result).toContain('* First level item');
      expect(result).toContain('* Another first level item');
    });

    it('should handle links and images', () => {
      const html = `
        <p>Check out the <a href="https://example.com">documentation</a> for more info.</p>
        <p><img src="/images/diagram.png" alt="Architecture diagram" /></p>
      `;
      
      const result = converter.convert(html);
      console.log('Links and images result:', result);
      
      expect(result).toContain('[documentation](https://example.com)');
      expect(result).toContain('![Architecture diagram](/images/diagram.png)');
    });

    it('should handle Material for MkDocs content tabs', () => {
      const html = `
        <div class="tabbed-set tabbed-alternate" data-tabs="1:2">
          <input checked="checked" id="__tabbed_1_1" name="__tabbed_1" type="radio">
          <label for="__tabbed_1_1">Python</label>
          <div class="tabbed-content">
            <pre><code class="language-python">print("Hello from Python")</code></pre>
          </div>
          <input id="__tabbed_1_2" name="__tabbed_1" type="radio">
          <label for="__tabbed_1_2">JavaScript</label>
          <div class="tabbed-content">
            <pre><code class="language-javascript">console.log("Hello from JS");</code></pre>
          </div>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Content tabs result:', result);
      
      // Should preserve code content even if tabs structure is lost
      expect(result).toContain('print("Hello from Python")');
      expect(result).toContain('console.log("Hello from JS")');
    });

    it('should handle real mkdocs-material page structure', () => {
      const html = `
        <div class="md-content" data-md-component="content">
          <h1>Logger Configuration</h1>
          <p>The Logger utility provides structured logging capabilities.</p>
          
          <h2>Basic Usage</h2>
          <p>Import and configure the logger:</p>
          
          <div class="highlight">
            <pre><code class="language-python">
from aws_lambda_powertools import Logger

logger = Logger()
logger.info("Hello World")
            </code></pre>
          </div>
          
          <div class="admonition warning">
            <p class="admonition-title">Warning</p>
            <p>Make sure to set the <code>LOG_LEVEL</code> environment variable.</p>
          </div>
          
          <h3>Parameters</h3>
          <table>
            <thead>
              <tr><th>Parameter</th><th>Type</th><th>Required</th></tr>
            </thead>
            <tbody>
              <tr><td>service</td><td>str</td><td>No</td></tr>
              <tr><td>level</td><td>str</td><td>No</td></tr>
            </tbody>
          </table>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Real page structure result:', result);
      
      // Should maintain document structure
      expect(result).toContain('# Logger Configuration');
      expect(result).toContain('## Basic Usage');
      expect(result).toContain('### Parameters');
      expect(result).toContain('```python');
      expect(result).toContain('from aws_lambda_powertools import Logger');
    });
  });

  describe('Quality issues to identify', () => {
    it('should show how navigation elements are handled', () => {
      const html = `
        <nav class="md-nav">
          <ul class="md-nav__list">
            <li class="md-nav__item"><a href="/getting-started/">Getting Started</a></li>
            <li class="md-nav__item"><a href="/api/">API Reference</a></li>
          </ul>
        </nav>
        <div class="md-content">
          <h1>Main Content</h1>
          <p>This is the actual content.</p>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Navigation handling result:', result);
      
      // Should ideally exclude navigation from content
    });

    it('should show how Material UI elements are converted', () => {
      const html = `
        <div class="md-typeset">
          <div class="md-clipboard md-clipboard--inline">
            <button class="md-clipboard__button" title="Copy to clipboard">
              <code>pip install aws-lambda-powertools</code>
            </button>
          </div>
        </div>
      `;
      
      const result = converter.convert(html);
      console.log('Material UI elements result:', result);
      
      // Should extract the actual command, not the UI elements
      expect(result).toContain('pip install aws-lambda-powertools');
    });
  });
});
