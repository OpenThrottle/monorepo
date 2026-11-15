import type { BackgroundActivityObject } from '@openthrottle/openthrottle-developer-codegen';

import { GLOBAL_BACKGROUND_ACTIVITY_COPY } from '../data/data.copy';

/**
 * @public
 * @description The fields the sidebar footer reads from each background
 * activity (OT plan 5767e798) — the selection a consuming app makes from the
 * `backgroundActivities` query.
 */
export type GlobalBackgroundActivity = Pick<
  BackgroundActivityObject,
  'done' | 'etaSeconds' | 'id' | 'label' | 'startedAt' | 'status' | 'total'
>;

/** @description Several activities folded into the one bar. */
export interface BackgroundActivitySummary {
  readonly done: number;
  /** 0–100; null when any activity's size is unknown (an indeterminate bar). */
  readonly percent: number | null;
  readonly total: number | null;
}

/**
 * @description Sums done and total across activities. One activity with an
 * unknown total makes the whole bar indeterminate: a percentage of a partly
 * unknown sum would claim more than the server knows.
 */
export const summarizeBackgroundActivities = (
  activities: readonly GlobalBackgroundActivity[],
): BackgroundActivitySummary => {
  let done = 0;
  let total: number | null = 0;

  for (const activity of activities) {
    done += activity.done;

    if (total !== null) {
      total = activity.total == null ? null : total + activity.total;
    }
  }

  if (total === null || total <= 0) {
    return { done, percent: null, total };
  }

  const percent = Math.min(100, Math.max(0, Math.round((done / total) * 100)));

  return { done, percent, total };
};

/**
 * @description A compact duration: `45s`, `12m`, `1h 5m`, `2d 3h`. Negative
 * input reads as 0.
 */
export const formatShortDuration = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));

  if (whole < 60) {
    return `${whole}s`;
  }

  const minutes = Math.floor(whole / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    const rest = minutes % 60;

    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;

  return restHours === 0 ? `${days}d` : `${days}d ${restHours}h`;
};

/**
 * @description Seconds from a serialized `DateTime` to `now`; null when the
 * value does not parse.
 */
export const secondsSince = (
  startedAt: unknown,
  now: number,
): number | null => {
  const at = Date.parse(String(startedAt));

  return Number.isNaN(at) ? null : (now - at) / 1000;
};

const formatCount = (value: number): string => {
  return value.toLocaleString('en-US');
};

/** @description One tooltip row: the label and its detail line. */
export interface BackgroundActivityLine {
  readonly detail: string;
  readonly id: string;
  readonly label: string;
}

/**
 * @description The tooltip row for one activity:
 * `{done} / {total} · started {elapsed} ago · ~{eta} left`. The last part says
 * `stalled` when progress stopped and `estimating` until the server has an ETA.
 */
export const describeBackgroundActivity = (
  activity: GlobalBackgroundActivity,
  now: number,
): BackgroundActivityLine => {
  const copy = GLOBAL_BACKGROUND_ACTIVITY_COPY;
  const parts: string[] = [];

  if (activity.total == null) {
    parts.push(formatCount(activity.done));
  } else {
    parts.push(
      `${formatCount(activity.done)} / ${formatCount(activity.total)}`,
    );
  }

  const elapsed = secondsSince(activity.startedAt, now);

  if (elapsed !== null) {
    parts.push(`${copy.started} ${formatShortDuration(elapsed)} ${copy.ago}`);
  }

  if (activity.status === 'stalled') {
    parts.push(copy.stalled);
  } else if (activity.etaSeconds == null) {
    parts.push(copy.estimating);
  } else {
    parts.push(`~${formatShortDuration(activity.etaSeconds)} ${copy.left}`);
  }

  return {
    detail: parts.join(copy.separator),
    id: activity.id,
    label: activity.label,
  };
};
