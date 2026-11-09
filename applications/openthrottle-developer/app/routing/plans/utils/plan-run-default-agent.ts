/**
 * @description The user's default agent as the Run dialog seeds it (D3). A plan's
 * own `runConfigJson.ralph` agent wins; only a plan still on the system default
 * runner (`cursor` / `auto` / no effort) opens on the preference instead.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';

import type { ComposerDefaultAgent } from '~/routing/home/utils/seed-composer-default-agent';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/workflow-ralph-config';
import {
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_RUNNER,
} from '~/routing/plans/utils/workflow-ralph-config';
import type { DefaultAgentDraft } from '~/routing/settings/utils/user-preferences';
import { resolveDefaultAgent } from '~/routing/settings/utils/user-preferences';

type PlanRunAgentFields = Pick<
  WorkflowRalphRunOptionsInput,
  'effort' | 'executionBackend' | 'model'
>;

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
 * @description Whether the plan's Ralph agent is still the system default, i.e.
 * nobody chose one for it. A plan has no "explicitly set" flag, so an agent that
 * matches the system default is read as unset; one deliberately set to exactly
 * `cursor` / `auto` / no effort is indistinguishable and also takes the preference.
 */
export const isPlanRunAgentUnset = (ralph: PlanRunAgentFields): boolean => {
  const model = ralph.model.trim();
  const isDefaultModel = model === '' || model === DEFAULT_RALPH_MODEL;

  return (
    ralph.executionBackend === DEFAULT_RALPH_RUNNER &&
    isDefaultModel &&
    ralph.effort.trim() === ''
  );
};

/**
 * @description The plan's run options with the default agent's backend, model and
 * effort stamped in — only when the plan's own agent is unset
 * ({@link isPlanRunAgentUnset}); an explicit per-plan choice is returned as-is.
 */
export const seedPlanRunAgent = <TRalph extends PlanRunAgentFields>(
  ralph: TRalph,
  defaultAgent: DefaultAgentDraft | null,
): TRalph => {
  if (defaultAgent === null || !isPlanRunAgentUnset(ralph)) {
    return ralph;
  }

  return {
    ...ralph,
    effort: defaultAgent.effort,
    executionBackend: defaultAgent.backend,
    model: defaultAgent.model,
  };
};
