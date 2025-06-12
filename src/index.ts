import { logger } from "./services/logger/index";
import { fetchDocPage } from "./fetch-doc";
import { searchDocuments, SearchIndexFactory } from "./searchIndex";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

const _ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof _ToolInputSchema>;

const args = process.argv.slice(2);

if (!args[0]) {
  throw new Error('No doc site provided');
}

const docsUrl = args[0];

// Check for --versioned flag
const versionedFlagIndex = args.findIndex(arg => arg === '--versioned');
const isVersioned = versionedFlagIndex !== -1;

// Remove the --versioned flag from args if present for searchDoc
const filteredArgs = args.filter(arg => arg !== '--versioned');
const searchDoc = filteredArgs.slice(1).join(' ') || "search online documentation";

// Class managing the Search indexes for searching
const searchIndexes = new SearchIndexFactory(docsUrl);

// Create schema based on whether the site is versioned
const baseSearchSchema = z.object({
  search: z.string().describe('what to search for'),
});

const versionedSearchSchema = baseSearchSchema.extend({
  version: z.string().optional().describe('version is always semantic 3 digit in the form x.y.z'),
});

const searchDocsSchema = isVersioned ? versionedSearchSchema : baseSearchSchema;

const fetchDocSchema = z.object({
  url: z.string().url(),
});

// Helper function to create error responses
const createErrorResponse = (error: string, suggestion?: string, availableVersions?: string[]) => {
  const errorData: any = { error };
  if (suggestion) errorData.suggestion = suggestion;
  if (availableVersions) errorData.availableVersions = availableVersions;
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(errorData)
    }],
    isError: true
  };
};

export const server = new Server(
  {
    name: "mkdocs-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Set Tools List so LLM can get details on the tools and what they do
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search",
        description: searchDoc,
        inputSchema: zodToJsonSchema(searchDocsSchema) as ToolInput,
      },
      {
        name: "fetch",
        description:
          "fetch a documentation page and convert to markdown.",
        inputSchema: zodToJsonSchema(fetchDocSchema) as ToolInput,
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    logger.info(`Tool request: ${name}`, { tool: name, args });

    switch(name) {
      case "search": {
        const parsed = searchDocsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_docs: ${parsed.error}`);
        }
        const search = parsed.data.search.trim();
        
        // Handle version based on whether site is versioned with proper typing
        const version = isVersioned
          ? (parsed.data as z.infer<typeof versionedSearchSchema>).version?.trim().toLowerCase() || 'latest'
          : 'latest';

        // For non-versioned sites, skip version validation entirely
        let versionInfo;
        if (isVersioned) {
          versionInfo = await searchIndexes.resolveVersion(version);
          if (!versionInfo.valid && versionInfo.hasVersions) {
            const availableVersions = versionInfo.available?.map(v => v.version) || [];
            return createErrorResponse(`Invalid version: ${version}`, undefined, availableVersions);
          }
        } else {
          // For non-versioned sites, create a mock versionInfo
          versionInfo = { valid: true, hasVersions: false };
        }

        // do the search
        const idx = await searchIndexes.getIndex(version);
        if (!idx) {
          const errorMsg = versionInfo.hasVersions
            ? `Failed to load index for version: ${version}`
            : `Failed to load index (non-versioned mode)`;
          const suggestion = versionInfo.hasVersions
            ? "Try using 'latest' version or check network connectivity"
            : "Check network connectivity";
          
          logger.warn(errorMsg);
          return createErrorResponse(errorMsg, suggestion);
        }
        
        // Use the searchDocuments function to get enhanced results
        const searchContext = versionInfo.hasVersions
          ? `${version} (resolved to ${idx.version})`
          : 'non-versioned mode';
        logger.info(`Searching for "${search}" in ${searchContext}`);
        
        if (!idx.index || !idx.documents) {
          logger.error(`Index or documents not properly loaded`);
          return createErrorResponse(
            `Index or documents not properly loaded`,
            "Check network connectivity and try again"
          );
        }
        
        const results = searchDocuments(idx.index, idx.documents, search);
        logger.info(`Search results for "${search}" in ${searchContext}`, { results: results.length });
        
        // Format results for better readability
        const formattedResults = results.map(result => {
          // Construct URL based on whether we have versions or not
          const url = versionInfo.hasVersions
            ? `${docsUrl}/${idx.version}/${result.ref}`
            : `${docsUrl}/${result.ref}`;
          
          return {
            title: result.title,
            url,
            score: result.score,
            snippet: result.snippet // Use the pre-truncated snippet
          };
        });
        
        return {
          content: [{ type: "text", text: JSON.stringify(formattedResults)}]
        }
      }

      case "fetch": {
        const parsed = fetchDocSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for fetch_doc_page: ${parsed.error}`);
        }
        const url = parsed.data.url;
        
        // Fetch the documentation page
        logger.info(`Fetching documentation page`, { url });
        const markdown = await fetchDocPage(url);
        logger.debug(`Fetched documentation page`, { contentLength: markdown.length });
        
        return {
          content: [{ type: "text", text: markdown }]
        }
      }

      // default error case - tool not known
      default:
        logger.warn(`Unknown tool requested`, { tool: name });
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const theError = error instanceof Error ? error : new Error(errorMessage)
    logger.error(`Error handling tool request`, { error: theError });
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function main() {
    const transport = new StdioServerTransport();
    logger.info('starting MkDocs MCP Server')
    await server.connect(transport);
    console.error('MkDocs Documentation MCP Server running on stdio');
    logger.info('MkDocs Documentation MCP Server running on stdio');
}

main().catch((error) => {
    console.error("Fatal error in main()", { error });
    logger.error("Fatal error in main()", { error });
    process.exit(1);
});
