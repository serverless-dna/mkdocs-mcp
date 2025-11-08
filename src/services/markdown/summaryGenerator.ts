import { ContentAnalysis } from './contentAnalyzer';

export interface SummaryOptions {
  maxLength: number;
  includeCodePatterns: boolean;
  includeCrossRefs: boolean;
}

/**
 * Generates intelligent summaries from content analysis
 */
export class SummaryGenerator {
  
  generate(analysis: ContentAnalysis, options: SummaryOptions = {
    maxLength: 300,
    includeCodePatterns: true,
    includeCrossRefs: false
  }): string {
    const parts: string[] = [];
    
    // Key concepts summary
    if (analysis.keyPoints.length > 0) {
      const topPoints = analysis.keyPoints.slice(0, 2);
      parts.push(`Key concepts: ${topPoints.join(', ')}`);
    }
    
    // Use cases summary
    if (analysis.useCases.length > 0) {
      const scenarios = analysis.useCases
        .slice(0, 2)
        .map(uc => uc.scenario)
        .join(', ');
      parts.push(`Use cases: ${scenarios}`);
    }
    
    // Code patterns (if enabled)
    if (options.includeCodePatterns && analysis.codePatterns.length > 0) {
      const patterns = analysis.codePatterns
        .slice(0, 3)
        .map(p => p.pattern)
        .join(', ');
      parts.push(`Common patterns: ${patterns}`);
    }
    
    // Related concepts
    if (analysis.relatedConcepts.length > 0) {
      const concepts = analysis.relatedConcepts
        .slice(0, 3)
        .join(', ');
      parts.push(`Related: ${concepts}`);
    }
    
    // Cross references (if enabled)
    if (options.includeCrossRefs && analysis.crossReferences.length > 0) {
      const refCount = analysis.crossReferences.length;
      parts.push(`${refCount} cross-references available`);
    }
    
    let summary = parts.join('. ');
    
    // Truncate if too long
    if (summary.length > options.maxLength) {
      summary = summary.substring(0, options.maxLength - 3) + '...';
    }
    
    return summary;
  }
  
  /**
   * Generate a technical summary focused on implementation details
   */
  generateTechnicalSummary(analysis: ContentAnalysis): string {
    const parts: string[] = [];
    
    // Code patterns with frequency
    if (analysis.codePatterns.length > 0) {
      const topPattern = analysis.codePatterns[0];
      parts.push(`Primary pattern: ${topPattern.pattern} (${topPattern.frequency}x)`);
    }
    
    // Use cases with code examples
    const useCasesWithCode = analysis.useCases.filter(uc => uc.codeExample);
    if (useCasesWithCode.length > 0) {
      parts.push(`${useCasesWithCode.length} documented examples`);
    }
    
    // Cross-reference density
    if (analysis.crossReferences.length > 0) {
      parts.push(`${analysis.crossReferences.length} internal links`);
    }
    
    return parts.join(', ');
  }
  
  /**
   * Generate a developer-focused summary
   */
  generateDeveloperSummary(analysis: ContentAnalysis): string {
    const parts: string[] = [];
    
    // Most common code patterns
    const codePatterns = analysis.codePatterns.slice(0, 2);
    if (codePatterns.length > 0) {
      parts.push(`Uses: ${codePatterns.map(p => p.pattern).join(', ')}`);
    }
    
    // Practical use cases
    const practicalUseCases = analysis.useCases
      .filter(uc => uc.codeExample)
      .slice(0, 2);
    
    if (practicalUseCases.length > 0) {
      parts.push(`Examples: ${practicalUseCases.map(uc => uc.scenario).join(', ')}`);
    }
    
    // Key implementation points
    const implementationPoints = analysis.keyPoints
      .filter(point => 
        point.toLowerCase().includes('must') || 
        point.toLowerCase().includes('should') ||
        point.toLowerCase().includes('required')
      )
      .slice(0, 1);
    
    if (implementationPoints.length > 0) {
      parts.push(`Important: ${implementationPoints[0]}`);
    }
    
    return parts.join('. ');
  }
}
