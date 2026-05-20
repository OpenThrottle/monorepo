/**
 * @description CLI entry point for the MCP server.
 * Run via `npx @openthrottle/mcp-developer` or `nx run openthrottle-mcp-developer:serve`.
 */

import { runServerLocal } from './index.js';

// No logging anywhere in here, just error handling.
runServerLocal().catch((error: unknown) => {
  console.error('runServerLocal failed', error);
  process.exit(1);
});
