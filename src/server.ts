import { fetchService } from './services/fetch';
import { ContentType } from './services/fetch/types';
import { logger } from './services/logger';
import { SearchIndexFactory } from './shared/SearchIndexFactory';
import {
  description as fetchMkDocDescription,
  name as fetchMkDocName,
  schema as fetchMkDocSchema,
  tool as fetchMkDoc,
} from './tools/fetchMkDoc/index';
import {
  description as searchMkDocDescription,
  name as searchMkDocName,
  tool as searchMkDoc,
} from './tools/searchMkDoc/index';
import { searchMkDocSchema, searchMkDocSchemaWithoutVersion } from './tools/searchMkDoc/schemas';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './constants';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const createServer = async (docsUrl: string, searchDoc: string) => {
  // Normalize the base URL by removing trailing slash
  const normalizedDocsUrl = docsUrl.replace(/\/$/, '');
  logger.info(`Normalized docs URL: ${normalizedDocsUrl}`);
  
  // Detect versioning at server startup
  logger.info(`Detecting versioning for ${normalizedDocsUrl}`);
  
  let hasVersioning = false;
  let availableVersions: any[] = [];
  
  try {
    // Try to fetch versions.json to determine if site is versioned
    const versionsUrl = `${normalizedDocsUrl}/versions.json`;
    logger.info(`🔍 Checking for versions.json at: ${versionsUrl}`);
    
    const response = await fetchService.fetch(versionsUrl, {
      contentType: ContentType.WEB_PAGE,
      headers: { 'Accept': 'application/json' }
    });
    
    logger.info(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const versions = await response.json();
      logger.info(`📄 Versions.json content:`, versions);
      
      if (Array.isArray(versions) && versions.length > 0) {
        hasVersioning = true;
        availableVersions = versions;
        logger.info(`✅ Site is versioned with ${versions.length} versions: ${versions.map(v => v.version).join(', ')}`);
      } else {
        logger.info(`❌ versions.json exists but is empty or invalid format`);
      }
    } else {
      logger.info(`❌ versions.json not found (${response.status})`);
    }
  } catch (error) {
    logger.info(`❌ Error fetching versions.json from ${normalizedDocsUrl}:`, error);
  }
  
  if (!hasVersioning) {
    logger.info(`Site is non-versioned: ${normalizedDocsUrl}`);
  }
  
  // Initialize the search index factory with the detected versioning info
  const searchIndexFactory = new SearchIndexFactory(normalizedDocsUrl, { hasVersioning, availableVersions });

  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Use the appropriate schema based on whether the site has versioning
    const searchSchema = hasVersioning ? searchMkDocSchema : searchMkDocSchemaWithoutVersion;
    
    return {
      tools: [
        {
          name: searchMkDocName,
          description: `${searchMkDocDescription} for ${searchDoc}. Results are filtered by confidence threshold for relevance.${hasVersioning ? ` Available versions: ${availableVersions.map(v => v.version).join(', ')}` : ''}`,
          inputSchema: zodToJsonSchema(searchSchema),
        },
        {
          name: fetchMkDocName,
          description: `${fetchMkDocDescription}. Fetches and converts documentation pages to markdown format.`,
          inputSchema: zodToJsonSchema(fetchMkDocSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case searchMkDocName:
        return await searchMkDoc({ ...args, docsUrl: normalizedDocsUrl, searchIndexFactory });
      case fetchMkDocName:
        return await fetchMkDoc(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
};
