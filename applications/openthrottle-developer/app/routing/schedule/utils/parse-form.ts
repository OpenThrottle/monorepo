/**
 * @description Parses the ScheduleForm's FormData into the fields shared by create + update. The
 * server re-validates everything (cron, driver, capabilities, settings); this only shapes strings
 * into the GraphQL input. `undefined` fields are omitted so update can be a partial patch.
 */

import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { SCHEDULE_REPOSITORY_NONE_VALUE } from '~/routing/schedule/data/data.repositories';
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

const str = (form: FormData, key: string): string | undefined => {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/** A minutes field as whole milliseconds, or undefined when blank or not a number. */
const minutesAsMs = (form: FormData, key: string): number | undefined => {
  const raw = str(form, key);
  const minutes = raw === undefined ? Number.NaN : Number(raw);

  return Number.isFinite(minutes) ? Math.round(minutes * 60_000) : undefined;
};

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

export const parseScheduleForm = (form: FormData): ParsedScheduleForm => {
  const timeoutRaw = str(form, 'timeoutMs');
  const timeoutMs = timeoutRaw === undefined ? undefined : Number(timeoutRaw);
  const isTimeoutValid = timeoutMs !== undefined && Number.isFinite(timeoutMs);
  const repositoryRaw = str(form, 'repositoryCheckoutId');
  const isDefaultRepository =
    repositoryRaw === undefined ||
    repositoryRaw === SCHEDULE_REPOSITORY_NONE_VALUE;

  return {
    cronPattern: str(form, 'cronPattern'),
    cwd: str(form, 'cwd'),
    driverId: str(form, 'driverId'),
    enabled: form.get('enabled') === 'true',
    intervalMs: minutesAsMs(form, 'intervalMinutes'),
    misfirePolicy: str(form, 'misfirePolicy'),
    misfireThresholdMs: minutesAsMs(form, 'misfireThresholdMinutes'),
    model: str(form, 'model'),
    name: str(form, 'name'),
    prompt: str(form, 'prompt'),
    repositoryCheckoutId: isDefaultRepository ? null : repositoryRaw,
    runAt: str(form, 'runAt'),
    scheduleKind: str(form, 'scheduleKind'),
    settingsJson: str(form, 'settingsJson'),
    timeoutMs: isTimeoutValid ? timeoutMs : undefined,
    timezone: str(form, 'timezone'),
  };
};
