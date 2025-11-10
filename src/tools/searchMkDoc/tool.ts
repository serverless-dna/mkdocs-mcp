import { SEARCH_CONFIDENCE_THRESHOLD } from "../../constants";
import { logger } from "../../services/logger";
import { searchDocuments } from "../../shared/searchIndex";
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
    const searchResults = await searchDocuments(docsUrl, search, version);
    
    // Filter results by confidence threshold and format for better presentation
    const filteredResults = await Promise.all(
      searchResults.results
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
    return buildResponse({
      content: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      isError: true
    });
  }
};


