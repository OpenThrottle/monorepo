/**
 * @description CLI entry point for the MCP server.
 * Run via `npx @openthrottle/mcp-developer` or `nx run openthrottle-mcp-developer:serve`.
 */

import { runServer } from './index.js';

// No logging anywhere in here, just error handling.
runServer().catch((error: unknown) => {
  console.error('runServer failed', error);
  process.exit(1);
});
