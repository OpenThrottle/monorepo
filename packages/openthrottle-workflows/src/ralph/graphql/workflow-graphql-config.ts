/**
 * @description Configuration for OpenThrottle GraphQL requests from workflow code (auth, optional endpoint override, extra headers).
 */
export interface WorkflowGraphqlConfig {
  /**
   * @description Extra headers merged after `Content-Type` and optional `Authorization` (e.g. tracing or feature flags).
   */
  readonly additionalHeaders?: Readonly<Record<string, string>>;
  /**
   * @description When set, POST to this URL instead of resolving `API_URL_INTERNAL` + `/graphql` inside `@openthrottle/nodejs-graphql`.
   */
  readonly graphqlUrl?: string | undefined;
  /**
   * @description Bearer token for OpenThrottle GraphQL. Omit for unauthenticated calls when the server allows them.
   */
  readonly token: string | undefined;
}
