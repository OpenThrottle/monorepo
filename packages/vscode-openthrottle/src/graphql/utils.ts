/**
 * @description Helpers for parsing GraphQL JSON responses in the extension client.
 */

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * @description Structural check that a parsed JSON value is a GraphQL response
 * envelope. `data` is trusted to be `T` (the server's typed payload for the
 * operation); this asserts only that the value is an object, narrowing the
 * `unknown` returned by `Response.json()` without a type assertion.
 */
export function isGraphqlEnvelope<T>(value: unknown): value is {
  readonly data?: T;
  readonly errors?: ReadonlyArray<{ readonly message: string }>;
} {
  return typeof value === 'object' && value !== null;
}

/**
 * @description Recursively walks JSON and parses string values that look like ISO
 * date-time into Date. The generic overload preserves the caller's type: the reviver
 * returns the same shape it was given (ISO strings become `Date`), so consumers get
 * their `TData` back without an assertion.
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
