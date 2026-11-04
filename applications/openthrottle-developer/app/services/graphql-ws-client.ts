/**
 * @description App-wide singleton browser graphql-ws client for GraphQL
 * subscriptions. Created lazily on first use in the browser (null during SSR).
 *
 * The endpoint is derived from window.env.API_URL_EXTERNAL: either an absolute
 * second origin, or a path on the page's own origin (`/api`, proxied to the
 * server) that resolves against window.location — so the same build reaches
 * the API from localhost, a tailnet name, or the deployed domain.
 * connectionParams fetches a fresh short-lived token from the same-origin
 * /auth/ws-token route on every (re)connect — so the durable HttpOnly cookie
 * never leaves the dev-app origin and reconnects re-authenticate without a
 * page reload.
 */
import {
  createGraphqlWsClient,
  type GraphqlWsClient,
} from '@openthrottle/react-router-graphql';
import { IS_BROWSER, toGraphqlWsUrl } from '@openthrottle/react-router-utils';

let cached: GraphqlWsClient | null = null;

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

  const url = toGraphqlWsUrl(apiUrl, window.location.origin);
  if (!url) return null;

  cached = createGraphqlWsClient({
    connectionParams: fetchConnectionParams,
    url,
  });

  return cached;
}
