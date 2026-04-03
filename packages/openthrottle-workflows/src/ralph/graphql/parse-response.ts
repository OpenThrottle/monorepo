/**
 * @description Deserializes GraphQL DateTime strings to `Date`, matching `@openthrottle/nodejs-graphql` response parsing.
 */

/**
 * @description Matches ISO 8601 date-time strings (e.g. from GraphQL DateTime over the wire).
 */
export const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * @description Recursively walks JSON and parses string values that look like ISO date-time into Date.
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
