import type {
  PlanRunConfigStorage,
  UserPreferencesAgent,
} from '@openthrottle/nestjs-repositories';
import { isDriverId } from '@openthrottle/openthrottle-drivers';

/**
 * @description Stamps a user's default agent onto a new plan's Ralph run config. The backend,
 * model and effort replace the system defaults (`cursor` / `auto` / `''`); every other Ralph
 * field is kept. A backend the drivers registry no longer knows leaves the config unchanged, so a
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
    ralph: {
      ...runConfig.ralph,
      effort: agent.effort ?? '',
      executionBackend: agent.backend,
      model: agent.model,
    },
  };
};
