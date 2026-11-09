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
