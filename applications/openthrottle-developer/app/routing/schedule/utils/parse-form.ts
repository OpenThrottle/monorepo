/**
 * @description The parsed shape of the ScheduleForm shared by create + update (produced by
 * `ScheduleFormSchema` via `parseFormData`), plus the per-kind timing check. The server
 * re-validates everything (cron, driver, capabilities, settings). `undefined` fields are omitted
 * so update can be a partial patch.
 */

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_KIND } from '~/routing/schedule/data/data.schedule-kind';

export interface ParsedScheduleForm {
  cronPattern?: string;
  cwd?: string;
  driverId?: string;
  enabled?: boolean;
  /** Converted from the form's minutes field; the server enforces its one-minute floor. */
  intervalMs?: number;
  misfirePolicy?: string;
  /** Converted from the form's minutes field; the server enforces its one-minute floor. */
  misfireThresholdMs?: number;
  model?: string;
  name?: string;
  prompt?: string;
  /**
   * Targeted checkout id, or null when the picker chose the workspace-root default. Null (not
   * undefined) so an update can CLEAR an existing target — undefined means "leave unchanged".
   */
  repositoryCheckoutId?: string | null;
  /** ISO 8601 with an offset, passed through as typed; the server parses and validates it. */
  runAt?: string;
  scheduleKind?: string;
  settingsJson?: string;
  timeoutMs?: number;
  timezone?: string;
}

/**
 * @description The required-field message for the "when" of the chosen schedule kind (cron by
 * default), or null when its field is filled in. The server still validates the value itself.
 */
export const missingScheduleTiming = (
  parsed: ParsedScheduleForm,
): string | null => {
  switch (parsed.scheduleKind ?? SCHEDULE_KIND.cron) {
    case SCHEDULE_KIND.interval:
      if (parsed.intervalMs === undefined) {
        return SCHEDULE_COPY.missingInterval;
      }
      return null;
    case SCHEDULE_KIND.once:
      return parsed.runAt === undefined ? SCHEDULE_COPY.missingRunAt : null;
    default:
      if (parsed.cronPattern === undefined) {
        return SCHEDULE_COPY.missingCronPattern;
      }
      return null;
  }
};
