/**
 * @description The user's default agent as the Run dialog seeds it (D3). A plan's
 * own run-config agent wins; only a plan still on the system default
 * runner (`cursor` / `auto` / no effort) opens on the preference instead.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';

import type { ComposerDefaultAgent } from '~/routing/home/utils/seedComposerDefaultAgent';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import {
  DEFAULT_RUN_DRIVER,
  DEFAULT_RUN_MODEL,
} from '~/routing/plans/utils/plan-run-options';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';
import { resolveDefaultAgent } from '~/routing/settings/utils/user-preferences';

type PlanRunAgentFields = Pick<PlanRunOptions, 'effort' | 'driver' | 'model'>;

/**
 * @description The stored default agent narrowed to one a plan can run right now
 * (a plan runner, offered in `models`, effort reconciled), or `null` when it is
 * unset or no longer valid — an invalid preference is ignored, never deleted.
 */
export const resolvePlanRunDefaultAgent = (
  stored: ComposerDefaultAgent | null,
  models: readonly ChatModelOption[],
): DefaultAgentDraft | null => {
  const resolved = resolveDefaultAgent(stored, models);

  return resolved.kind === 'valid' ? resolved.draft : null;
};

/**
 * @description Whether the plan's agent is still the system default, i.e.
 * nobody chose one for it. A plan has no "explicitly set" flag, so an agent that
 * matches the system default is read as unset; one deliberately set to exactly
 * `cursor` / `auto` / no effort is indistinguishable and also takes the preference.
 */
export const isPlanRunAgentUnset = (agent: PlanRunAgentFields): boolean => {
  const model = agent.model.trim();
  const isDefaultModel = model === '' || model === DEFAULT_RUN_MODEL;

  return (
    agent.driver === DEFAULT_RUN_DRIVER &&
    isDefaultModel &&
    agent.effort.trim() === ''
  );
};

/**
 * @description The plan's run options with the default agent's driver, model and
 * effort stamped in — only when the plan's own agent is unset
 * ({@link isPlanRunAgentUnset}); an explicit per-plan choice is returned as-is.
 */
export const seedPlanRunAgent = <TOptions extends PlanRunAgentFields>(
  options: TOptions,
  defaultAgent: DefaultAgentDraft | null,
): TOptions => {
  if (defaultAgent === null || !isPlanRunAgentUnset(options)) {
    return options;
  }

  return {
    ...options,
    driver: defaultAgent.driver,
    effort: defaultAgent.effort,
    model: defaultAgent.model,
  };
};
