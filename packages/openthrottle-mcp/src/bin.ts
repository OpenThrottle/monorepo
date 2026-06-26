/**
 * @description CLI entry point for the MCP server.
 * Run via `npx @openthrottle/openthrottle-mcp` or `nx run @openthrottle/openthrottle-mcp:serve`.
 */

import { runServerLocal } from './index.ts';

// No logging anywhere in here, just error handling.
runServerLocal().catch((error: unknown) => {
  console.error('runServerLocal failed', error);
  process.exit(1);
});
