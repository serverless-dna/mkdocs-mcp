import { AIOptimizedMarkdownConverter } from './aiOptimizedConverter';

describe('AIOptimizedMarkdownConverter', () => {
  let converter: AIOptimizedMarkdownConverter;

  beforeEach(() => {
    converter = new AIOptimizedMarkdownConverter();
  });

  describe('convertToAIOptimized', () => {
    it('should extract code blocks with language detection', () => {
      const html = `
        <div>
          <h1>API Reference</h1>
          <p>Here's how to use the logger:</p>
          <pre><code class="language-python">
from aws_lambda_powertools import Logger
logger = Logger()
logger.info("Hello World")
          </code></pre>
          <p>You can also use <code>logger.debug()</code> for debugging.</p>
        </div>
      `;

      const result = converter.convertToAIOptimized(html);

      expect(result.title).toBe('API Reference');
      expect(result.contentType).toBe('api');
      expect(result.codeExamples).toHaveLength(2);
      
      const pythonBlock = result.codeExamples.find(block => block.language === 'python');
      expect(pythonBlock).toBeDefined();
      expect(pythonBlock?.code).toContain('from aws_lambda_powertools');
      expect(pythonBlock?.isExample).toBe(true);
    });

    it('should detect use cases from headings', () => {
      const html = `
        <div>
          <h1>Logger Guide</h1>
          <h2>Use Case: Structured Logging</h2>
          <p>When you need structured logs for better observability.</p>
          <pre><code>logger.info("User login", extra={"user_id": 123})</code></pre>
          <h3>When to use debug level</h3>
          <p>Use debug level for development troubleshooting.</p>
        </div>
      `;

      const result = converter.convertToAIOptimized(html);

      expect(result.useCases).toHaveLength(2);
      expect(result.useCases[0].scenario).toBe('Use Case: Structured Logging');
      expect(result.useCases[0].solution).toContain('structured logs');
      expect(result.useCases[0].codeExample).toContain('logger.info');
    });

    it('should extract key points from admonitions', () => {
      const html = `
        <div>
          <h1>Important Notes</h1>
          <div class="admonition important">
            <p>You must initialize the logger before using it.</p>
          </div>
          <div class="note">
            <p>Debug logs are not shown in production by default.</p>
          </div>
          <ul>
            <li>Always use structured logging for better searchability</li>
            <li>Regular text that should not be included</li>
          </ul>
        </div>
      `;

      const result = converter.convertToAIOptimized(html);

      expect(result.keyPoints).toContain('You must initialize the logger before using it.');
      expect(result.keyPoints).toContain('Debug logs are not shown in production by default.');
      expect(result.keyPoints).toContain('Always use structured logging for better searchability');
    });

    it('should generate summary from key points and use cases', () => {
      const html = `
        <div>
          <h1>Logger Tutorial</h1>
          <div class="tip">
            <p>Use structured logging for better observability.</p>
          </div>
          <h2>Use Case: Error Tracking</h2>
          <p>Track errors with context information.</p>
        </div>
      `;

      const result = converter.convertToAIOptimized(html);

      expect(result.summary).toContain('Use structured logging');
      expect(result.summary).toContain('Error Tracking');
    });

    it('should remove noise elements', () => {
      const html = `
        <div>
          <nav class="md-nav">Navigation</nav>
          <div class="md-sidebar">Sidebar</div>
          <h1>Clean Content</h1>
          <p>This should remain.</p>
          <script>console.log('remove me');</script>
          <style>.hidden { display: none; }</style>
        </div>
      `;

      const result = converter.convertToAIOptimized(html);

      expect(result.markdown).not.toContain('Navigation');
      expect(result.markdown).not.toContain('Sidebar');
      expect(result.markdown).not.toContain('remove me');
      expect(result.markdown).toContain('Clean Content');
      expect(result.markdown).toContain('This should remain');
    });

    it('should detect content type correctly', () => {
      const apiHtml = '<div><h1>API Methods</h1><p>This function returns data</p></div>';
      const tutorialHtml = '<div><h1>Getting Started Tutorial</h1><p>Learn the basics</p></div>';
      const guideHtml = '<div><h1>How to Guide</h1><p>Step by step instructions</p></div>';

      expect(converter.convertToAIOptimized(apiHtml).contentType).toBe('api');
      expect(converter.convertToAIOptimized(tutorialHtml).contentType).toBe('tutorial');
      expect(converter.convertToAIOptimized(guideHtml).contentType).toBe('guide');
    });
  });

  describe('convert', () => {
    it('should return markdown string', () => {
      const html = '<div><h1>Test</h1><p>Content</p></div>';
      const result = converter.convert(html);

      expect(typeof result).toBe('string');
      expect(result).toContain('# Test');
      expect(result).toContain('Content');
    });
  });
});
