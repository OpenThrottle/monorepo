/**
 * @description Client-side fetch for getRootMetrics. Uses app API_URL so
 * polling works in the browser (executeGraphql uses process.env.API_URL).
 */

interface GraphqlResponse<T> {
  readonly data?: T;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
}

/**
 * @description Fetches server metrics from the GraphQL API. Safe to call from the client.
 */
export async function fetchServerMetrics<T>(
  url: string,
  query: string,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    body: JSON.stringify({ query, variables: undefined }),
    headers,
    method: 'POST',
  });

  // FIXME: Tighten this up
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as GraphqlResponse<T>;

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(`GraphQL error ${res.status}: ${message}`);
  }

  if (json.errors != null && json.errors.length > 0) {
    throw new Error(`GraphQL errors: ${json.errors[0]?.message ?? 'unknown'}`);
  }

  if (json.data == null) {
    throw new Error('GraphQL response missing data');
  }

  return json.data;
}
