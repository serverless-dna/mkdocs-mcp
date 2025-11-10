import { AIOptimizedMarkdownConverter } from './aiOptimizedConverter';
import { NodeHtmlMarkdownConverter } from './nodeHtmlMarkdownConverter';
import { HtmlToMarkdownConverter } from './types';

/**
 * Enum for available HTML-to-markdown converter types
 */
export enum ConverterType {
  NODE_HTML_MARKDOWN = 'node-html-markdown',
  AI_OPTIMIZED = 'ai-optimized',
}

/**
 * Factory for creating HTML-to-markdown converters
 * @deprecated This factory is deprecated. Use MkDocsMarkdownConverter directly for MkDocs Material sites.
 * The new converter provides structured JSON responses with code examples and better MkDocs support.
 */
export class ConverterFactory {
  /**
   * Create an instance of an HTML-to-markdown converter
   * @param type The type of converter to create
   * @returns An instance of HtmlToMarkdownConverter
   * @deprecated Use MkDocsMarkdownConverter directly instead
   */
  static createConverter(type: ConverterType = ConverterType.AI_OPTIMIZED): HtmlToMarkdownConverter {
    switch (type) {
      case ConverterType.NODE_HTML_MARKDOWN:
        return new NodeHtmlMarkdownConverter();
      case ConverterType.AI_OPTIMIZED:
        return new AIOptimizedMarkdownConverter();
      default:
        return new AIOptimizedMarkdownConverter();
    }
  }
  
  /**
   * Get the default converter optimized for AI coding assistants
   * @deprecated Use MkDocsMarkdownConverter directly instead
   */
  static createDefault(): HtmlToMarkdownConverter {
    return this.createConverter(ConverterType.AI_OPTIMIZED);
  }
}
