/**
 * @description Test fixture: a plan's `runConfigJson` with the ralph fields the Run
 * dialog reads (backend, model, effort, iterations) overridden. Built from the
 * package's own defaults so the JSON stays valid as the storage shape evolves.
 */
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';

export const buildPlanRunConfigJson = (
  ralph: {
    readonly effort?: string;
    readonly executionBackend?: 'claude' | 'cursor';
    readonly iterations?: number;
    readonly model?: string;
  } = {},
): string => {
  const stored = getDefaultPlanRunConfigStorage({ planId: 'plan-1' });

  return JSON.stringify({ ...stored, ralph: { ...stored.ralph, ...ralph } });
};
