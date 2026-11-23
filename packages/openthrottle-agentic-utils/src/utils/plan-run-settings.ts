import type { PlanRunTuningSettings } from '../types/plan-run-settings.ts';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from '../types/workflow-config.ts';

/**
 * @description Normalizes legacy uppercase debug values (e.g. persisted `DEBUG` / `VERBOSE`)
 * to the canonical lowercase {@link WorkflowConfigDebug} union so argv and merge output stay consistent.
 * @public
 */
export const normalizeWorkflowConfigDebug = (
  debug: WorkflowConfigDebug | undefined,
): WorkflowConfigDebug | undefined => {
  if (debug === undefined) {
    return undefined;
  }

  const lowered = String(debug).toLowerCase();
  if (lowered === 'debug' || lowered === 'omit' || lowered === 'verbose') {
    return lowered;
  }

  return debug;
};

/**
 * @description Fills `driver` from the job's resolved driver when tuning omits it, so every consumer
 * resolves the same driver for the whole run.
 * @public
 */
export const mergePlanRunTuningWithDriver = (
  tuning: PlanRunTuningSettings | undefined,
  driver: WorkflowConfigRunner | undefined,
): PlanRunTuningSettings => {
  const base = tuning ?? {};

  const hasDriver = base.driver != null;
  const resolvedDriver = hasDriver ? base.driver : (driver ?? 'cursor');
  const debug = normalizeWorkflowConfigDebug(base.debug);

  return {
    ...base,
    driver: resolvedDriver,
    ...(debug !== undefined ? { debug } : {}),
  };
};
