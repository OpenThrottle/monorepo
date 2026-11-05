/**
 * @description Pure helpers behind the Run dialog's Schedule tab: composing the
 * picked date + time into one instant in the browser's local zone, the client-side
 * mirror of the server's "future and within 30 days" rule, and the plain-language
 * echo ("fires 3:00 PM PST, in about 4 hours"). The server stays the real gate;
 * these only tell the user before they submit.
 *
 * Every function takes `now` (and the zone/locale where it formats) so a test can
 * pin the clock; the dialog passes the browser's.
 */
import { PLAN_RUN_SCHEDULE_MAX_DAYS } from '~/routing/plans/config/defaults';
import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
/** Lead the default instant keeps, so the dialog never opens on a past or imminent time. */
const DEFAULT_LEAD_MS = 30 * MS_PER_MINUTE;

export interface ScheduleFormatOptions {
  readonly locale?: string;
  readonly timeZone?: string;
}

/** @description `HH:mm` (24-hour, local) for a native time input. */
export const formatScheduleTime = (date: Date): string => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * @description The instant the Schedule tab opens on: the next whole hour at least 30
 * minutes away. Always in the future and well inside the 30-day cap.
 */
export const getDefaultScheduleInstant = (now: Date): Date => {
  const target = new Date(now.getTime() + DEFAULT_LEAD_MS);
  const next = new Date(target);
  next.setMinutes(0, 0, 0);

  if (next.getTime() < target.getTime()) {
    next.setHours(next.getHours() + 1);
  }

  return next;
};

/**
 * @description Joins a calendar date and an `HH:mm` time into one instant in the
 * browser's local zone. `undefined` when either part is missing or malformed.
 */
export const composeScheduleInstant = (
  date: Date | undefined,
  time: string,
): Date | undefined => {
  const match = TIME_PATTERN.exec(time);

  if (date === undefined || match === null) {
    return undefined;
  }

  const [, hours, minutes] = match;
  const instant = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours),
    Number(minutes),
  );

  return Number.isNaN(instant.getTime()) ? undefined : instant;
};

/**
 * @description The reason an instant cannot be scheduled, or `null` when it can:
 * missing/invalid, already past, or beyond {@link PLAN_RUN_SCHEDULE_MAX_DAYS}.
 */
export const getScheduleInstantError = (
  instant: Date | undefined,
  now: Date,
): string | null => {
  if (instant === undefined || Number.isNaN(instant.getTime())) {
    return PLAN_RUN_DIALOG_COPY.scheduleInvalid;
  }

  if (instant.getTime() <= now.getTime()) {
    return PLAN_RUN_DIALOG_COPY.schedulePast;
  }

  if (
    instant.getTime() - now.getTime() >
    PLAN_RUN_SCHEDULE_MAX_DAYS * MS_PER_DAY
  ) {
    return PLAN_RUN_DIALOG_COPY.scheduleTooFar(PLAN_RUN_SCHEDULE_MAX_DAYS);
  }

  return null;
};

/** @description "in about 4 hours" / "in about 3 days" / "in less than a minute". */
export const describeTimeUntil = (instant: Date, now: Date): string => {
  const ms = instant.getTime() - now.getTime();

  if (ms < MS_PER_MINUTE) {
    return PLAN_RUN_DIALOG_COPY.relativeInLessThanMinute;
  }

  if (ms < MS_PER_HOUR) {
    return PLAN_RUN_DIALOG_COPY.relativeIn(
      Math.round(ms / MS_PER_MINUTE),
      'minute',
    );
  }

  // Under two days the hour count is still the useful number ("in about 30 hours").
  if (ms < 2 * MS_PER_DAY) {
    return PLAN_RUN_DIALOG_COPY.relativeIn(
      Math.round(ms / MS_PER_HOUR),
      'hour',
    );
  }

  return PLAN_RUN_DIALOG_COPY.relativeIn(Math.round(ms / MS_PER_DAY), 'day');
};

/**
 * @description The echo under the pickers: the fire time with its zone abbreviation
 * (date added when it is not today), then how far away it is. Zone and locale
 * default to the browser's.
 */
export const describeScheduleInstant = (
  instant: Date,
  now: Date,
  options: ScheduleFormatOptions = {},
): string => {
  const { locale, timeZone } = options;
  const dayKey = (date: Date): string => {
    return date.toLocaleDateString(locale, { dateStyle: 'short', timeZone });
  };
  const sameDay = dayKey(instant) === dayKey(now);

  const when = instant.toLocaleString(locale, {
    day: sameDay ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: sameDay ? undefined : 'short',
    timeZone,
    timeZoneName: 'short',
    weekday: sameDay ? undefined : 'short',
  });

  return PLAN_RUN_DIALOG_COPY.scheduleSummary(
    when,
    describeTimeUntil(instant, now),
  );
};

/** @description The browser's IANA zone (`America/Los_Angeles`), or `UTC` if it cannot be read. */
export const getLocalTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

/**
 * @description A scheduled fire time for a toast: medium date plus short time in the browser's
 * zone. Locale and zone default to the browser's.
 */
export const formatScheduledInstant = (
  instant: Date | string,
  options: ScheduleFormatOptions = {},
): string => {
  return new Date(instant).toLocaleString(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone,
  });
};
