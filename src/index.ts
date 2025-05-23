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

const searchDoc = args.slice(1).join(' ') || "search online documentation";

// Class managing the Search indexes for searching
const searchIndexes = new SearchIndexFactory(docsUrl);

const searchDocsSchema = z.object({
  search: z.string().describe('what to search for'),
  version: z.string().optional().describe('version is always semantic 3 digit in the form x.y.z'), 
});

const fetchDocSchema = z.object({
  url: z.string().url(),
});

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
        const version = parsed.data.version?.trim().toLowerCase() || 'latest';

        // First, check if the version is valid
        const versionInfo = await searchIndexes.resolveVersion(version);
        if (!versionInfo.valid) {
          // Return an error with available versions
          const availableVersions = versionInfo.available?.map(v => v.version ) || [];
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: `Invalid version: ${version}`,
                availableVersions
              })
            }],
            isError: true
          };
        }

        // do the search
        const idx = await searchIndexes.getIndex(version);
        if (!idx) {
          logger.warn(`Invalid index for version: ${version}`);
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: `Failed to load index for version: ${version}`,
                suggestion: "Try using 'latest' version or check network connectivity"
              })
            }],
            isError: true
          };
        }
        
        // Use the searchDocuments function to get enhanced results
        logger.info(`Searching for "${search}" in ${version} (resolved to ${idx.version})`);
        const results = searchDocuments(idx.index, idx.documents, search);
        logger.info(`Search results for "${search}" in ${version}`, { results: results.length });
        
        // Format results for better readability
        const formattedResults = results.map(result => {
          const url = `${docsUrl}/${idx.version}/${result.ref}`;
          
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
