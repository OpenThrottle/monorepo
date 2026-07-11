/**
 * @description Connection-time authentication for the graphql-ws transport.
 *
 * Identity is established ONCE, at the WebSocket handshake (`connection_init` ->
 * `onConnect`), from a token the client supplies in `connectionParams`. The
 * verified user id is stashed on the connection's `extra` and read back into the
 * GraphQL execution context for every subscription operation on that socket —
 * resolvers read identity from context only, never from a subscription variable.
 *
 * The token is the same HS256 JWT the HTTP path uses (signed with `JWT_SECRET`,
 * optional `JWT_ISSUER`, `sub` = user id), so the browser sends a short-lived,
 * same-secret token minted server-side; see the plan's auth decision.
 */
import jwt from 'jsonwebtoken';

const isMutableRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * connectionParams key the browser client puts the ws token under.
 *
 * @public
 */
export const GRAPHQL_WS_AUTH_TOKEN_PARAM = 'authToken';

/**
 * Options for {@link verifyConnectionToken} / {@link createGraphqlWsOnConnect}.
 *
 * @public
 */
export interface GraphqlWsAuthOptions {
  /** Expected `iss` claim. Defaults to `process.env.JWT_ISSUER` (optional). */
  readonly jwtIssuer?: string;
  /** HS256 secret. Defaults to `process.env.JWT_SECRET`. */
  readonly jwtSecret?: string;
  /**
   * When true (default), a connection with no token is rejected. Set false to
   * allow anonymous connections (resolvers then see `userId === undefined`).
   */
  readonly required?: boolean;
}

/**
 * @description Minimal structural shape of a graphql-ws connection context we
 * depend on — a supertype of graphql-ws's `Context`, so it is assignable both
 * ways without coupling to that type. `extra` is opaque (graphql-ws owns it; we
 * narrow before reading/writing `userId`).
 *
 * @public
 */
export interface GraphqlWsConnectionContext {
  readonly connectionParams?: Readonly<Record<string, unknown>>;
  /** graphql-ws stashes per-connection transport state here; we attach `userId`. */
  readonly extra?: unknown;
}

/**
 * @description Pull the bearer token out of connectionParams. Accepts either
 * `authToken` (preferred) or an `Authorization: Bearer <t>` style param
 * (case-insensitive), so non-browser clients can reuse their HTTP header value.
 *
 * @public
 */
export function extractConnectionToken(
  connectionParams: Readonly<Record<string, unknown>> | undefined,
): string | null {
  if (!connectionParams) return null;

  const direct = connectionParams[GRAPHQL_WS_AUTH_TOKEN_PARAM];
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const authHeader =
    connectionParams['Authorization'] ?? connectionParams['authorization'];

  if (typeof authHeader === 'string' && authHeader.length > 0) {
    return authHeader.replace(/^Bearer\s+/i, '');
  }

  return null;
}

/**
 * @description Verify the HS256 JWT and return its `sub` as the user id. Throws
 * if the secret is missing or the token is invalid/expired — callers decide how
 * to surface that (the onConnect handler rejects the connection).
 *
 * @public
 */
export function verifyConnectionToken(
  token: string,
  options: GraphqlWsAuthOptions = {},
): string {
  const secret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'graphql-ws auth: JWT_SECRET (or options.jwtSecret) is required to verify connection tokens',
    );
  }

  const issuer = options.jwtIssuer ?? process.env.JWT_ISSUER;
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    ...(issuer ? { issuer } : {}),
  });

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('graphql-ws auth: token payload is missing a string "sub"');
  }

  return payload.sub;
}

/**
 * @description Build the graphql-ws `onConnect` handler. Validates the token from
 * connectionParams, stashes the resolved `userId` on `ctx.extra`, and returns a
 * boolean (false closes the socket with 4403 Forbidden). An invalid token is
 * always rejected; a missing token is rejected only when `required` (default).
 *
 * @public
 */
export function createGraphqlWsOnConnect(
  options: GraphqlWsAuthOptions = {},
): (ctx: GraphqlWsConnectionContext) => boolean {
  const required = options.required ?? true;

  return (ctx: GraphqlWsConnectionContext): boolean => {
    const token = extractConnectionToken(ctx.connectionParams);

    if (!token) {
      if (required) return false;
      return true;
    }

    let userId: string;
    try {
      userId = verifyConnectionToken(token, options);
    } catch {
      return false;
    }

    // graphql-ws owns `extra` (a mutable object set on the socket before
    // onConnect runs); narrow it and stash identity for the shared `context`
    // callback to read back via resolveGraphqlWsUserId.
    if (isMutableRecord(ctx.extra)) {
      ctx.extra['userId'] = userId;
    }

    return true;
  };
}

/**
 * @description Read the connection identity back out of a graphql-ws context.
 * The shared GraphQL `context` callback uses this to surface `userId` for ws
 * operations (HTTP requests carry identity on `req` instead).
 *
 * @public
 */
export function resolveGraphqlWsUserId(
  ctx: GraphqlWsConnectionContext | undefined,
): string | undefined {
  const extra = ctx?.extra;
  if (typeof extra === 'object' && extra !== null && 'userId' in extra) {
    const userId = extra.userId;
    return typeof userId === 'string' ? userId : undefined;
  }
  return undefined;
}

/**
 * @description True when `value` looks like a graphql-ws connection context
 * (carries `extra` and a `connectionParams` key), as opposed to an HTTP
 * `{ req }` context. Used to branch the shared GraphQL `context` callback.
 *
 * @public
 */
export function isGraphqlWsContext(
  value: unknown,
): value is GraphqlWsConnectionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'extra' in value &&
    'connectionParams' in value
  );
}
