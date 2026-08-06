/**
 * @description Entry point for the HTTP (streamable) MCP server used by the
 * Docker-native `mcp` service. Run via `tsx src/bin-http.ts` (dev image) or the
 * built output. For the stdio server (host launcher) see {@link ./bin.ts}.
 */
import { runServerHttp } from './run-server-http.ts';

runServerHttp().catch((error: unknown) => {
  console.error('runServerHttp failed', error);
  process.exit(1);
});
