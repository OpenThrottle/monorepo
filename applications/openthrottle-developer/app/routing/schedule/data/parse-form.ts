/**
 * @description Parses the ScheduleForm's FormData into the fields shared by create + update. The
 * server re-validates everything (cron, driver, capabilities, settings); this only shapes strings
 * into the GraphQL input. `undefined` fields are omitted so update can be a partial patch.
 */

import { SCHEDULE_REPOSITORY_NONE_VALUE } from './data.repositories';

export interface ParsedScheduleForm {
  cronPattern?: string;
  cwd?: string;
  driverId?: string;
  enabled?: boolean;
  model?: string;
  name?: string;
  prompt?: string;
  /**
   * Targeted checkout id, or null when the picker chose the workspace-root default. Null (not
   * undefined) so an update can CLEAR an existing target — undefined means "leave unchanged".
   */
  repositoryCheckoutId?: string | null;
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

export const parseScheduleForm = (form: FormData): ParsedScheduleForm => {
  const timeoutRaw = str(form, 'timeoutMs');
  const timeoutMs = timeoutRaw === undefined ? undefined : Number(timeoutRaw);
  const repositoryRaw = str(form, 'repositoryCheckoutId');

  return {
    cronPattern: str(form, 'cronPattern'),
    cwd: str(form, 'cwd'),
    driverId: str(form, 'driverId'),
    enabled: form.get('enabled') === 'true',
    model: str(form, 'model'),
    name: str(form, 'name'),
    prompt: str(form, 'prompt'),
    repositoryCheckoutId:
      repositoryRaw === undefined ||
      repositoryRaw === SCHEDULE_REPOSITORY_NONE_VALUE
        ? null
        : repositoryRaw,
    settingsJson: str(form, 'settingsJson'),
    timeoutMs:
      timeoutMs !== undefined && Number.isFinite(timeoutMs)
        ? timeoutMs
        : undefined,
    timezone: str(form, 'timezone'),
  };
};
