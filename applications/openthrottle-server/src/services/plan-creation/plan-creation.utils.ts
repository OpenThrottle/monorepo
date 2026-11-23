import type { UserPreferencesAgent } from '@openthrottle/nestjs-repositories-server';
import { isDriverId } from '@openthrottle/openthrottle-drivers';
import type { PlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';

/**
 * @description Stamps a user's default agent onto a new plan's run config. The driver,
 * model and effort replace the system defaults (`cursor` / `auto` / `''`); every other run
 * field is kept. A driver the drivers registry no longer knows leaves the config unchanged, so a
 * stale preference falls back to the system default rather than failing plan creation.
 */
export const applyDefaultAgentToRunConfig = (
  runConfig: PlanRunConfigStorage,
  agent: UserPreferencesAgent,
): PlanRunConfigStorage => {
  if (!isDriverId(agent.backend) || agent.model.trim() === '') {
    return runConfig;
  }

  return {
    ...runConfig,
    run: {
      ...runConfig.run,
      driver: agent.backend,
      effort: agent.effort ?? '',
      model: agent.model,
    },
  };
};

/** @description Canonical 8-4-4-4-12 hex UUID, any version. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @description The client-chosen id of an idempotent create, trimmed; undefined when none was sent.
 * @returns `{ ok: false }` when the id is not a UUID, so the caller can reject the input.
 */
export const readClientPlanId = (
  raw: string | null | undefined,
):
  | { readonly id: string | undefined; readonly ok: true }
  | { readonly ok: false } => {
  const id = raw?.trim() ?? '';

  if (id === '') {
    return { id: undefined, ok: true };
  }

  return UUID_PATTERN.test(id)
    ? { id: id.toLowerCase(), ok: true }
    : { ok: false };
};

/** @description True for a Postgres unique violation (SQLSTATE 23505), as TypeORM surfaces it. */
export const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code: unknown = Reflect.get(error, 'code');
  const driverError: unknown = Reflect.get(error, 'driverError');
  const hasDriverError =
    typeof driverError === 'object' && driverError !== null;
  const driverCode: unknown = hasDriverError
    ? Reflect.get(driverError, 'code')
    : undefined;

  return code === '23505' || driverCode === '23505';
};
