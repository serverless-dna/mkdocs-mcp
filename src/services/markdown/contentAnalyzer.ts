import * as cheerio from 'cheerio';

export interface ContentAnalysis {
  keyPoints: string[];
  useCases: UseCase[];
  codePatterns: CodePattern[];
  relatedConcepts: string[];
  crossReferences: CrossReference[];
}

export interface UseCase {
  scenario: string;
  solution: string;
  codeExample?: string;
}

export interface CodePattern {
  pattern: string;
  description: string;
  frequency: number;
}

export interface CrossReference {
  text: string;
  url: string;
  context: string;
}

/**
 * Advanced content analyzer for extracting structured information
 */
export class ContentAnalyzer {
  
  analyze($: cheerio.CheerioAPI): ContentAnalysis {
    return {
      keyPoints: this.extractKeyPoints($),
      useCases: this.extractUseCases($),
      codePatterns: this.extractCodePatterns($),
      relatedConcepts: this.extractRelatedConcepts($),
      crossReferences: this.extractCrossReferences($)
    };
  }
  
  private extractKeyPoints($: cheerio.CheerioAPI): string[] {
    const points: string[] = [];
    
    // Enhanced extraction with priority scoring
    const selectors = [
      { selector: '.admonition.important p', weight: 3 },
      { selector: '.admonition.warning p', weight: 3 },
      { selector: '.admonition.note p', weight: 2 },
      { selector: '.admonition.tip p', weight: 2 },
      { selector: 'strong', weight: 1 },
      { selector: 'em', weight: 1 }
    ];
    
    selectors.forEach(({ selector, weight }) => {
      $(selector).each((_, element) => {
        const text = $(element).text().trim();
        if (this.isValidKeyPoint(text)) {
          // Add weight-based duplicates for priority
          for (let i = 0; i < weight; i++) {
            points.push(text);
          }
        }
      });
    });
    
    // Return unique points sorted by frequency
    return this.getTopByFrequency(points, 5);
  }
  
  private extractUseCases($: cheerio.CheerioAPI): UseCase[] {
    const useCases: UseCase[] = [];
    
    // Enhanced patterns for use case detection
    const patterns = [
      /use case[s]?:?\s*(.+)/i,
      /when to\s+(.+)/i,
      /scenario[s]?:?\s*(.+)/i,
      /example[s]?:?\s*(.+)/i,
      /if you want to\s+(.+)/i,
      /to\s+(.+),\s*use/i
    ];
    
    $('h1, h2, h3, h4, p').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      
      patterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match) {
          const scenario = match[1].trim();
          const solution = this.getFollowingContent($el);
          const codeExample = this.findNearbyCode($el);
          
          useCases.push({ scenario, solution, codeExample });
        }
      });
    });
    
    return useCases.slice(0, 3);
  }
  
  private extractCodePatterns($: cheerio.CheerioAPI): CodePattern[] {
    const patterns = new Map<string, number>();
    
    $('code, pre code').each((_, element) => {
      const code = $(element).text().trim();
      
      // Extract common patterns
      const commonPatterns = [
        /import\s+(\w+)/g,
        /from\s+([^\s]+)/g,
        /\.(\w+)\(/g,  // method calls
        /(\w+)\s*=/g,  // assignments
        /class\s+(\w+)/g,
        /def\s+(\w+)/g,
        /function\s+(\w+)/g
      ];
      
      commonPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          const key = match[1];
          patterns.set(key, (patterns.get(key) || 0) + 1);
        }
      });
    });
    
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, frequency]) => ({
        pattern,
        description: this.describePattern(pattern),
        frequency
      }));
  }
  
  private extractRelatedConcepts($: cheerio.CheerioAPI): string[] {
    const concepts: string[] = [];
    
    // Look for capitalized terms, technical terms
    const text = $.text();
    const matches = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
    
    // Filter for likely technical concepts
    const filtered = matches.filter(term => 
      term.length > 3 && 
      !['The', 'This', 'That', 'When', 'Where', 'What', 'How'].includes(term)
    );
    
    return this.getTopByFrequency(filtered, 8);
  }
  
  private extractCrossReferences($: cheerio.CheerioAPI): CrossReference[] {
    const refs: CrossReference[] = [];
    
    $('a[href]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      const text = $el.text().trim();
      
      if (href && text && this.isInternalLink(href)) {
        const context = $el.parent().text().trim().substring(0, 100);
        refs.push({ text, url: href, context });
      }
    });
    
    return refs.slice(0, 10);
  }
  
  private isValidKeyPoint(text: string): boolean {
    return text.length > 15 && 
           text.length < 200 && 
           !text.includes('http') &&
           /[.!?]$/.test(text);
  }
  
  private getTopByFrequency(items: string[], limit: number): string[] {
    const freq = new Map<string, number>();
    items.forEach(item => freq.set(item, (freq.get(item) || 0) + 1));
    
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }
  
  private getFollowingContent($el: cheerio.Cheerio<cheerio.Element>): string {
    let content = '';
    let next = $el.next();
    let count = 0;
    
    while (next.length && count < 3 && !next.is('h1, h2, h3, h4')) {
      content += next.text() + ' ';
      next = next.next();
      count++;
    }
    
    return content.trim().substring(0, 200);
  }
  
  private findNearbyCode($el: cheerio.Cheerio<cheerio.Element>): string | undefined {
    // Look in next 3 siblings for code
    let next = $el.next();
    let count = 0;
    
    while (next.length && count < 3) {
      const code = next.find('code, pre').first().text().trim();
      if (code.length > 10) return code;
      
      if (next.is('pre, code')) {
        const directCode = next.text().trim();
        if (directCode.length > 10) return directCode;
      }
      
      next = next.next();
      count++;
    }
    
    return undefined;
  }
  
  private describePattern(pattern: string): string {
    const descriptions: Record<string, string> = {
      'import': 'Module import',
      'from': 'Import statement',
      'class': 'Class definition',
      'def': 'Function definition',
      'function': 'Function definition'
    };
    
    return descriptions[pattern] || 'Code pattern';
  }
  
  private isInternalLink(href: string): boolean {
    return !href.startsWith('http') && 
           !href.startsWith('mailto:') && 
           !href.startsWith('#');
  }
}
