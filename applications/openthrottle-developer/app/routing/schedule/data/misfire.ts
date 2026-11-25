/**
 * @description Misfire-policy choices for the schedule form. The values are the server's
 * `misfirePolicy` strings; the server validates them and owns the default (`skip`, 10 minutes).
 */

export interface ScheduleMisfirePolicyOption {
  label: string;
  value: string;
}

/** Policy used when a schedule has none yet (create), matching the server's column default. */
export const SCHEDULE_MISFIRE_DEFAULT_POLICY = 'skip';

/** Grace period shown when a schedule has none yet, in minutes (the server default is 10). */
export const SCHEDULE_MISFIRE_DEFAULT_THRESHOLD_MINUTES = 10;

export const SCHEDULE_MISFIRE_POLICY_OPTIONS: readonly ScheduleMisfirePolicyOption[] =
  [
    { label: `Skip them`, value: 'skip' },
    { label: `Run the latest one once`, value: 'catch_up_once' },
  ];
