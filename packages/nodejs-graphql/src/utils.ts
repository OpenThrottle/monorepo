/**
 * @description Default per-request timeout (milliseconds) applied to the
 * underlying `fetch` when a caller does not pass an explicit `timeoutMs`.
 * Bounds a request so a stalled openthrottle-server connection cannot hold the
 * request open indefinitely.
 * @public
 */
export const DEFAULT_GRAPHQL_TIMEOUT_MS = 15_000;

/**
 * @description Marker prefix on the message of the `Error` thrown when a
 * request exceeds its timeout. Consumers match on this to classify the failure
 * as a distinct timeout kind rather than a generic network error.
 * @public
 */
export const GRAPHQL_TIMEOUT_ERROR_PREFIX =
  'openthrottle-server GraphQL request timed out';

/**
 * @description Build the `AbortSignal` enforcing the per-request timeout.
 * `0` or a negative value disables the timeout (no signal). Defaults to
 * {@link DEFAULT_GRAPHQL_TIMEOUT_MS} when `timeoutMs` is `undefined`. When a
 * caller-supplied `signal` is provided, the returned signal aborts when either
 * the timeout fires or the caller's signal aborts.
 */
export function buildTimeoutSignal(
  timeoutMs: number | undefined,
  callerSignal?: AbortSignal | undefined,
): AbortSignal | undefined {
  const ms = timeoutMs ?? DEFAULT_GRAPHQL_TIMEOUT_MS;
  const timeoutSignal = ms > 0 ? AbortSignal.timeout(ms) : undefined;

  if (timeoutSignal == null) {
    return callerSignal;
  }

  if (callerSignal == null) {
    return timeoutSignal;
  }

  return AbortSignal.any([callerSignal, timeoutSignal]);
}

/**
 * @description Wrap a thrown `fetch` rejection: when it is the abort raised by
 * our timeout signal (`TimeoutError`/`AbortError`), rethrow a recognizable
 * timeout `Error` (message prefixed with {@link GRAPHQL_TIMEOUT_ERROR_PREFIX});
 * otherwise rethrow the original error unchanged.
 */
export function rethrowAsTimeoutIfAborted(
  error: unknown,
  timeoutMs: number | undefined,
): never {
  const ms = timeoutMs ?? DEFAULT_GRAPHQL_TIMEOUT_MS;

  if (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  ) {
    // Preserve the original abort as the cause via Object.assign rather than
    // the ES2022 two-arg `Error(message, { cause })` constructor: this package
    // is consumed source-first by ES2020 targets (e.g. @tools/workflows), whose
    // lib lacks the es2022.error overload.
    throw Object.assign(
      new Error(`${GRAPHQL_TIMEOUT_ERROR_PREFIX} after ${ms}ms`),
      { cause: error },
    );
  }

  throw error;
}

/**
 * @description Base URL for openthrottle-server. Use in loaders/actions (server).
 * Reads `API_URL_INTERNAL` from the environment (base URL without a trailing
 * `/graphql`; this helper appends `/graphql`) and throws when it is unset.
 * @public
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
 * @description Read the bearer auth token for V1's `executeGraphqlV2` from the
 * environment. Returns the value of the `API_TOKEN` env var, or `undefined`
 * when it is unset (the request is then sent without an `Authorization`
 * header). Callers may override this by passing `options.token`.
 */
export function getGraphQLToken(): string | undefined {
  const token = process.env.API_TOKEN;

  return token;
}

/**
 * @description Recursively walks JSON and parses string values that look like ISO date-time into Date so loaders receive Date (codegen keeps DateTime → Date).
 *
 * The generic overload preserves the caller's type: the recursive Date-walk
 * rebuilds the value structurally but returns the same shape it was given (ISO
 * strings become `Date`), so callers on the trusted success path get their
 * `TData` back without an assertion. See the executors in `index.ts` /
 * `index-v2.ts` / `graphql-v2.ts`.
 * @public
 */
export function parseDateTimeInResponse<T>(value: T): T;
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
export function asGraphqlPayload<TData = unknown>(
  parsed: unknown,
): GraphqlPayload<TData> | null;
export function asGraphqlPayload(
  parsed: unknown,
): GraphqlPayload<unknown> | null {
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
}

/**
 * @description Read a `fetch` {@link Response} body as text, `JSON.parse` it in
 * a try/catch, and narrow the result via {@link asGraphqlPayload}. Throws a
 * meaningful `Error` (rather than an opaque `SyntaxError`) when the body is not
 * valid JSON or is JSON of an unexpected shape — e.g. a proxy 502 HTML page or
 * a gateway timeout. The `response`/`statusText` context is woven into the
 * thrown message so callers can surface it.
 */
export async function parseGraphqlResponseBody<TData = unknown>(
  response: Response,
): Promise<GraphqlPayload<TData>> {
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

  const payload = asGraphqlPayload<TData>(parsedJson);

  if (payload == null) {
    throw new Error(
      `openthrottle-server GraphQL response had unexpected shape ` +
        `(status ${response.status} ${response.statusText})`,
    );
  }

  return payload;
}
