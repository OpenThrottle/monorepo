/**
 * @description Client-side fetch for getRootMetrics. Uses app API_URL so
 * polling works in the browser (executeGraphql uses process.env.API_URL).
 */

interface GraphqlResponse<T> {
  readonly data?: T;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
}

/**
 * @description GraphQL data envelope for the `serverMetrics` field. Callers pass
 * the shape of the metrics they queried as `T`.
 */
export interface ServerMetricsEnvelope<T> {
  readonly serverMetrics: T;
}

/**
 * @description Fetches server metrics from the GraphQL API. Safe to call from the client.
 * Returns the `{ serverMetrics: T }` data envelope; callers read `.serverMetrics`.
 */
export async function fetchServerMetrics<T>(
  url: string,
  query: string,
  token?: string,
): Promise<ServerMetricsEnvelope<T>> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    body: JSON.stringify({ query, variables: undefined }),
    headers,
    method: 'POST',
  });

  const json: GraphqlResponse<ServerMetricsEnvelope<T>> = await res.json();

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(`GraphQL error ${res.status}: ${message}`);
  }

  if (json.errors != null && json.errors.length > 0) {
    throw new Error(`GraphQL errors: ${json.errors[0]?.message ?? 'unknown'}`);
  }

  if (json.data == null || !('serverMetrics' in json.data)) {
    throw new Error('GraphQL response missing serverMetrics');
  }

  return json.data;
}
