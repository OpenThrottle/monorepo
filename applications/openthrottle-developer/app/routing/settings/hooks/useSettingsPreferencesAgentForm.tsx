import type {
  ChatModelGroup,
  ChatModelOption,
} from '@openthrottle/react-router-chat';
import {
  buildModelGroups,
  chatToolbarStateAtom,
} from '@openthrottle/react-router-chat-state';
import { useSetAtom } from 'jotai';
import * as React from 'react';
import type { FetcherWithComponents } from 'react-router';
import { useFetcher } from 'react-router';

import type { UserPreferencesFieldsFragment } from '~/__generated__/graphql';
import {
  filterPlanRunnableModels,
  parsePlanRunModelOptionId,
  reconcilePlanRunEffort,
} from '~/routing/plans/utils/plan-run-model-effort';
import type { PreferencesActionResult } from '~/routing/settings/data/data.preferences';
import { PREFERENCES_INTENTS } from '~/routing/settings/data/data.preferences';
import type {
  DefaultAgentDraft,
  ResolvedDefaultAgent,
} from '~/routing/settings/utils/user-preferences';
import {
  clearChatToolbarAgentPicks,
  describeAgentDraft,
  resolveDefaultAgent,
} from '~/routing/settings/utils/user-preferences';

export interface UseSettingsPreferencesAgentFormOptions {
  /** The stored default agent, or null for the system default. */
  readonly defaultAgent: UserPreferencesFieldsFragment['defaultAgent'];
  /** Discovered agent options; disabled agents and models are already excluded. */
  readonly models: readonly ChatModelOption[];
}

export interface UseSettingsPreferencesAgentFormResult {
  /** The unsaved pick, or null while nothing is picked. */
  readonly draft: DefaultAgentDraft | null;
  /** Whether the picked backend has a separate reasoning-effort knob. */
  readonly effortSupported: boolean;
  readonly fetcher: FetcherWithComponents<PreferencesActionResult>;
  readonly groups: readonly ChatModelGroup[];
  readonly isSubmitting: boolean;
  readonly onEffortChange: (effort: string) => void;
  readonly onModelChange: (optionId: string) => void;
  /** The stored default checked against what the user can run now. */
  readonly resolved: ResolvedDefaultAgent;
  /** The agent options a default may use: ones a plan run can also execute. */
  readonly runnableModels: readonly ChatModelOption[];
  readonly selectedOptionId: string | undefined;
}

/**
 * @description State behind the Default agent section. Offers only agents a plan
 * run can execute, so one default seeds both the composer and new plans. After a
 * successful save or clear it drops the composer's remembered model and
 * reasoning, so the new default shows up immediately instead of being masked by
 * a stale last-used pick (D4).
 */
export const useSettingsPreferencesAgentForm = (
  options: UseSettingsPreferencesAgentFormOptions,
): UseSettingsPreferencesAgentFormResult => {
  const { defaultAgent, models } = options;

  // Hooks
  const fetcher = useFetcher<PreferencesActionResult>();
  const setToolbarState = useSetAtom(chatToolbarStateAtom);
  const handledResult = React.useRef<PreferencesActionResult | undefined>(
    undefined,
  );

  const runnableModels = React.useMemo(
    () => filterPlanRunnableModels(models),
    [models],
  );
  const groups = React.useMemo(
    () => buildModelGroups(runnableModels),
    [runnableModels],
  );
  const resolved = React.useMemo(
    () => resolveDefaultAgent(defaultAgent, runnableModels),
    [defaultAgent, runnableModels],
  );
  const [draft, setDraft] = React.useState<DefaultAgentDraft | null>(() =>
    resolved.kind === 'valid' ? resolved.draft : null,
  );

  // Setup
  const isSubmitting = fetcher.state !== 'idle';
  const { effortSupported, selectedOptionId } = describeAgentDraft(
    draft,
    runnableModels,
  );

  // Handlers
  const onModelChange = (optionId: string): void => {
    const selection = parsePlanRunModelOptionId(optionId);
    if (selection === null) {
      return;
    }

    setDraft((previous) => ({
      ...selection,
      effort: reconcilePlanRunEffort(selection.backend, previous?.effort ?? ''),
    }));
  };

  const onEffortChange = (effort: string): void => {
    setDraft((previous) =>
      previous === null ? previous : { ...previous, effort },
    );
  };

  // Markup

  // Life Cycle
  // The draft seeds once from the stored default. A save posts the draft itself, so
  // it already matches; only a clear needs to reset it. Acts as soon as the action
  // result lands, without waiting for the loader revalidation to finish.
  React.useEffect(() => {
    const result = fetcher.data;
    if (result === undefined || result === handledResult.current) {
      return;
    }
    handledResult.current = result;

    const isAgentIntent =
      result.intent === PREFERENCES_INTENTS.saveDefaultAgent ||
      result.intent === PREFERENCES_INTENTS.clearDefaultAgent;

    if (!('ok' in result) || !isAgentIntent) {
      return;
    }

    setToolbarState(clearChatToolbarAgentPicks);
    if (result.intent === PREFERENCES_INTENTS.clearDefaultAgent) {
      setDraft(null);
    }
  }, [fetcher.data, setToolbarState]);

  // 🔌 Short Circuit

  return {
    draft,
    effortSupported,
    fetcher,
    groups,
    isSubmitting,
    onEffortChange,
    onModelChange,
    resolved,
    runnableModels,
    selectedOptionId,
  };
};
