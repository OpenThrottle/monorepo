/**
 * @description Per-request auth bridge for the streamable-HTTP MCP server. Reads
 * the client's `Authorization: Bearer <token>` and runs the rest of the request
 * inside {@link requestAuthTokenStorage} so {@link getAuthToken} prefers it over
 * the container's env `OPENTHROTTLE_MCP_AUTH_TOKEN`.
 *
 * This is what lets one running HTTP server serve BOTH identities:
 * - no/absent header → env `ot_sa_` service account (machine tools), and
 * - `Authorization: Bearer <human JWT>` → that user (required by the
 *   `agent_conversation_*` tools, which reject `ot_sa_` with 403).
 *
 * Because it uses AsyncLocalStorage (run per request), concurrent requests never
 * share a token — each request resolves its own header, isolated from the others.
 */
import type { IncomingMessage } from 'node:http';
import { requestAuthTokenStorage } from '../auth/get-auth-token.ts';

const BEARER_PREFIX = 'Bearer ';

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
 * @description Connect/Express-style middleware. When the request carries a
 * bearer token, runs `next()` within the request-scoped token store; otherwise
 * passes through unchanged (env token applies). Exported as a factory for easy
 * testing and to keep the runner free of ALS wiring detail.
 * @public
 */
export function mcpHttpAuthMiddleware(): (
  req: Pick<IncomingMessage, 'headers'>,
  _res: unknown,
  next: NextFn,
) => void {
  return (req, _res, next): void => {
    const token = extractBearerToken(req.headers['authorization']);
    if (token !== '') {
      requestAuthTokenStorage.run(token, next);
      return;
    }
    next();
  };
}
