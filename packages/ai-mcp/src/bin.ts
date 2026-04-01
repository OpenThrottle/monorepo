/**
 * @description CLI entry point for the MCP server. Run via `npx @openthrottle/ai-mcp` or `nx run mattscholta-ai-mcp:serve`.
 */

import { runServer } from './index.js';

// No logging anywhere in here, just error handling.
runServer().catch((error: unknown) => {
  console.error('runServer failed', error);
  process.exit(1);
});
