import * as React from 'react';
import type {
  ChatCheckoutOption,
  ChatModelGroup,
  ChatModelOption,
} from '@openthrottle/react-router-chat';
import {
  buildModelGroups,
  capabilitiesForChatOption,
  chatToolbarStateAtom,
  decodeChatOption,
  reconcileChatToolbarState,
} from '@openthrottle/react-router-chat-state';
import { useAtom } from 'jotai';
import type { RepositoryOption } from '~/routing/home/data/models.server';

/**
 * The composed invocation the parent submits through the streamed-conversation
 * path. `message` is the `/<slug> <args>` command; `fields` are the
 * `StartConversationStreamInput`-shaped values derived from the picked option.
 */
export interface RunSkillPayload {
  readonly fields: Record<string, string>;
  readonly message: string;
}

export interface UseRunSkillDialogOptions {
  /** Discovered agent+model options (local endpoints + agent CLIs + driver×endpoint). */
  readonly models: ChatModelOption[];
  /** Whether the dialog is open — drives the args reset. */
  readonly open: boolean;
  /** Registered local checkouts satisfying `repositoryId` for CLI backends. */
  readonly repositories: RepositoryOption[];
  /** Slug of the skill being run; composed into the `/<slug>` command. */
  readonly slug: string;
}

export interface UseRunSkillDialogResult {
  readonly args: string;
  /** Compose the invocation payload; null when nothing runnable is selected. */
  readonly buildPayload: () => RunSkillPayload | null;
  /** Repository/checkout options for the CLI-backend picker. */
  readonly checkouts: ChatCheckoutOption[];
  readonly hasModels: boolean;
  /** True when the effective backend is a CLI (shows the repository picker). */
  readonly isCliBackend: boolean;
  /** Provider/CLI rail groups for the grouped model picker. */
  readonly modelGroups: ChatModelGroup[];
  /** Effective selected model id (persisted toolbar selection, reconciled). */
  readonly modelId: string | undefined;
  /** Effective selected repository id (reconciled), or undefined. */
  readonly repositoryId: string | undefined;
  readonly setArgs: (args: string) => void;
  readonly setModelId: (modelId: string) => void;
  readonly setRepositoryId: (repositoryId: string) => void;
  readonly submitDisabled: boolean;
}

/**
 * @description All non-presentational state behind RunSkillDialog: the free-text
 * arguments (local, reset on open) plus the model / repository selection sourced
 * from the SHARED chat-toolbar Jotai atom (never a forked second model-state
 * source). The persisted toolbar selection is reconciled against the modal's
 * loader lists so the default model/repo — and the carried permissionMode /
 * reasoning / serviceTier / persist — match the rest of the app. Extracted per
 * component-primitive-shape R7, mirroring useHomeComposer.
 */
export const useRunSkillDialog = (
  options: UseRunSkillDialogOptions,
): UseRunSkillDialogResult => {
  const { models, open, repositories, slug } = options;

  // Hooks
  const [args, setArgs] = React.useState('');
  // Shared with the composer: picking a model/repo here writes the same atom, so
  // the selection persists and stays in sync across surfaces.
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);

  // Setup
  const hasModels = models.length > 0;
  const modelGroups = React.useMemo(() => buildModelGroups(models), [models]);
  const checkouts = React.useMemo(
    () =>
      repositories.map((repository) => ({
        id: repository.id,
        label: repository.displayName,
      })),
    [repositories],
  );

  // Effective (reconciled) selections: the persisted toolbar picks re-validated
  // against the current loader lists and the selected backend's capabilities, so
  // a stale model/repo id or a capability-invalid reasoning/tier/permission never
  // reaches the payload. Derive-only — reconciliation never writes to storage.
  // No persona list here, so personaId reconciles away; the run modal omits it.
  const effectiveToolbar = React.useMemo(
    () =>
      reconcileChatToolbarState(toolbarState, {
        models,
        personas: [],
        repositories,
      }),
    [models, repositories, toolbarState],
  );

  const modelId = effectiveToolbar.modelId;
  const permissionMode = effectiveToolbar.permissionMode;
  const persist = effectiveToolbar.persist;
  const reasoning = effectiveToolbar.reasoning;
  // The run-skill dialog is deliberately single-select — a skill runs in ONE
  // checkout — so it reads the primary and ignores any secondaries the chat
  // composer may have selected.
  const repositoryId = effectiveToolbar.repositoryIds[0];
  const serviceTier = effectiveToolbar.serviceTier;

  const decoded = modelId ? decodeChatOption(modelId) : null;
  const capabilities = capabilitiesForChatOption(decoded);
  const isCliBackend = decoded !== null && decoded.backend !== 'openai';
  const submitDisabled =
    decoded === null ||
    (capabilities.requiresRepository &&
      (repositoryId == null || repositoryId === ''));

  // Handlers
  const setModelId = (nextModelId: string): void =>
    setToolbarState((previous) => ({ ...previous, modelId: nextModelId }));
  const setRepositoryId = (nextRepositoryId: string): void =>
    setToolbarState((previous) => ({
      ...previous,
      repositoryIds: [nextRepositoryId],
    }));

  const buildPayload = React.useCallback((): RunSkillPayload | null => {
    if (decoded === null) {
      return null;
    }

    if (
      capabilities.requiresRepository &&
      (repositoryId == null || repositoryId === '')
    ) {
      return null;
    }

    const trimmedArgs = args.trim();
    const message = trimmedArgs === '' ? `/${slug}` : `/${slug} ${trimmedArgs}`;

    // Two shapes, mirroring the home composer's onSubmit: the plain openai HTTP
    // backend (baseUrl + model, no repo) and a CLI backend (its own or a
    // driver×endpoint model) run in a repository, carrying the capability-gated
    // permission/reasoning/tier defaults through.
    const fields: Record<string, string> =
      decoded.backend === 'openai'
        ? {
            backend: 'openai',
            baseUrl: decoded.baseUrl ?? '',
            modelId: decoded.model ?? '',
            persist: String(persist),
          }
        : {
            backend: decoded.backend,
            ...(decoded.baseUrl != null ? { baseUrl: decoded.baseUrl } : {}),
            modelId: decoded.model ?? '',
            permissionMode: permissionMode ?? '',
            persist: String(persist),
            reasoning: reasoning ?? '',
            repositoryIds: JSON.stringify(
              repositoryId != null ? [repositoryId] : [],
            ),
            serviceTier: serviceTier ?? '',
          };

    return { fields, message };
  }, [
    args,
    capabilities.requiresRepository,
    decoded,
    permissionMode,
    persist,
    reasoning,
    repositoryId,
    serviceTier,
    slug,
  ]);

  // Life Cycle
  // Reset only the local arguments each time the dialog opens; the model/repo
  // selection lives in the shared atom and must persist across opens.
  React.useEffect(() => {
    if (open) {
      setArgs('');
    }
  }, [open]);

  // 🔌 Short Circuit

  return {
    args,
    buildPayload,
    checkouts,
    hasModels,
    isCliBackend,
    modelGroups,
    modelId,
    repositoryId,
    setArgs,
    setModelId,
    setRepositoryId,
    submitDisabled,
  };
};
