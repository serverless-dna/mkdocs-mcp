import { fetchDocPage } from "../../fetch-doc";
import { logger } from "../../services/logger";

export const fetchMkDoc = async (props: { url: string }) => {
  const { url } = props;
  
  logger.info(`Fetching MkDoc page: ${url}`);
  
  try {
    const result = await fetchDocPage(url);
    return {
      content: [
        {
          type: "text" as const,
          text: result
        }
      ]
    };
  } catch (error) {
    logger.error("Fetch failed", { error });
    return {
      content: [
        {
          type: "text" as const,
          text: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
};
