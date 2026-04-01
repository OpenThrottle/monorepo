/**
 * @description CLI entry point for the docs MCP server. Run via `npx @openthrottle/docs-mcp` or `nx run mattscholta-docs-mcp:serve`.
 */

import { runServer } from './index.js';

runServer().catch((error: unknown) => {
  console.error('runServer failed', error);
  process.exit(1);
});
