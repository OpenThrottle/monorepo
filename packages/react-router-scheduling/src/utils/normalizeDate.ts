/**
 * Coerce an optional `Date | string` to a `Date` (today when omitted).
 */
export function normalizeDate(value: Date | string | undefined): Date {
  if (value === undefined) {
    return new Date();
  }
  return value instanceof Date ? value : new Date(value);
}
