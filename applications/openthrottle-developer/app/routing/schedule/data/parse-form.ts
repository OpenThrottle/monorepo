/**
 * @description Parses the ScheduledJobForm's FormData into the fields shared by create + update. The
 * server re-validates everything (cron, driver, capabilities, settings); this only shapes strings
 * into the GraphQL input. `undefined` fields are omitted so update can be a partial patch.
 */

export interface ParsedScheduledJobForm {
  cronPattern?: string;
  cwd?: string;
  driverId?: string;
  enabled?: boolean;
  model?: string;
  name?: string;
  prompt?: string;
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

export const parseScheduledJobForm = (
  form: FormData,
): ParsedScheduledJobForm => {
  const timeoutRaw = str(form, 'timeoutMs');
  const timeoutMs = timeoutRaw === undefined ? undefined : Number(timeoutRaw);

  return {
    cronPattern: str(form, 'cronPattern'),
    cwd: str(form, 'cwd'),
    driverId: str(form, 'driverId'),
    enabled: form.get('enabled') === 'true',
    model: str(form, 'model'),
    name: str(form, 'name'),
    prompt: str(form, 'prompt'),
    settingsJson: str(form, 'settingsJson'),
    timeoutMs:
      timeoutMs !== undefined && Number.isFinite(timeoutMs)
        ? timeoutMs
        : undefined,
    timezone: str(form, 'timezone'),
  };
};
