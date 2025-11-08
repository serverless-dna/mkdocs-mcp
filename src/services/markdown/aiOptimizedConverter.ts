import * as cheerio from 'cheerio';
import { HtmlToMarkdownConverter } from './types';
import { ContentAnalyzer, ContentAnalysis } from './contentAnalyzer';
import { SummaryGenerator } from './summaryGenerator';

export interface CodeBlock {
  language: string;
  code: string;
  description?: string;
  isExample: boolean;
  context?: string;
}

export interface UseCase {
  scenario: string;
  solution: string;
  codeExample?: string;
}

export interface AIOptimizedContent {
  title: string;
  summary?: string;
  technicalSummary?: string;
  developerSummary?: string;
  contentType: 'tutorial' | 'api' | 'reference' | 'guide' | 'unknown';
  codeExamples: CodeBlock[];
  useCases: UseCase[];
  keyPoints: string[];
  relatedConcepts: string[];
  crossReferences: Array<{text: string; url: string; context: string}>;
  markdown: string;
}

/**
 * AI-optimized HTML to Markdown converter focused on developer content
 */
export class AIOptimizedMarkdownConverter implements HtmlToMarkdownConverter {
  private contentAnalyzer: ContentAnalyzer;
  private summaryGenerator: SummaryGenerator;
  
  constructor() {
    this.contentAnalyzer = new ContentAnalyzer();
    this.summaryGenerator = new SummaryGenerator();
  }
  
  convert(html: string): string {
    const optimized = this.convertToAIOptimized(html);
    return optimized.markdown;
  }
  
  convertToAIOptimized(html: string): AIOptimizedContent {
    const $ = cheerio.load(html);
    
    // Remove noise elements that confuse AI
    this.removeNoiseElements($);
    
    // Advanced content analysis
    const analysis = this.contentAnalyzer.analyze($);
    
    // Extract structured content
    const title = this.extractTitle($);
    const contentType = this.detectContentType($);
    const codeExamples = this.extractCodeBlocks($);
    
    // Generate multiple summary types
    const summary = this.summaryGenerator.generate(analysis);
    const technicalSummary = this.summaryGenerator.generateTechnicalSummary(analysis);
    const developerSummary = this.summaryGenerator.generateDeveloperSummary(analysis);
    
    // Generate optimized markdown
    const markdown = this.generateOptimizedMarkdown($, {
      title,
      contentType,
      codeExamples,
      useCases: analysis.useCases,
      keyPoints: analysis.keyPoints,
      relatedConcepts: analysis.relatedConcepts,
      crossReferences: analysis.crossReferences
    });
    
    return {
      title,
      contentType,
      codeExamples,
      useCases: analysis.useCases,
      keyPoints: analysis.keyPoints,
      relatedConcepts: analysis.relatedConcepts,
      crossReferences: analysis.crossReferences,
      markdown,
      summary,
      technicalSummary,
      developerSummary
    };
  }
  
  private removeNoiseElements($: cheerio.CheerioAPI): void {
    // Remove elements that don't help AI understanding
    $(
      'nav, .md-nav, .md-sidebar, .md-header, .md-footer, ' +
      '.md-source, .md-search, .md-tabs, .headerlink, ' +
      '.edit-this-page, .page-edit-url, .breadcrumb, ' +
      'script, style, .admonition-title'
    ).remove();
  }
  
  private extractTitle($: cheerio.CheerioAPI): string {
    return $('h1').first().text().trim() || 
           $('title').text().trim() || 
           'Untitled';
  }
  
  private detectContentType($: cheerio.CheerioAPI): AIOptimizedContent['contentType'] {
    const content = $.text().toLowerCase();
    
    if (content.includes('api') || content.includes('method') || content.includes('function')) {
      return 'api';
    }
    if (content.includes('tutorial') || content.includes('getting started') || content.includes('walkthrough')) {
      return 'tutorial';
    }
    if (content.includes('reference') || content.includes('documentation')) {
      return 'reference';
    }
    if (content.includes('guide') || content.includes('how to')) {
      return 'guide';
    }
    
    return 'unknown';
  }
  
