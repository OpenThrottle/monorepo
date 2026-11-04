import { formatDistance } from 'date-fns';

import { formatDateTime, parseDate } from '~/global/utils/dates';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';

/** Past this distance from now a run time reads as an absolute local date, not "in 9 days". */
const RELATIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface FormatRunTimeOptions {
  /** True after hydration; before it the server cannot know the viewer's zone. */
  readonly hydrated: boolean;
  /** The instant "relative" is measured from; defaults to the current time. */
  readonly now: Date | undefined;
}

export interface FormatRunTimeResult {
  /** The value for `<time dateTime>`; null when the input is unparseable. */
  readonly iso: string | null;
  /** What the run row shows. */
  readonly label: string;
  /** Absolute UTC with the zone name, for the tooltip. */
  readonly utcLabel: string;
}

const formatWeekdayTime = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    weekday: 'short',
  }).format(date);

/**
 * @description Formats a plan-run timestamp. Before hydration it is absolute UTC with the zone
 * name, so the server HTML and the first client render match; after hydration it is relative
 * plus local time (`in about 2 hours · Mon 3:00 PM`, `12 minutes ago · Mon 1:00 PM`), or an
 * absolute local date once more than 7 days away. An unparseable value returns the copy fallback,
 * never "Invalid Date".
 */
export const formatRunTime = (
  value: string | null | undefined,
  options: FormatRunTimeOptions,
): FormatRunTimeResult => {
  const date = parseDate(value);

  if (date === null) {
    const unknown = PLAN_RUN_TRANSPARENCY_COPY.time.unknown;
    return { iso: null, label: unknown, utcLabel: unknown };
  }

  const utcLabel = formatDateTime(date, {
    timeZone: 'UTC',
    withTimeZoneName: true,
  });
  const iso = date.toISOString();

  if (!options.hydrated) {
    return { iso, label: utcLabel, utcLabel };
  }

  const now = options.now ?? new Date();

  if (Math.abs(date.getTime() - now.getTime()) > RELATIVE_WINDOW_MS) {
    const label = formatDateTime(date, {
      timeZone: undefined,
      withTimeZoneName: false,
    });
    return { iso, label, utcLabel };
  }

  const relative = formatDistance(date, now, { addSuffix: true });

  return { iso, label: `${relative} · ${formatWeekdayTime(date)}`, utcLabel };
};
