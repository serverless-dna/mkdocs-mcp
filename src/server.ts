import {
  description as fetchMkDocDescription,
  name as fetchMkDocName,
  schema as fetchMkDocSchema,
  tool as fetchMkDoc,
} from './tools/fetchMkDoc/index';
import {
  description as searchMkDocDescription,
  name as searchMkDocName,
  schema as searchMkDocSchema,
  tool as searchMkDoc,
} from './tools/searchMkDoc/index';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const createServer = (docsUrl: string, searchDoc: string) => {
  const server = new Server(
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

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: searchMkDocName,
          description: `${searchMkDocDescription}: ${searchDoc}`,
          inputSchema: zodToJsonSchema(searchMkDocSchema),
        },
        {
          name: fetchMkDocName,
          description: fetchMkDocDescription,
          inputSchema: zodToJsonSchema(fetchMkDocSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case searchMkDocName:
        return await searchMkDoc({ ...args, docsUrl });
      case fetchMkDocName:
        return await fetchMkDoc(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
};
