import * as cheerio from 'cheerio';

/**
 * Represents a code example extracted from documentation
 */
export interface CodeExample {
  /** Title from nearest heading or "Code Example" */
  title: string;
  
  /** Short description from preceding paragraph */
  description: string;
  
  /** Markdown formatted code block with language identifier */
  code: string;
}

/**
 * Result of HTML to Markdown conversion
 */
export interface ConversionResult {
  /** Page title extracted from h1 or title tag */
  title: string;
  
  /** Full markdown content of the page */
  markdown: string;
  
  /** Array of code examples with context */
  code_examples: CodeExample[];
  
  /** Source URL of the page (optional) */
  url?: string;
}

/**
 * Converts MkDocs Material HTML to structured markdown
 * Optimized for MkDocs Material theme structure
 */
export class MkDocsMarkdownConverter {
  /**
   * Convert HTML content to structured markdown
   * @param html The HTML content to convert
   * @param sourceUrl The source URL for resolving relative links
   * @returns Structured conversion result with markdown and metadata
   */
  convert(html: string, sourceUrl: string): ConversionResult {
    // Load HTML with Cheerio
    const $ = cheerio.load(html);
    
    // Extract title
    const title = this.extractTitle($);
    
    // Remove noise elements
    this.removeNoiseElements($);
    
    // Extract main content
    const content = this.extractMainContent($);
    
    // Process tab views
    this.processTabbedContent($);
    
    // Process SVGs
    this.processSVGs($);
    
    // Resolve URLs
    this.resolveUrls($, sourceUrl);
    
    // Extract code examples
    const code_examples = this.extractCodeExamples($, sourceUrl);
    
    // Convert to markdown
    const markdown = this.convertToMarkdown($, content);
    
    return {
      title,
      markdown,
      code_examples,
      url: sourceUrl
    };
  }

  /**
   * Extract page title from h1 or title tag
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // Try h1 first
    const h1 = $('h1').first().clone();
    // Remove headerlink elements
    h1.find('.headerlink').remove();
    const h1Text = h1.text().trim();
    if (h1Text) return h1Text;
    
    // Fall back to title tag
    const titleTag = $('title').text().trim();
    if (titleTag) return titleTag;
    
    // Final fallback
    return 'Untitled';
  }

  /**
   * Remove MkDocs Material UI elements that don't belong in content
   */
  private removeNoiseElements($: cheerio.CheerioAPI): void {
    const NOISE_SELECTORS = [
      'nav',
      '.md-nav',
      '.md-sidebar',
      '.md-header',
      '.md-footer',
      '.md-source',
      '.md-search',
      '.md-tabs',
      '.headerlink',
      '.md-announce',
      'script',
      'style',
      '.md-dialog',
      '.md-overlay',
      'input[type="radio"][name^="__tabbed"]'
    ];
    
    $(NOISE_SELECTORS.join(', ')).remove();
  }

  /**
   * Extract main content from MkDocs Material structure
   */
  private extractMainContent($: cheerio.CheerioAPI): cheerio.Cheerio<cheerio.Element> {
    // Try to find the main content container
    const mdContent = $('div.md-content[data-md-component="content"]');
    
    if (mdContent.length > 0) {
      return mdContent;
    }
    
    // Fall back to body
    return $('body');
  }

  /**
   * Process MkDocs Material tab views into sequential sections
   */
  private processTabbedContent($: cheerio.CheerioAPI): void {
    $('.tabbed-set').each((_, tabSet) => {
      const $tabSet = $(tabSet);
      const tabs: Array<{label: string, content: cheerio.Cheerio<cheerio.Element>}> = [];
      
      // Extract all tabs
      $tabSet.find('input[type="radio"]').each((_, input) => {
        const $input = $(input);
        const id = $input.attr('id');
        
        if (!id) return;
        
        const $label = $tabSet.find(`label[for="${id}"]`);
        const $content = $label.next('.tabbed-content');
        
        if ($label.length && $content.length) {
          tabs.push({
            label: $label.text().trim(),
            content: $content
          });
        }
      });
      
      // Create sequential sections
      const sections = tabs.map(tab => {
        const contentHtml = tab.content.html() || '';
        return `\n### ${tab.label}\n\n${contentHtml}\n`;
      }).join('\n');
      
      // Replace tabbed-set with sections
      $tabSet.replaceWith(sections);
    });
  }

