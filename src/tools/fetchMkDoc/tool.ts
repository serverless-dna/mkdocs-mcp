import { fetchDocPage } from "../../fetch-doc";
import { logger } from "../../services/logger";
import { buildResponse } from "../shared/buildResponse";

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const fetchMkDoc = async (props: { url: string }): Promise<CallToolResult> => {
  const { url } = props;
  
  logger.info(`Fetching MkDoc page: ${url}`);
  
  try {
    const result = await fetchDocPage(url);
    
    // Return the structured JSON result
    return buildResponse({
      content: result
    });
  } catch (error) {
    logger.error("Fetch failed", { error });
    return buildResponse({
      content: {
        title: 'Error',
        markdown: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        code_examples: [],
        url
      },
      isError: true
    });
  }
};
