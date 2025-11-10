import { logger } from "./services/logger/index";
import { createServer } from "./server";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function main() {
  const args = process.argv.slice(2);

  if (!args[0]) {
    throw new Error('No doc site provided');
  }

  const docsUrl = args[0];
  const searchDoc = args.slice(1).join(' ') || "search online documentation";

  const transport = new StdioServerTransport();
  logger.info('Starting MkDocs MCP Server');
  
  const server = await createServer(docsUrl, searchDoc);
  await server.connect(transport);
  
  logger.info('MkDocs MCP Server running on stdio');
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('MkDocs MCP Fatal Error', { error });
    process.exit(1);
  });
}