  /**
   * Process SVG elements (remove decorative, preserve content)
   */
  private processSVGs($: cheerio.CheerioAPI): void {
    $('svg').each((_, element) => {
      const $svg = $(element);
      
      // Check if SVG is decorative
      if (this.isDecorativeSVG($svg)) {
        $svg.remove();
      }
      // Content SVGs are preserved as-is (markdown supports inline HTML)
    });
  }

  /**
   * Determine if an SVG is decorative (icon/UI) or content (diagram)
   */
  private isDecorativeSVG($svg: cheerio.Cheerio<cheerio.Element>): boolean {
    const classes = $svg.attr('class') || '';
    const parent = $svg.parent();
    const parentClasses = parent.attr('class') || '';
    
    // Check for decorative indicators
    return (
      classes.includes('md-icon') ||
      classes.includes('icon') ||
      parentClasses.includes('md-header') ||
      parentClasses.includes('md-nav') ||
      parentClasses.includes('md-footer') ||
      $svg.closest('.md-header, .md-nav, .md-footer, .md-sidebar').length > 0
    );
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrls($: cheerio.CheerioAPI, sourceUrl: string): void {
    const baseUrl = new URL(sourceUrl);
    
    // Resolve links
    $('a[href]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      
      if (href && !this.isAbsoluteUrl(href) && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          $link.attr('href', absoluteUrl);
        } catch {
          // Keep original if URL resolution fails
        }
      }
    });
    
