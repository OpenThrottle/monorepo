/**
 * The total telemetry off switch (contract §7, layer 2): no post, no buffer
 * line, no start file. Distinct from `OPENTHROTTLE_TELEMETRY_OFFLINE`, which
 * still buffers locally.
 */
import { readUserEnvFile } from './env.ts';

/**
 * The key that turns capture off entirely, from `process.env` or
 * `~/.openthrottle/.env`.
 *
 * @public
 */
export const TELEMETRY_DISABLED_ENV_KEY = 'OPENTHROTTLE_SKILL_USAGE_DISABLED';

const isTruthy = (value: string | undefined): boolean => {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
};

/**
 * Is capture switched off? Every telemetry entrypoint (capture, complete,
 * outcome, drain and the coverage heartbeat, for every producer) calls this
 * first and returns when it is true. Guard and workflow hooks are not
 * telemetry and never call it. Fails open to "enabled" if the user file cannot
 * be read, since a broken file must not silence or break a hook.
 *
 * @public
 */
export const isTelemetryDisabled = (): boolean => {
  if (isTruthy(process.env[TELEMETRY_DISABLED_ENV_KEY])) {
    return true;
  }
  try {
    return isTruthy(readUserEnvFile()[TELEMETRY_DISABLED_ENV_KEY]);
  } catch {
    return false;
  }
};
