/**
 * @description Per-request auth bridge for the streamable-HTTP MCP server. Reads
 * the client's `Authorization: Bearer <token>` and runs the rest of the request
 * inside {@link requestAuthTokenStorage} so {@link getAuthToken} prefers it over
 * the container's env `OPENTHROTTLE_MCP_AUTH_TOKEN`.
 *
 * Two modes ({@link McpHttpAuthMode}):
 * - **internal** (compose network, `OT_MCP_PUBLIC_URL` unset): a request with no
 *   header runs as the env `ot_sa_` service account; a `Bearer <human JWT>` runs as
 *   that user (required by the `agent_conversation_*` tools, which reject `ot_sa_`).
 * - **public** (`OT_MCP_PUBLIC_URL` set): the server is an OAuth resource server. A
 *   request with no bearer is refused with 401 + `WWW-Authenticate` naming the
 *   Protected Resource Metadata, so it can never borrow the service account. The
 *   deprecated `OT_MCP_ALLOW_STATIC_TOKEN=true` restores the internal fallback.
 *
 * Because it uses AsyncLocalStorage (run per request), concurrent requests never
 * share a token — each request resolves its own header, isolated from the others.
 */
import type { IncomingMessage } from 'node:http';

import { requestAuthTokenStorage } from '../utils/getAuthToken.ts';
import type {
  McpHttpAuthMode,
  McpPublicAuthMode,
} from './protected-resource.ts';
import { buildUnauthorizedChallenge } from './protected-resource.ts';

const BEARER_PREFIX = 'Bearer ';
const WELL_KNOWN_PREFIX = '/.well-known/';
const DEPRECATION_WARNING_INTERVAL_MS = 60_000;

/**
 * @description Extracts a bearer token from an `Authorization` header value.
 * Returns '' when absent or not a Bearer scheme.
 */
export function extractBearerToken(authorization: string | undefined): string {
  if (typeof authorization !== 'string') {
    return '';
  }
  if (!authorization.startsWith(BEARER_PREFIX)) {
    return '';
  }
  return authorization.slice(BEARER_PREFIX.length).trim();
}

type NextFn = () => void;

/**
 * @description The slice of a Node `ServerResponse` the middleware writes to.
 * @public
 */
export interface McpHttpAuthResponse {
  end(body?: string): unknown;
  setHeader(name: string, value: string): unknown;
  statusCode: number;
}

/**
 * @description The slice of a Node `IncomingMessage` the middleware reads.
 * @public
 */
export type McpHttpAuthRequest = Pick<IncomingMessage, 'headers' | 'url'>;

/**
 * @description Options for {@link mcpHttpAuthMiddleware}. `warn` defaults to `console.error`.
 * @public
 */
export interface McpHttpAuthMiddlewareOptions {
  readonly mode: McpHttpAuthMode;
  readonly now: () => number;
  readonly warn: (message: string) => void;
}

const DEFAULT_OPTIONS: McpHttpAuthMiddlewareOptions = {
  mode: { kind: 'internal' },
  now: () => Date.now(),
  warn: (message) => console.error(message),
};

const writeUnauthorized = (
  res: McpHttpAuthResponse,
  mode: McpPublicAuthMode,
): void => {
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', buildUnauthorizedChallenge(mode));
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      error: 'invalid_request',
      error_description: `This MCP server requires OAuth. Authorize via the authorization server named in the resource metadata.`,
    }),
  );
};

/**
 * @description Connect/Express-style middleware. A bearer token always runs `next()`
 * within the request-scoped token store. With no bearer, the internal mode passes
 * through (env token applies) and the public mode answers 401 — except for the
 * `/.well-known/` discovery documents, which are always anonymous.
 * @public
 */
export function mcpHttpAuthMiddleware(
  options: Partial<McpHttpAuthMiddlewareOptions> = {},
): (req: McpHttpAuthRequest, res: McpHttpAuthResponse, next: NextFn) => void {
  const { mode, now, warn } = { ...DEFAULT_OPTIONS, ...options };
  let lastDeprecationWarningAt = Number.NEGATIVE_INFINITY;

  return (req, res, next): void => {
    const token = extractBearerToken(req.headers['authorization']);
    if (token !== '') {
      requestAuthTokenStorage.run(token, next);
      return;
    }

    if (mode.kind === 'internal') {
      next();
      return;
    }

    if ((req.url ?? '').startsWith(WELL_KNOWN_PREFIX)) {
      next();
      return;
    }

    if (!mode.allowStaticToken) {
      writeUnauthorized(res, mode);
      return;
    }

    const at = now();
    if (at - lastDeprecationWarningAt >= DEPRECATION_WARNING_INTERVAL_MS) {
      lastDeprecationWarningAt = at;
      warn(
        `[openthrottle-mcp:http] DEPRECATED: a request with no Authorization header ran as the OPENTHROTTLE_MCP_AUTH_TOKEN service account because OT_MCP_ALLOW_STATIC_TOKEN=true. Migrate the client to OAuth and unset the flag.`,
      );
    }
    next();
  };
}
