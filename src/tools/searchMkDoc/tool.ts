import { SEARCH_CONFIDENCE_THRESHOLD } from "../../constants";
import { logger } from "../../services/logger";
import { searchDocuments } from "../../shared/searchIndex";
import { buildResponse } from "../shared/buildResponse";

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const searchMkDoc = async (props: { 
  search: string; 
  version?: string; 
  docsUrl: string 
}): Promise<CallToolResult> => {
  const { search, version = 'latest', docsUrl } = props;
  
  logger.info(`Searching MkDocs for: ${search}`, { version, docsUrl });
  
  try {
    const searchResults = await searchDocuments(docsUrl, search, version);
    
    // Filter results by confidence threshold and format for better presentation
    const filteredResults = searchResults.results
      .filter((result: any) => result.score >= SEARCH_CONFIDENCE_THRESHOLD)
      .map((result: any) => {
        const doc = result.document;
        const baseResult = {
          title: doc?.title || result.ref,
          url: `${docsUrl}/${version}/${result.ref}`,
          score: result.score,
          preview: doc?.preview || '',
          location: result.ref
        };

        // Add parent article context for sections
        if (doc?.isSection && doc?.parent) {
          return {
            ...baseResult,
            parentArticle: {
              title: doc.parent.title,
              location: doc.parent.location,
              url: `${docsUrl}/${version}/${doc.parent.location}`
            }
          };
        }

        return baseResult;
      });

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
