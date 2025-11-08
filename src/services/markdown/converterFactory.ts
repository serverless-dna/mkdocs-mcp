import { NodeHtmlMarkdownConverter } from './nodeHtmlMarkdownConverter';
import { AIOptimizedMarkdownConverter } from './aiOptimizedConverter';
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
 */
export class ConverterFactory {
  /**
   * Create an instance of an HTML-to-markdown converter
   * @param type The type of converter to create
   * @returns An instance of HtmlToMarkdownConverter
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
   */
  static createDefault(): HtmlToMarkdownConverter {
    return this.createConverter(ConverterType.AI_OPTIMIZED);
  }
}