  private extractCodeBlocks($: cheerio.CheerioAPI): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    
    // Extract fenced code blocks
    $('pre code, .highlight code, .codehilite code').each((_, element) => {
      const $el = $(element);
      const code = $el.text().trim();
      
      if (!code) return;
      
      const language = this.detectLanguage($el);
      const context = this.getCodeContext($el);
      const isExample = this.isCodeExample($el, context);
      
      codeBlocks.push({
        language,
        code,
        context,
        isExample
      });
    });
    
    // Extract inline code that might be important (commands, methods)
    $('code').not('pre code').each((_, element) => {
      const $el = $(element);
      const code = $el.text().trim();
      
      if (this.isImportantInlineCode(code)) {
        codeBlocks.push({
          language: 'text',
          code,
          isExample: false,
          context: $el.parent().text().trim().substring(0, 100)
        });
      }
    });
    
    return codeBlocks;
  }
  
  private detectLanguage($el: cheerio.Cheerio<cheerio.Element>): string {
    // Check class attributes for language hints
    const classes = $el.attr('class') || $el.parent().attr('class') || '';
    const langMatch = classes.match(/(?:language-|lang-|highlight-)(\w+)/);
    
    if (langMatch) return langMatch[1];
    
    // Detect by content patterns
    const code = $el.text();
    if (code.includes('import ') || code.includes('from ')) return 'python';
    if (code.includes('const ') || code.includes('function ')) return 'javascript';
    if (code.includes('aws ') || code.includes('npm ')) return 'bash';
    if (code.includes('{') && code.includes('"')) return 'json';
    
    return 'text';
  }
  
  private getCodeContext($el: cheerio.Cheerio<cheerio.Element>): string {
    // Get surrounding text for context
    const prev = $el.parent().prev().text().trim();
    const next = $el.parent().next().text().trim();
    
    return [prev, next].filter(Boolean).join(' ').substring(0, 200);
  }
  
  private isCodeExample($el: cheerio.Cheerio<cheerio.Element>, context: string): boolean {
    const indicators = ['example', 'usage', 'sample', 'demo', 'try', 'run', 'how to'];
    const contextLower = context.toLowerCase();
    
    // Check context for example indicators
    const hasIndicator = indicators.some(indicator => contextLower.includes(indicator));
    
    // Check if code looks like an example (imports, function calls, etc.)
    const code = $el.text();
    const looksLikeExample = code.includes('import ') || 
                            code.includes('from ') || 
                            code.includes('()') ||
                            code.length > 20; // Longer code blocks are likely examples
    
    return hasIndicator || looksLikeExample;
  }
  
  private isImportantInlineCode(code: string): boolean {
    // Filter for important inline code (commands, methods, etc.)
    return code.length > 3 && 
           (code.includes('()') || // method calls
            code.startsWith('aws ') || // CLI commands
            code.startsWith('npm ') ||
            code.startsWith('pip ') ||
            code.includes('--') || // command flags
            /^[A-Z][a-zA-Z]+$/.test(code)); // class names
  }
  
  private extractUseCases($: cheerio.CheerioAPI): UseCase[] {
    const useCases: UseCase[] = [];
    
    // Look for common use case patterns
    $('h2, h3, h4').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().toLowerCase();
      
      if (headingText.includes('use case') || 
          headingText.includes('when to') ||
          headingText.includes('example') ||
          headingText.includes('scenario')) {
        
        const content = this.getNextContent($heading);
        const codeExample = this.findCodeInNextSiblings($heading);
        
        useCases.push({
          scenario: $heading.text().trim(),
          solution: content.substring(0, 300),
          codeExample
        });
      }
    });
    
    return useCases;
  }
  
  private findCodeInNextSiblings($element: cheerio.Cheerio<cheerio.Element>): string | undefined {
    let next = $element.next();
    let attempts = 0;
    
    while (next.length && attempts < 5) { // Look at next 5 siblings
      const code = next.find('code, pre').first().text().trim();
      if (code.length > 10) {
        return code;
      }
      
      // Also check if the element itself is a code block
      if (next.is('pre') || next.is('code')) {
        const directCode = next.text().trim();
        if (directCode.length > 10) {
          return directCode;
        }
      }
      
      next = next.next();
      attempts++;
    }
    
    return undefined;
  }
  
  private extractKeyPoints($: cheerio.CheerioAPI): string[] {
    const keyPoints: string[] = [];
    
    // Extract from admonitions (important, note, tip)
    $('.admonition p, .note p, .tip p, .important p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 20 && text.length < 200) {
        keyPoints.push(text);
      }
    });
    
    // Extract from list items that look important
    $('li').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 30 && text.length < 150 && 
          (text.includes('must') || text.includes('should') || text.includes('important') ||
           text.includes('always') || text.includes('never') || text.includes('use'))) {
        keyPoints.push(text);
      }
    });
    
    return keyPoints.slice(0, 5); // Limit to top 5
  }
  
  private getNextContent($element: cheerio.Cheerio<cheerio.Element>): string {
    let content = '';
    let next = $element.next();
    
    while (next.length && !next.is('h1, h2, h3, h4, h5, h6') && content.length < 500) {
      content += next.text() + ' ';
      next = next.next();
    }
    
    return content.trim();
  }
  
  private findCodeInContent($element: cheerio.Cheerio<cheerio.Element>): string | undefined {
    const code = $element.find('code, pre').first().text().trim();
    return code.length > 10 ? code : undefined;
  }
  
  private generateOptimizedMarkdown($: cheerio.CheerioAPI, content: Partial<AIOptimizedContent>): string {
    let markdown = `# ${content.title}\n\n`;
    
    // Add summary if available
    if (content.keyPoints && content.keyPoints.length > 0) {
      markdown += `## Key Points\n\n`;
      content.keyPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += '\n';
    }
    
    // Add related concepts
    if (content.relatedConcepts && content.relatedConcepts.length > 0) {
      markdown += `## Related Concepts\n\n`;
      markdown += content.relatedConcepts.map(concept => `- ${concept}`).join('\n');
      markdown += '\n\n';
    }
    
    // Add use cases
    if (content.useCases && content.useCases.length > 0) {
      markdown += `## Use Cases\n\n`;
      content.useCases.forEach(useCase => {
        markdown += `### ${useCase.scenario}\n\n${useCase.solution}\n\n`;
        if (useCase.codeExample) {
          markdown += `\`\`\`\n${useCase.codeExample}\n\`\`\`\n\n`;
        }
      });
    }
    
    // Add main content (simplified conversion)
    const mainContent = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();
    
    markdown += `## Content\n\n${mainContent}\n\n`;
    
    // Add code examples section
    if (content.codeExamples && content.codeExamples.length > 0) {
      markdown += `## Code Examples\n\n`;
      content.codeExamples
        .filter(block => block.isExample)
        .forEach(block => {
          if (block.context) {
            markdown += `### ${block.context.substring(0, 50)}...\n\n`;
          }
          markdown += `\`\`\`${block.language}\n${block.code}\n\`\`\`\n\n`;
        });
    }
    
    // Add cross-references
    if (content.crossReferences && content.crossReferences.length > 0) {
      markdown += `## See Also\n\n`;
      content.crossReferences.slice(0, 5).forEach(ref => {
        markdown += `- [${ref.text}](${ref.url})\n`;
      });
      markdown += '\n';
    }
    
    return markdown;
  }
  
  private generateSummary(keyPoints: string[], useCases: UseCase[]): string {
    const points = keyPoints.slice(0, 3);
    const cases = useCases.slice(0, 2).map(uc => uc.scenario);
    
    let summary = '';
    if (points.length > 0) {
      summary += `Key concepts: ${points.join(', ')}. `;
    }
    if (cases.length > 0) {
      summary += `Use cases: ${cases.join(', ')}.`;
    }
    
    return summary.trim();
  }
  
  extractContent(html: string): { title: string; content: string } {
    const optimized = this.convertToAIOptimized(html);
    return {
      title: optimized.title,
      content: optimized.markdown
    };
  }
}
