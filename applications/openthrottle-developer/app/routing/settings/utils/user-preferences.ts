/**
 * @description Pure helpers behind Settings → Preferences. A stored preference is
 * opaque to the client until it is checked against what the user can run right
 * now: an agent can be disabled and a model can disappear, and D3 says such a
 * preference is ignored (never deleted), so the page shows it as unavailable.
 */

import type { ChatModelOption } from '@openthrottle/react-router-chat';
import type { ChatToolbarState } from '@openthrottle/react-router-chat-state';
import { capabilitiesForChatOption } from '@openthrottle/react-router-chat-state';

import type {
  UserPreferencesFieldsFragment,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import type { PlanRunModelSelection } from '~/routing/plans/utils/plan-run-model-effort';
import {
  reconcilePlanRunEffort,
  toPlanRunModelOptionId,
} from '~/routing/plans/utils/plan-run-model-effort';
import { isExecutionBackend } from '~/routing/plans/utils/plan-workflow-config-execution';
import type { PreferencesActionResult } from '~/routing/settings/data/data.preferences';

type StoredDefaultAgent = NonNullable<
  UserPreferencesFieldsFragment['defaultAgent']
>;

/**
 * @description A saved default agent the user can still run: the picker option it
 * maps to, and its effort reconciled against the backend's reasoning levels.
 */
export interface DefaultAgentDraft extends PlanRunModelSelection {
  /** Reasoning effort; `''` means unset (the agent's own default). */
  readonly effort: string;
}

/**
 * @description What the stored default agent means against the current options.
 * `stale` keeps the raw stored value so the page can name what went missing.
 */
export type ResolvedDefaultAgent =
  | { readonly kind: 'none' }
  | { readonly kind: 'stale'; readonly stored: StoredDefaultAgent }
  | {
      readonly draft: DefaultAgentDraft;
      readonly kind: 'valid';
      readonly optionId: string;
    };

/**
 * @description Classifies the stored default agent. Valid only when its backend
 * is one a plan can run (so the same default works in the composer and in new
 * plans) and it maps onto a currently offered option; the model list already
 * excludes disabled agents and models.
 */
export const resolveDefaultAgent = (
  stored: UserPreferencesFieldsFragment['defaultAgent'],
  models: readonly ChatModelOption[],
): ResolvedDefaultAgent => {
  if (stored == null) {
    return { kind: 'none' };
  }

  const { backend, effort, model } = stored;

  if (!isExecutionBackend(backend)) {
    return { kind: 'stale', stored };
  }

  const optionId = toPlanRunModelOptionId(backend, model, models);

  if (optionId === undefined) {
    return { kind: 'stale', stored };
  }

  return {
    draft: {
      backend,
      effort: reconcilePlanRunEffort(backend, effort ?? ''),
      model,
    },
    kind: 'valid',
    optionId,
  };
};

/** @description What the picker and effort control show for the unsaved pick. */
export interface AgentDraftView {
  /** Whether the picked backend has a separate reasoning-effort knob. */
  readonly effortSupported: boolean;
  /** The picker option to highlight, or `undefined` for its placeholder. */
  readonly selectedOptionId: string | undefined;
}

/**
 * @description Maps the unsaved pick onto the picker option it highlights and
 * whether its backend takes an effort (cursor folds effort into the model id).
 */
export const describeAgentDraft = (
  draft: DefaultAgentDraft | null,
  models: readonly ChatModelOption[],
): AgentDraftView => {
  if (draft === null) {
    return { effortSupported: false, selectedOptionId: undefined };
  }

  const { reasoningLevels } = capabilitiesForChatOption({
    backend: draft.backend,
  });

  return {
    effortSupported: reasoningLevels.length > 0,
    selectedOptionId: toPlanRunModelOptionId(
      draft.backend,
      draft.model,
      models,
    ),
  };
};

/**
 * @description Whether the chosen default editor is one the user enabled. The
 * system default (null) is always fine; D5 warns, never auto-enables. Unknown
 * enabled editors (`null`, the probe failed) never warn: no claim without data.
 */
export const isDefaultEditorEnabled = (
  editor: WorkspaceEditorId | null,
  enabledEditors: readonly WorkspaceEditorId[] | null,
): boolean => {
  if (editor === null || enabledEditors === null) {
    return true;
  }

  return enabledEditors.includes(editor);
};

/** @description What a preferences section shows after its last submission. */
export interface PreferencesFeedback {
  readonly error: string | null;
  readonly saved: boolean;
}

/**
 * @description Reads a section's last action result into its feedback line:
 * the error to show, or whether the save went through.
 */
export const toPreferencesFeedback = (
  result: PreferencesActionResult | undefined,
): PreferencesFeedback => {
  if (result === undefined) {
    return { error: null, saved: false };
  }

  if ('error' in result) {
    return { error: result.error, saved: false };
  }

  return { error: null, saved: true };
};

/**
 * @description Drops the composer's remembered model and reasoning (top-level
 * and per-backend) so a newly saved default agent seeds the composer instead of
 * being masked by a stale last-used pick (D4). Everything else is kept.
 */
export const clearChatToolbarAgentPicks = (
  state: ChatToolbarState,
): ChatToolbarState => {
  const perBackend = Object.fromEntries(
    Object.entries(state.perBackend).map(([backend, prefs]) => {
      const { reasoning: _reasoning, ...rest } = prefs;
      return [backend, rest];
    }),
  );

  return { ...state, modelId: undefined, perBackend, reasoning: undefined };
};
