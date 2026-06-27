/**
 * Use the ambient global `Temporal` (installed + typed by temporal-polyfill/global)
 * rather than the module export, so these helpers' Temporal instances are the
 * exact same types Schedule-X consumes — a module-vs-global Temporal split makes
 * the two structurally non-assignable. This side-effect import also guarantees
 * the runtime global is installed wherever the helpers are used.
 */
import 'temporal-polyfill/global';

/**
 * Schedule-X v4 models event start/end as `Temporal.ZonedDateTime` (timed) or
 * `Temporal.PlainDate` (all-day). These helpers bridge between that engine shape
 * and the engine-agnostic `Date | string` (ISO 8601) used by CalendarEvent, and
 * are otherwise pure functions.
 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toEpochMilliseconds(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * `epochMilliseconds` exists only on ZonedDateTime; this structural check is
 * robust across distinct Temporal class identities (named import vs global).
 */
function isZonedDateTime(
  value: Temporal.PlainDate | Temporal.ZonedDateTime,
): value is Temporal.ZonedDateTime {
  return 'epochMilliseconds' in value;
}

/**
 * The system's IANA timezone id (e.g. `America/Los_Angeles`), used as the
 * default zone when converting wall-clock-free `Date`/ISO values to Temporal.
 *
 * @publicApi
 */
export function systemTimeZone(): string {
  return Temporal.Now.timeZoneId();
}

/**
 * Convert a `Date` or ISO 8601 string to a `Temporal.ZonedDateTime` in the given
 * timezone (defaults to the system zone). Use for timed events.
 *
 * @publicApi
 */
export function toZonedDateTime(
  value: Date | string,
  timeZone: string = systemTimeZone(),
): Temporal.ZonedDateTime {
  return Temporal.Instant.fromEpochMilliseconds(
    toEpochMilliseconds(value),
  ).toZonedDateTimeISO(timeZone);
}

/**
 * Convert a `Date` or ISO 8601 string to a `Temporal.PlainDate` (calendar date,
 * no time). A date-only string (`YYYY-MM-DD`) is taken verbatim; any other value
 * uses its **host-local** calendar date (`getFullYear/getMonth/getDate`). Use for
 * all-day events.
 *
 * Prefer a `YYYY-MM-DD` string for all-day values: it is unambiguous and
 * host-timezone-independent. A `Date` (or instant-bearing string) near midnight
 * resolves to a different calendar day depending on the host `TZ` — e.g. the
 * instant `2026-06-15T23:30:00Z` is June 15 in UTC but June 16 in `Asia/Tokyo` —
 * so the all-day day can differ from the instant-based timed path
 * ({@link temporalToISOString}). This is by design (an all-day date has no zone),
 * but the only way to pin a specific calendar day is to pass the date-only string.
 *
 * @publicApi
 */
export function toPlainDate(value: Date | string): Temporal.PlainDate {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    return Temporal.PlainDate.from(value);
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Temporal.PlainDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

/**
 * Convert a `Temporal.ZonedDateTime` or `Temporal.PlainDate` to a JS `Date`.
 * A ZonedDateTime maps to its exact instant; a PlainDate maps to local midnight.
 *
 * @publicApi
 */
export function temporalToDate(
  value: Temporal.PlainDate | Temporal.ZonedDateTime,
): Date {
  if (isZonedDateTime(value)) {
    return new Date(value.epochMilliseconds);
  }

  return new Date(value.year, value.month - 1, value.day);
}

/**
 * Convert a `Temporal.ZonedDateTime` (as a UTC instant) or `Temporal.PlainDate`
 * (as `YYYY-MM-DD`) to an ISO 8601 string.
 *
 * @publicApi
 */
export function temporalToISOString(
  value: Temporal.PlainDate | Temporal.ZonedDateTime,
): string {
  if (isZonedDateTime(value)) {
    return value.toInstant().toString();
  }

  return value.toString();
}
