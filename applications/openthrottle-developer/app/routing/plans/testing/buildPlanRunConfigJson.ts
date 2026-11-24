/**
 * @description Test fixture: a plan's `runConfigJson` with the agent fields the Run
 * dialog reads (driver, model, effort) overridden. Built from the package's own
 * defaults so the JSON stays valid as the storage shape evolves; the stored
 * block that holds them is `run`.
 */
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';

export const buildPlanRunConfigJson = (
  agent: {
    readonly effort?: string;
    readonly driver?: 'claude' | 'cursor';
    readonly model?: string;
  } = {},
): string => {
  const stored = getDefaultPlanRunConfigStorage({ planId: 'plan-1' });

  return JSON.stringify({ ...stored, run: { ...stored.run, ...agent } });
};
