/**
 * @description Schedule-kind choices for the schedule form. The values are the server's
 * `scheduleKind` strings; the server validates them and defaults to `cron`.
 */

export const SCHEDULE_KIND = {
  cron: 'cron',
  interval: 'interval',
  once: 'once',
} as const;

export type ScheduleKindKey = keyof typeof SCHEDULE_KIND;
export type ScheduleKindValue = (typeof SCHEDULE_KIND)[ScheduleKindKey];

export interface ScheduleKindOption {
  label: string;
  value: ScheduleKindValue;
}

export const SCHEDULE_KIND_OPTIONS: readonly ScheduleKindOption[] = [
  { label: `On a cron schedule`, value: SCHEDULE_KIND.cron },
  { label: `Every interval`, value: SCHEDULE_KIND.interval },
  { label: `Once`, value: SCHEDULE_KIND.once },
];

/** Interval shown when a schedule has none yet, in minutes. */
export const SCHEDULE_INTERVAL_DEFAULT_MINUTES = 60;
