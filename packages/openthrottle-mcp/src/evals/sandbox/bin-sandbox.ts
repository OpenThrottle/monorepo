/**
 * @description Stdio entry for the sandboxed MCP server used by CLI-driven tool-selection evals. Serves the
 * full tool surface (every toolset) with canned replies and appends each call, one JSON object per line, to
 * the file named by `OPENTHROTTLE_MCP_SANDBOX_CALL_LOG`.
 *
 * This is deliberately NOT a `bin` in package.json and NOT reachable from `src/bin.ts`, `src/bin-http.ts` or
 * `esbuild.http.mjs`: it is launched only by the eval harness, via `tsx <path to this file>`.
 */

import { appendFileSync } from 'node:fs';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getServerName, SERVER_VERSION } from '../../config/index.ts';
import { TOOLSET_NAMES } from '../../config/toolsets.ts';
import { listToolSurface } from '../../model-facing-text/surface.ts';
import { createSandboxMcpServer } from './createSandboxMcpServer.ts';

/**
 * @description Env var naming the JSONL file each sandboxed call is appended to.
 * @public
 */
export const SANDBOX_CALL_LOG_ENV = 'OPENTHROTTLE_MCP_SANDBOX_CALL_LOG';

/**
 * @description Boots the sandbox on stdio. Returns an exit code instead of throwing on a usage error.
 * @public
 */
export async function runSandboxServer(): Promise<number> {
  const callLog = process.env[SANDBOX_CALL_LOG_ENV];
  if (callLog === undefined || callLog === '') {
    process.stderr.write(
      `[openthrottle-mcp sandbox] ${SANDBOX_CALL_LOG_ENV} is not set; refusing to start a sandbox that records nothing.\n`,
    );

    return 2;
  }

  const surface = await listToolSurface(new Set(TOOLSET_NAMES));
  const server = createSandboxMcpServer({
    name: getServerName(),
    now: () => new Date(),
    recordCall: (call) => {
      appendFileSync(callLog, `${JSON.stringify(call)}\n`);
    },
    surface,
    version: SERVER_VERSION,
  });
  await server.connect(new StdioServerTransport());

  return 0;
}

if (process.argv[1]?.endsWith('bin-sandbox.ts')) {
  const code = await runSandboxServer();
  if (code !== 0) {
    process.exit(code);
  }
}
