/**
 * @description Browser-side graphql-ws client for GraphQL subscriptions. This is
 * the live-delta transport that complements the loader's executeGraphqlWithAuth
 * snapshot path (which stays server-only and untouched).
 *
 * SSR-safe: createGraphqlWsClient returns null off the browser, so importing this
 * from a route module never opens a socket during server rendering. The native
 * browser WebSocket is used (no webSocketImpl needed client-side).
 */
import { type Client, type ClientOptions, createClient } from 'graphql-ws';
import { IS_BROWSER } from '@openthrottle/react-router-utils';

/**
 * Browser graphql-ws client handle (null during SSR).
 */
export type GraphqlWsClient = Client;

/**
 * Connection params (or async provider) sent on every (re)connect.
 */
export type GraphqlWsConnectionParams = ClientOptions['connectionParams'];

/**
 * Options for {@link createGraphqlWsClient}.
 */
export interface CreateGraphqlWsClientOptions {
  /**
   * connectionParams sent on every (re)connect. Pass an async function that
   * fetches a fresh short-lived token so reconnects re-authenticate without a
   * page reload (the token only guards the handshake; identity is then pinned
   * on the connection for its lifetime).
   */
  readonly connectionParams?: GraphqlWsConnectionParams;
  /** Defaults to true: connect on first subscribe, disconnect when none remain. */
  readonly lazy?: boolean;
  /** Absolute ws(s):// GraphQL endpoint (typically API_URL_EXTERNAL with ws scheme). */
  readonly url: string;
}

/**
 * @description Create the browser graphql-ws client, or null during SSR. Lazy by
 * default so no socket opens until the first subscription. Callers should create
 * one client per app and share it (e.g. via a module singleton or React context).
 */
export function createGraphqlWsClient(
  options: CreateGraphqlWsClientOptions,
): GraphqlWsClient | null {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!IS_BROWSER) return null;

  return createClient({
    connectionParams: options.connectionParams,
    lazy: options.lazy ?? true,
    url: options.url,
  });
}
