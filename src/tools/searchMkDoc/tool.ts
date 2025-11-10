import { SEARCH_CONFIDENCE_THRESHOLD } from "../../constants";
import { logger } from "../../services/logger";
import { EnhancedSearchIndexFactory } from "../../shared/EnhancedSearchIndexFactory";
import { VersionNotFoundError } from "../../shared/errors/VersionErrors";
import { buildVersionedUrl } from "../../shared/versionDetection";
import { buildResponse } from "../shared/buildResponse";

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const searchMkDoc = async (props: { 
  search: string; 
  version?: string; 
  docsUrl: string 
}): Promise<CallToolResult> => {
  const { search, version, docsUrl } = props;
  
  logger.info(`Searching MkDocs for: ${search}`, { version, docsUrl });
  
  try {
    const factory = new EnhancedSearchIndexFactory(docsUrl);
    const searchIndex = await factory.getSearchIndex(version);
    
    if (!searchIndex || !searchIndex.index || !searchIndex.documents) {
      throw new Error(`No search index available${version ? ` for version: ${version}` : ''}`);
    }

    // Perform the search using the index
    const results = searchIndex.index.search(search);
    
    // Map results to include document data and apply advanced scoring
    const queryStr = String(search);
    const queryTerms = queryStr.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    
    const mappedResults = results.map(result => {
      const doc = searchIndex.documents!.get(result.ref);
      let enhancedScore = result.score;
      
      if (doc) {
        let boost = 1;
        
        // Title match boost
        const titleLower = doc.title.toLowerCase();
        const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
        if (titleMatches > 0) {
          boost += titleMatches * 0.5;
        }
        
        // Exact title match gets major boost
        if (titleLower === queryStr.toLowerCase()) {
          boost += 2.0;
        }
        
        // Article vs section boost
        if (!doc.isSection) {
          boost += 0.2;
        }
        
        // Tag match boost
        if (doc.tags && doc.tags.length > 0) {
          const tagMatches = queryTerms.filter(term => 
            doc.tags.some((tag: string) => tag.toLowerCase().includes(term))
          ).length;
          if (tagMatches > 0) {
            boost += tagMatches * 0.3;
          }
        }
        
        enhancedScore = result.score * boost;
      }
      
      return {
        ...result,
        score: enhancedScore,
        originalScore: result.score,
        document: doc
      };
    });

    // Filter results by confidence threshold and format for better presentation
    const filteredResults = await Promise.all(
      mappedResults
        .filter((result: any) => result.score >= SEARCH_CONFIDENCE_THRESHOLD)
        .map(async (result: any) => {
          const doc = result.document;
          const url = await buildVersionedUrl(docsUrl, result.ref, version);
          
          const baseResult = {
            title: doc?.title || result.ref,
            url,
            score: result.score,
            preview: doc?.preview || '',
            location: result.ref
          };

          // Add parent article context for sections
          if (doc?.isSection && doc?.parent) {
            const parentUrl = await buildVersionedUrl(docsUrl, doc.parent.location, version);
            return {
              ...baseResult,
              parentArticle: {
                title: doc.parent.title,
                location: doc.parent.location,
                url: parentUrl
              }
            };
          }

          return baseResult;
        })
    );

    logger.debug(
      `Search results with confidence >= ${SEARCH_CONFIDENCE_THRESHOLD} found: ${filteredResults.length}`
    );

    return buildResponse({
      content: {
        query: search,
        version,
        total: filteredResults.length,
        results: filteredResults
      }
    });
  } catch (error) {
    logger.error("Search failed", { error });
    
    // Handle version-specific errors with available versions
    if (error instanceof VersionNotFoundError) {
      return buildResponse({
        content: {
          error: error.message,
          requestedVersion: error.requestedVersion,
          availableVersions: error.availableVersions.map(v => ({
            version: v.version,
            title: v.title,
            aliases: v.aliases
          }))
        },
        isError: true
      });
    }
    
    return buildResponse({
      content: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      isError: true
    });
  }
};


