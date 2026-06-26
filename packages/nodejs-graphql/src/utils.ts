/**
 * @description Base URL for openthrottle-server. Use in loaders/actions (server).
 * PRs and other data are fetched via GraphQL (graphql-client.ts).
 */
export function getGraphQLUrl(): string {
  const url = process.env.API_URL_INTERNAL;

  if (!url) {
    throw new Error('API_URL_INTERNAL is not set');
  }

  const cleaned = url.replace(/\/$/, '');

  return `${cleaned}/graphql`;
}

/**
 * @description ...
 */
export function getGraphQLToken(): string | undefined {
  const token = process.env.API_TOKEN;

  return token;
}

/**
 * @description Recursively walks JSON and parses string values that look like ISO date-time into Date so loaders receive Date (codegen keeps DateTime → Date).
 */
export function parseDateTimeInResponse(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' && ISO_DATE_TIME.test(value)) {
    return new Date(value);
  }

  if (Array.isArray(value)) {
    return value.map(parseDateTimeInResponse);
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value)) {
      out[k] = parseDateTimeInResponse(v);
    }

    return out;
  }

  return value;
}

/**
 * @description Matches ISO 8601 date-time strings (e.g. from GraphQL
 * DateTime over the wire).
 */
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * @description Single GraphQL error object from a response body.
 */
export interface GraphqlErrorItem {
  readonly message: string;
  readonly path?: ReadonlyArray<string | number>;
}

/**
 * @description Wire-level GraphQL response body, narrowed from arbitrary JSON.
 */
export interface GraphqlPayload<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<GraphqlErrorItem>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isGraphqlPathSegment = (p: unknown): p is string | number =>
  typeof p === 'string' || typeof p === 'number';

/**
 * @description Narrow arbitrary JSON to a {@link GraphqlPayload} when its shape
 * matches (`data` and/or a well-formed `errors` array). Returns `null` when the
 * value is not an object (e.g. a string error page, an array, or a bare scalar)
 * so callers can reject it instead of silently trusting an `as` cast.
 */
export const asGraphqlPayload = (
  parsed: unknown,
): GraphqlPayload<unknown> | null => {
  if (!isRecord(parsed)) {
    return null;
  }

  const data = 'data' in parsed ? parsed.data : undefined;
  const errorsRaw = 'errors' in parsed ? parsed.errors : undefined;
  let errors: ReadonlyArray<GraphqlErrorItem> | undefined;

  if (Array.isArray(errorsRaw)) {
    const items: GraphqlErrorItem[] = [];

    for (const item of errorsRaw) {
      if (!isRecord(item) || typeof item.message !== 'string') {
        continue;
      }

      const pathRaw = item.path;
      let path: ReadonlyArray<string | number> | undefined;

      if (Array.isArray(pathRaw) && pathRaw.every(isGraphqlPathSegment)) {
        path = pathRaw;
      }

      items.push(
        path !== undefined
          ? { message: item.message, path }
          : { message: item.message },
      );
    }

    errors = items.length > 0 ? items : undefined;
  }

  return { data, errors };
};

/**
 * @description Read a `fetch` {@link Response} body as text, `JSON.parse` it in
 * a try/catch, and narrow the result via {@link asGraphqlPayload}. Throws a
 * meaningful `Error` (rather than an opaque `SyntaxError`) when the body is not
 * valid JSON or is JSON of an unexpected shape — e.g. a proxy 502 HTML page or
 * a gateway timeout. The `response`/`statusText` context is woven into the
 * thrown message so callers can surface it.
 */
export async function parseGraphqlResponseBody(
  response: Response,
): Promise<GraphqlPayload<unknown>> {
  const rawBody = await response.text();

  let parsedJson: unknown;

  try {
    parsedJson = rawBody === '' ? null : JSON.parse(rawBody);
  } catch {
    throw new Error(
      `openthrottle-server GraphQL response was not valid JSON ` +
        `(status ${response.status} ${response.statusText})`,
    );
  }

  const payload = asGraphqlPayload(parsedJson);

  if (payload == null) {
    throw new Error(
      `openthrottle-server GraphQL response had unexpected shape ` +
        `(status ${response.status} ${response.statusText})`,
    );
  }

  return payload;
}
