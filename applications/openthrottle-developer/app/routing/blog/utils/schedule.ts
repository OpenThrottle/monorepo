import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';

/**
 * @description Converts a `datetime-local` value (`2026-11-01T10:00`, which is
 * wall-clock time in the viewer's zone) to a UTC ISO timestamp. `null` when the
 * value is empty or unparseable.
 */
export const localDateTimeToUtcIso = (local: string): string | null => {
  if (local === '') {
    return null;
  }

  const date = new Date(local);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * @description The inline error for a schedule input, or `null` when it is a
 * usable future time. A time that is not strictly after `now` (epoch ms) is
 * rejected, so a post can never be "scheduled" into the past.
 */
export const validateScheduleLocalDateTime = (
  local: string,
  now: number,
): string | null => {
  const iso = localDateTimeToUtcIso(local);

  if (iso === null) {
    return BLOG_LIFECYCLE_COPY.errors.required;
  }

  return Date.parse(iso) > now ? null : BLOG_LIFECYCLE_COPY.errors.past;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * @description Formats a date as a `datetime-local` value in the viewer's zone
 * (`2026-11-01T10:00`), for an input's `value` and `min`.
 */
export const toDateTimeLocalValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * @description The `datetime-local` value for a UTC ISO timestamp, or `''` when
 * it is missing or unparseable. Used to prefill the reschedule picker.
 */
export const isoToDateTimeLocalValue = (
  iso: string | null | undefined,
): string => {
  if (iso === null || iso === undefined) {
    return '';
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? '' : toDateTimeLocalValue(date);
};
