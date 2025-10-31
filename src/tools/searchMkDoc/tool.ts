import { logger } from "../../services/logger";
import { searchDocuments } from "../../shared/searchIndex";

export const searchMkDoc = async (props: { search: string; version?: string; docsUrl: string }) => {
  const { search, version, docsUrl } = props;
  
  logger.info(`Searching MkDocs for: ${search}`, { version, docsUrl });
  
  try {
    const results = await searchDocuments(docsUrl, search, version);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error("Search failed", { error });
    return {
      content: [
        {
          type: "text" as const,
          text: `Search failed: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
};
