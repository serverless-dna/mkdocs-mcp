import { ContentAnalyzer } from './contentAnalyzer';
import * as cheerio from 'cheerio';

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  it('should extract cross references', () => {
    const html = `
      <div>
        <p>See <a href="/api/logger">Logger API</a> for details.</p>
        <p>Also check <a href="https://external.com">external link</a>.</p>
        <p>Jump to <a href="#section">section</a>.</p>
      </div>
    `;
    
    const $ = cheerio.load(html);
    const analysis = analyzer.analyze($);
    
    expect(analysis.crossReferences).toHaveLength(1);
    expect(analysis.crossReferences[0].text).toBe('Logger API');
    expect(analysis.crossReferences[0].url).toBe('/api/logger');
  });

  it('should extract code patterns', () => {
    const html = `
      <div>
        <pre><code>
import logger
from aws_lambda_powertools import Logger
logger.info("test")
logger.debug("debug")
        </code></pre>
      </div>
    `;
    
    const $ = cheerio.load(html);
    const analysis = analyzer.analyze($);
    
    expect(analysis.codePatterns.length).toBeGreaterThan(0);
    expect(analysis.codePatterns.some(p => p.pattern === 'logger')).toBe(true);
  });

  it('should extract related concepts', () => {
    const html = `
      <div>
        <p>The Logger class works with Tracer and Metrics components.</p>
        <p>Use PowerTools for better observability.</p>
      </div>
    `;
    
    const $ = cheerio.load(html);
    const analysis = analyzer.analyze($);
    
    expect(analysis.relatedConcepts).toContain('Logger');
    expect(analysis.relatedConcepts).toContain('Tracer');
    expect(analysis.relatedConcepts).toContain('PowerTools');
  });
});
