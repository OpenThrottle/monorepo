/**
 * @description App-wide singleton browser graphql-ws client for GraphQL
 * subscriptions in the admin app. Created lazily on first use in the browser
 * (null during SSR).
 *
 * The endpoint is derived from window.env.API_URL_EXTERNAL (cross-origin to the
 * admin app), and connectionParams fetches a fresh short-lived token from the
 * same-origin /auth/ws-token route on every (re)connect — so the durable
 * HttpOnly cookie never leaves the admin-app origin and reconnects
 * re-authenticate without a page reload. Mirrors the developer app's client.
 */
import {
  createGraphqlWsClient,
  type GraphqlWsClient,
} from '@openthrottle/react-router-graphql';
import { IS_BROWSER } from '@openthrottle/react-router-utils';

let cached: GraphqlWsClient | null = null;

/**
 * http(s)://host -> ws(s)://host/graphql
 */
function toWsUrl(httpUrl: string): string {
  return `${httpUrl.replace(/\/+$/, '').replace(/^http/, 'ws')}/graphql`;
}

/**
 * Fetch a short-lived ws token from the same-origin resource route (cookie auto-sent).
 */
async function fetchConnectionParams(): Promise<{ authToken: string }> {
  const urlSockets = '/auth/ws-token';
  const response = await fetch(urlSockets, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${urlSockets} responded ${response.status}`);
  }

  const body: { token: string } = await response.json();

  return { authToken: body.token };
}

/**
 * @description Get the shared graphql-ws client, or null during SSR / before
 * window.env is available. Subsequent calls return the same instance.
 */
export function getGraphqlWsClient(): GraphqlWsClient | null {
  if (!IS_BROWSER) return null;
  if (cached) return cached;

  const apiUrl = window.env?.API_URL_EXTERNAL;
  if (!apiUrl) return null;

  cached = createGraphqlWsClient({
    connectionParams: fetchConnectionParams,
    url: toWsUrl(apiUrl),
  });

  return cached;
}