    // Resolve images
    $('img[src]').each((_, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      
      if (src && !this.isAbsoluteUrl(src)) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          $img.attr('src', absoluteUrl);
        } catch {
          // Keep original if URL resolution fails
        }
      }
    });
  }

  /**
   * Check if a URL is absolute
   */
  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) || url.startsWith('data:');
  }

  /**
   * Extract code examples with context
   */
  private extractCodeExamples($: cheerio.CheerioAPI, _sourceUrl: string): CodeExample[] {
    const examples: CodeExample[] = [];
    
    // Handle Mermaid diagrams first (special case)
    $('pre.mermaid, code.language-mermaid').each((_, element) => {
      const $element = $(element);
      const diagram = $element.text().trim();
      
      if (!diagram) return;
      
      const $container = $element.closest('pre, div');
      const title = this.findNearestHeading($container) || 'Diagram';
      const description = this.findPrecedingParagraph($container) || 'Mermaid diagram';
      
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
      const language = this.detectLanguage($code);
      
      // Find context
      const $pre = $code.closest('pre');
      const title = this.findNearestHeading($pre) || 'Code Example';
      const description = this.findPrecedingParagraph($pre) || '';
      
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

  /**
   * Detect programming language from code element classes
   */
  private detectLanguage($code: cheerio.Cheerio<cheerio.Element>): string {
    // Check class attributes for language hints
    const classes = $code.attr('class') || $code.parent().attr('class') || '';
    const langMatch = classes.match(/(?:language-|lang-|highlight-)(\w+)/);
    
    if (langMatch) return langMatch[1];
    
    // Detect by content patterns
    const code = $code.text();
    if (code.includes('import ') || code.includes('from ') || code.includes('def ')) return 'python';
    if (code.includes('const ') || code.includes('function ') || code.includes('=>')) return 'javascript';
    if (code.includes('aws ') || code.includes('npm ') || code.includes('$ ')) return 'bash';
    if (code.startsWith('{') && code.includes('"')) return 'json';
    
    return '';
  }

  /**
   * Find the nearest heading before an element
   */
  private findNearestHeading($element: cheerio.Cheerio<cheerio.Element>): string | null {
    let current = $element.prev();
    let attempts = 0;
    
    while (current.length && attempts < 10) {
      if (current.is('h1, h2, h3, h4, h5, h6')) {
        return current.text().trim();
      }
      current = current.prev();
      attempts++;
    }
    
    return null;
  }

  /**
   * Find the paragraph immediately before an element
   */
  private findPrecedingParagraph($element: cheerio.Cheerio<cheerio.Element>): string {
    const prev = $element.prev();
    
    if (prev.is('p')) {
      return prev.text().trim().substring(0, 200);
    }
    
    return '';
  }

  /**
   * Convert HTML to markdown
   */
  private convertToMarkdown($: cheerio.CheerioAPI, content: cheerio.Cheerio<cheerio.Element>): string {
    let markdown = '';
    
    // Process each child element
    content.children().each((_, element) => {
      markdown += this.convertElement($, $(element));
    });
    
    return markdown.trim();
  }

  /**
   * Convert a single HTML element to markdown
   */
  private convertElement($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>): string {
    const tagName = $element.prop('tagName')?.toLowerCase();
    
    if (!tagName) return '';
    
    switch (tagName) {
      case 'h1':
        return `# ${$element.text().trim()}\n\n`;
      case 'h2':
        return `## ${$element.text().trim()}\n\n`;
      case 'h3':
        return `### ${$element.text().trim()}\n\n`;
      case 'h4':
        return `#### ${$element.text().trim()}\n\n`;
      case 'h5':
        return `##### ${$element.text().trim()}\n\n`;
      case 'h6':
        return `###### ${$element.text().trim()}\n\n`;
      
      case 'p':
        return `${this.convertInlineElements($, $element)}\n\n`;
      
      case 'ul':
        return this.convertList($, $element, false) + '\n';
      
      case 'ol':
        return this.convertList($, $element, true) + '\n';
      
      case 'pre': {
        // Code blocks are handled separately in extractCodeExamples
        // But we still need to render them in the markdown
        const $code = $element.find('code').first();
        if ($code.length) {
          const language = this.detectLanguage($code);
          const code = $code.text().trim();
          return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        }
        return `\`\`\`\n${$element.text().trim()}\n\`\`\`\n\n`;
      }
      
      case 'blockquote': {
        const lines = $element.text().trim().split('\n');
        return lines.map(line => `> ${line}`).join('\n') + '\n\n';
      }
      
      case 'hr':
        return '---\n\n';
      
      case 'img': {
        const src = $element.attr('src') || '';
        const alt = $element.attr('alt') || '';
        const title = $element.attr('title');
        if (title) {
          return `![${alt}](${src} "${title}")\n\n`;
        }
        return `![${alt}](${src})\n\n`;
      }
      
      case 'a': {
        const href = $element.attr('href') || '';
        const text = $element.text().trim();
        return `[${text}](${href})`;
      }
      
      case 'div':
      case 'article':
      case 'section': {
        // Process children recursively
        let result = '';
        $element.children().each((_, child) => {
          result += this.convertElement($, $(child));
        });
        return result;
      }
      
      default:
        // For unknown elements, try to extract text content
        return this.convertInlineElements($, $element) + '\n\n';
    }
  }

  /**
   * Convert inline elements (em, strong, code, links) within a parent element
   */
  private convertInlineElements($: cheerio.CheerioAPI, $element: cheerio.Cheerio<cheerio.Element>): string {
    let result = '';
    
    $element.contents().each((_, node) => {
      if (node.type === 'text') {
        result += $(node).text();
      } else if (node.type === 'tag') {
        const $node = $(node);
        const tagName = $node.prop('tagName')?.toLowerCase();
        
        switch (tagName) {
          case 'strong':
          case 'b':
            result += `**${$node.text()}**`;
            break;
          case 'em':
          case 'i':
            result += `*${$node.text()}*`;
            break;
          case 'code':
            result += `\`${$node.text()}\``;
            break;
          case 'a': {
            const href = $node.attr('href') || '';
            const text = $node.text();
            result += `[${text}](${href})`;
            break;
          }
          case 'br':
            result += '\n';
            break;
          default:
            result += this.convertInlineElements($, $node);
        }
      }
    });
    
    return result;
  }

  /**
   * Convert list (ul or ol) to markdown
   */
  private convertList($: cheerio.CheerioAPI, $list: cheerio.Cheerio<cheerio.Element>, ordered: boolean): string {
    let result = '';
    let index = 1;
    
    $list.children('li').each((_, li) => {
      const $li = $(li);
      const marker = ordered ? `${index}. ` : '* ';
      const content = this.convertInlineElements($, $li).trim();
      
      result += `${marker}${content}\n`;
      
      // Handle nested lists
      $li.children('ul, ol').each((_, nestedList) => {
        const $nested = $(nestedList);
        const isOrdered = $nested.prop('tagName')?.toLowerCase() === 'ol';
        const nestedContent = this.convertList($, $nested, isOrdered);
        const indented = nestedContent.split('\n').map(line => '  ' + line).join('\n');
        result += indented;
      });
      
      if (ordered) index++;
    });
    
    return result;
  }
}
