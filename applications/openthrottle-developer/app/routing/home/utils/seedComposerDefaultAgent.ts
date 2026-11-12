/**
 * @description The user's saved default agent as the home composer seeds it
 * (D3/D4). The precedence is: a pick remembered in the toolbar atom (an
 * in-session override), then this preference, then the discovery-derived seed
 * that {@link reconcileChatToolbarState} falls back to.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';
import type { ChatToolbarState } from '@openthrottle/react-router-chat-state';
import {
  decodeChatOption,
  encodeCliOptionId,
} from '@openthrottle/react-router-chat-state';

import { parsePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import { DEFAULT_RALPH_MODEL } from '~/routing/plans/utils/workflow-ralph-config';

/**
 * @description `userPreferences.defaultAgent` from the home loader. `effort` is
 * the raw stored string; `null` means the backend's own default.
 */
export interface ComposerDefaultAgent {
  readonly backend: string;
  readonly effort: string | null;
  readonly model: string;
}

/**
 * @description The composer option id a default agent maps to, or `undefined`
 * when no currently offered option matches (agent disabled, model gone). The
 * default model (`auto`, or empty) matches the bare-backend option.
 */
const toDefaultAgentOptionId = (
  agent: ComposerDefaultAgent,
  models: readonly ChatModelOption[],
): string | undefined => {
  const model = agent.model.trim();
  const isDefaultModel = model === '' || model === DEFAULT_RALPH_MODEL;
  const candidate = isDefaultModel
    ? encodeCliOptionId(agent.backend)
    : encodeCliOptionId(agent.backend, model);

  return models.some((option) => option.id === candidate)
    ? candidate
    : undefined;
};

/**
 * @description Fills the toolbar blob's empty `modelId` / `reasoning` from the
 * default agent, before reconciliation. PURE and derive-only, like the
 * reconciler: the atom is never written, so the preference keeps applying until
 * the user actually picks something in the composer.
 *
 * - A remembered `modelId` always wins. Otherwise the default agent's option is
 *   used, but only when it is currently offered — an invalid default is ignored
 *   and the reconciler's discovery seed applies, exactly as with no preference.
 * - A remembered `reasoning` always wins. Otherwise the default effort is used,
 *   but only when the effective model belongs to the default agent's backend, so
 *   one agent's effort never leaks onto another. The reconciler still drops an
 *   effort the backend does not support, and a per-backend remembered effort
 *   still overrides this top-level one.
 */
export const seedComposerDefaultAgent = (
  persisted: ChatToolbarState,
  defaultAgent: ComposerDefaultAgent | null,
  models: readonly ChatModelOption[],
): ChatToolbarState => {
  if (defaultAgent === null) {
    return persisted;
  }

  const modelId =
    persisted.modelId ?? toDefaultAgentOptionId(defaultAgent, models);
  const effectiveBackend =
    modelId === undefined ? undefined : decodeChatOption(modelId)?.backend;
  const isDefaultBackend = effectiveBackend === defaultAgent.backend;
  const effort = parsePlanRunEffort(defaultAgent.effort ?? '');
  const reasoning =
    persisted.reasoning ?? (isDefaultBackend ? effort : undefined);

  return { ...persisted, modelId, reasoning };
};
