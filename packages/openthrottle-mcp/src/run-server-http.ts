/**
 * @description Runs the developer MCP surface over @rekog/mcp-nest STREAMABLE_HTTP
 * (stateless JSON) instead of stdio, for the Docker-native `mcp` service. Clients
 * register it as `{ "type": "http", "url": "http://<host>:<port>/mcp" }`.
 *
 * Wires `McpModule` directly with the tool surface rather than going through
 * {@link NestjsMcpDeveloperModule} — that module's placeholder
 * `NestjsMcpDeveloperService` injects a `LoggerService` that isn't provided in a
 * standalone HTTP app; the tools live entirely on {@link McpDeveloperMcpSurface}.
 *
 * Auth: machine tools resolve the container's env `OPENTHROTTLE_MCP_AUTH_TOKEN`
 * (`ot_sa_…`). Per-request identity (a human JWT for `agent_conversation_*`) is
 * layered on by {@link mcpHttpAuthMiddleware} (see run-server-http-auth.ts).
 *
 * Run: `OT_MCP_HTTP_PORT=6022 tsx src/run-server-http.ts`
 */
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import {
  getServerName,
  SERVER_INSTRUCTIONS,
  SERVER_VERSION,
} from './config/index.ts';
import { mcpHttpAuthMiddleware } from './http/mcp-http-auth.middleware.ts';
import { McpDeveloperMcpSurface } from './nest/openthrottle-mcp-mcp-surface.ts';

const DEFAULT_HTTP_PORT = 6026;
const SERVER_NAME = getServerName();

function resolvePort(): number {
  const raw = process.env.OT_MCP_HTTP_PORT;
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_HTTP_PORT;
}

/**
 * @description Boot-time warning when the machine-identity token is absent. HTTP
 * clients can still pass a per-request `Authorization` header, but tools with no
 * header fall back to this env token — so an empty one means unauthenticated
 * machine-tool calls will fail. Mirrors the stdio runner's warn-not-fail posture.
 */
function warnIfAuthTokenMissing(): void {
  const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    console.error(
      '[openthrottle-mcp:http] OPENTHROTTLE_MCP_AUTH_TOKEN is not set. Clients that send a per-request Authorization header still work, but calls without one will fail authenticated tools. Set OPENTHROTTLE_MCP_AUTH_TOKEN in the container env.',
    );
  }
}

/**
 * @description Startup auth preflight — the HTTP analogue of the stdio launcher's
 * check (scripts/run-openthrottle-mcp.sh). Prevents the "connected but every
 * authenticated call 401s" trap that authored this plan:
 * - env token present but the server REJECTS it → throw (fail the container) so
 *   `docker compose up` shows it crash-looping instead of silently serving 401s.
 * - env token empty → loud warn only (clients may still authenticate per-request
 *   via the Authorization header, which is a valid deployment).
 * The server answers auth failures with HTTP 200 + an `errors` array, so decide
 * on the body, not the status. Opt out with OT_MCP_SKIP_PREFLIGHT=1.
 */
async function preflightAuth(): Promise<void> {
  if (process.env.OT_MCP_SKIP_PREFLIGHT === '1') {
    return;
  }
  const token = (process.env.OPENTHROTTLE_MCP_AUTH_TOKEN ?? '').trim();
  if (token === '') {
    return; // warnIfAuthTokenMissing already surfaced this; per-request auth is valid
  }
  const apiUrl = (
    process.env.API_URL_INTERNAL ??
    process.env.API_URL ??
    'http://localhost:6021'
  ).replace(/\/$/, '');
  let body: string;
  let status: number;
  try {
    const res = await fetch(`${apiUrl}/graphql`, {
      body: JSON.stringify({
        query: 'query { listSources { sources { name } } }',
      }),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    status = res.status;
    body = await res.text();
  } catch (error) {
    // Network/DNS/timeout — the server may still be coming up. depends_on
    // healthy should prevent this; warn rather than crash on a transient miss.
    console.error(
      `[openthrottle-mcp:http] auth preflight inconclusive (could not reach ${apiUrl}/graphql: ${String(error)}). Starting anyway.`,
    );
    return;
  }
  if (status === 401 || status === 403 || /"errors"/.test(body)) {
    throw new Error(
      `[openthrottle-mcp:http] server rejected OPENTHROTTLE_MCP_AUTH_TOKEN (HTTP ${status}). ` +
        'Provision it with `docker compose run --rm bootstrap`, or set a valid ot_sa token. ' +
        `Response: ${body.slice(0, 200)}`,
    );
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      capabilities: { resources: {}, tools: {} },
      instructions: SERVER_INSTRUCTIONS,
      name: SERVER_NAME,
      // Stateful streamable HTTP: issue an Mcp-Session-Id on initialize and serve
      // the GET SSE stream. @rekog defaults to stateless (no session id, GET /mcp
      // → 405), which leaves spec-compliant clients (Claude Code, Cursor) connected
      // but showing 0 tools because they can't establish the session/notification
      // channel. `enableJsonResponse` keeps single-shot POSTs returning JSON.
      streamableHttp: {
        enableJsonResponse: true,
        sessionIdGenerator: () => randomUUID(),
        statelessMode: false,
      },
      transport: McpTransportType.STREAMABLE_HTTP,
      version: SERVER_VERSION,
    }),
    McpModule.forFeature([McpDeveloperMcpSurface], SERVER_NAME),
  ],
  providers: [McpDeveloperMcpSurface],
})
export class McpHttpRootModule {}

export async function runServerHttp(): Promise<void> {
  warnIfAuthTokenMissing();
  await preflightAuth();
  const port = resolvePort();
  const app = await NestFactory.create(McpHttpRootModule, {
    logger: ['error', 'warn', 'log'],
  });
  // Per-request identity: Authorization: Bearer <token> → request-scoped store,
  // so machine tools use the env ot_sa token and agent_conversation_* can use a
  // client-supplied human JWT. Registered before listen() so it wraps the routes.
  app.use(mcpHttpAuthMiddleware());
  await app.listen(port);
  console.error(
    `[openthrottle-mcp:http] STREAMABLE_HTTP listening on http://0.0.0.0:${port}/mcp (server: ${SERVER_NAME})`,
  );
}
