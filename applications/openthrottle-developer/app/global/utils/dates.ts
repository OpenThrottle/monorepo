import type { FormatDateTimeOptions } from '~/global/types';

/** What an unparseable or missing date renders as. */
const NO_DATE = '—';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * @description The one place a date string becomes a `Date`. Accepts an ISO
 * timestamp or a `datetime-local` value (`2026-11-01T10:00`, read as the
 * viewer's wall-clock time). `null` when the value is missing, empty or
 * unparseable, so callers never hold an `Invalid Date`.
 */
export const parseDate = (value: string | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * @description Formats a date as `Oct 26, 2026, 1:23 AM`, plus the short zone
 * name (`… AM PDT`) when `withTimeZoneName` is set, so a time is unambiguous.
 *
 * Pass `timeZone` to pin a zone (a server render pins `UTC`, since the server
 * cannot know the viewer's zone); `undefined` uses the viewer's local zone. An
 * unparseable value renders as an em dash instead of throwing.
 */
export const formatDateTime = (
  value: Date | string,
  options: FormatDateTimeOptions,
): string => {
  const date = typeof value === 'string' ? parseDate(value) : value;

  if (date === null || Number.isNaN(date.getTime())) {
    return NO_DATE;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    timeZone: options.timeZone,
    timeZoneName: options.withTimeZoneName ? 'short' : undefined,
    year: 'numeric',
  }).format(date);
};

/**
 * @description The short name of a time zone at `date` (`PDT`, `UTC`). Pass
 * `timeZone` to pin a zone; `undefined` uses the viewer's local zone.
 */
export const formatTimeZoneName = (
  date: Date,
  timeZone: string | undefined,
): string =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? '';

/**
 * @description Formats a date as a `datetime-local` value in the viewer's zone
 * (`2026-11-01T10:00`), for an input's `value` and `min`.
 */
export const toDateTimeLocalValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * @description The `datetime-local` value for an ISO timestamp, or `''` when it
 * is missing or unparseable. Prefills a date-time picker.
 */
export const isoToDateTimeLocalValue = (
  iso: string | null | undefined,
): string => {
  const date = parseDate(iso);

  return date === null ? '' : toDateTimeLocalValue(date);
};

/**
 * @description Converts a `datetime-local` value (wall-clock time in the
 * viewer's zone) to a UTC ISO timestamp. `null` when the value is empty or
 * unparseable.
 */
export const localDateTimeToUtcIso = (local: string): string | null =>
  parseDate(local)?.toISOString() ?? null;
