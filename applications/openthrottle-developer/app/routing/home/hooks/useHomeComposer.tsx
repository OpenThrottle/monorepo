import * as React from 'react';
import {
  parseFileMentions,
  type ChatComposerMode,
  type ChatModelOption,
  type ChatPermissionMode,
  type ChatPersonaOption,
  type ChatReasoningLevel,
  type ChatServiceTier,
} from '@openthrottle/react-router-chat';
import {
  buildChatTurnFields,
  buildModelGroups,
  capabilitiesForChatOption,
  CHAT_TOOLBAR_PERSONAS,
  chatToolbarStateAtom,
  decodeChatOption,
  reconcileChatToolbarState,
} from '@openthrottle/react-router-chat-state';
import { useAtom } from 'jotai';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import { useFileMentionProvider } from '~/routing/home/hooks/useFileMentionProvider';
import { useSkillCommandProvider } from '~/routing/home/hooks/useSkillCommandProvider';
import { useVoiceInput } from '~/routing/home/hooks/useVoiceInput';

export interface UseHomeComposerOptions {
  /** Sidebar-backing conversation list; the composer refreshes it on new persisted turns. */
  conversationList: UseConversationListResult;
  /** Discovered composer models (local endpoints + agent CLIs + driver×endpoint). */
  models: ChatModelOption[];
  /** Registry personas; falls back to the mock list when empty. */
  personas: ChatPersonaOption[];
  /** Registered local checkouts selectable as the CLI working directory. */
  repositories: RepositoryOption[];
  /** Streaming turn lifecycle shared with the parent route (and sidebar). */
  turn: UseAgenticChatTurnResult;
}

/**
 * @description All non-presentational state and behavior behind HomeComposer:
 * draft + persisted toolbar selections, capability-reconciled effective values,
 * voice input, @-mention file provider, submit payload assembly, and the
 * sidebar-refresh effect. Extracted from HomeComposer per
 * component-primitive-shape R7 so the component stays UI-focused.
 */
export const useHomeComposer = (options: UseHomeComposerOptions) => {
  const { conversationList, models, repositories, turn } = options;

  // Hooks
  const [draft, setDraft] = React.useState('');

  // Toolbar selections persist across reloads in a localStorage-backed atom.
  // Each per-field setter writes only its own key; absent id fields fall back to
  // the loader-derived seed for the effective value handed to the toolbar and to
  // onSubmit, without overwriting an explicit persisted choice.
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);

  const composerTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  // Dedupes the "new conversation created" refresh to one per conversation id.
  const refreshedForIdRef = React.useRef<string | null>(null);

  // Setup
  const hasModels = models.length > 0;
  const hasRepositories = repositories.length > 0;
  // Registry personas when available, else the mock fallback list.
  const personas = options.personas.length > 0 ? options.personas : CHAT_TOOLBAR_PERSONAS; // prettier-ignore

  // Effective (reconciled) toolbar values feed both the toolbar and the submit
  // payload: persisted selections are re-validated against the current loader
  // lists and the selected backend's capabilities on every render, so a stale
  // model/repo/persona id or a capability-invalid reasoning/tier/permission
  // never reaches the toolbar or onSubmit. Derive-only — reconciliation never
  // writes back to storage (see reconcileChatToolbarState).
  const effectiveToolbar = React.useMemo(
    () =>
      reconcileChatToolbarState(toolbarState, {
        models,
        personas,
        repositories,
      }),
    [models, personas, repositories, toolbarState],
  );

  const mode = effectiveToolbar.mode;
  const modelId = effectiveToolbar.modelId;
  const permissionMode = effectiveToolbar.permissionMode;
  const persist = effectiveToolbar.persist;
  const personaId = effectiveToolbar.personaId;
  const reasoning = effectiveToolbar.reasoning;
  const repositoryId = effectiveToolbar.repositoryId;
  const serviceTier = effectiveToolbar.serviceTier;

  // Backs the composer's @-mention file picker for the selected checkout;
  // undefined (trigger disabled) until a repository is chosen.
  const mentionProvider = useFileMentionProvider(repositoryId);

  // Backs the composer's /-command skill picker. Skills are global to the
  // running checkout (not repo-scoped), so this is always present.
  const slashCommandProvider = useSkillCommandProvider();

  const voice = useVoiceInput({
    draft,
    onDraftChange: setDraft,
    onFinalized: () => {
      // Finalized transcript is editable: focus with the cursor at the end.
      const textArea = composerTextAreaRef.current;
      if (textArea) {
        textArea.focus();
        textArea.setSelectionRange(textArea.value.length, textArea.value.length); // prettier-ignore
      }
    },
  });

  const decodedOption = modelId ? decodeChatOption(modelId) : null;
  const isCliBackend =
    decodedOption !== null && decodedOption.backend !== 'openai';

  // Capability descriptor for the selected backend gates the reasoning/tier,
  // permission, and checkout controls. Grouped model list + checkouts feed the
  // T3 composer primitives.
  const capabilities = capabilitiesForChatOption(decodedOption);
  const modelGroups = React.useMemo(() => buildModelGroups(models), [models]);
  const checkouts = React.useMemo(
    () =>
      repositories.map((repository) => ({
        id: repository.id,
        label: repository.displayName,
      })),
    [repositories],
  );

  // Handlers
  const setMode = (mode: ChatComposerMode): void =>
    setToolbarState((previous) => ({ ...previous, mode }));
  const setModelId = (modelId: string): void =>
    setToolbarState((previous) => ({ ...previous, modelId }));
  const setPermissionMode = (permissionMode: ChatPermissionMode): void =>
    setToolbarState((previous) => ({ ...previous, permissionMode }));
  const setPersist = (persist: boolean): void =>
    setToolbarState((previous) => ({ ...previous, persist }));
  const setPersonaId = (personaId: string): void =>
    setToolbarState((previous) => ({ ...previous, personaId }));
  const setReasoning = (reasoning: ChatReasoningLevel): void =>
    setToolbarState((previous) => ({ ...previous, reasoning }));
  const setRepositoryId = (repositoryId: string): void =>
    setToolbarState((previous) => ({ ...previous, repositoryId }));
  const setServiceTier = (serviceTier: ChatServiceTier): void =>
    setToolbarState((previous) => ({ ...previous, serviceTier }));

  const onSubmit = (message: string): void => {
    const trimmed = message.trim();
    const decoded = modelId ? decodeChatOption(modelId) : null;
    if (!trimmed || !decoded) {
      return;
    }

    if (decoded.backend !== 'openai' && !repositoryId) {
      turn.setError('Select a repository to run the agent in.');
      return;
    }

    turn.setError(null);

    // @-mentioned files are parsed from the outgoing message and attached to the
    // payload. The @path tokens also remain inline in `message`, so a CLI agent
    // receives them directly; the structured list is for driver-side use
    // (dde67342). Only relevant for CLI backends, which run in a repository.
    const fileMentions = parseFileMentions(trimmed).map(
      (mention) => mention.path,
    );

    const fields = buildChatTurnFields({
      decoded,
      fileMentions,
      permissionMode,
      persist,
      personaId,
      reasoning,
      repositoryId,
      serviceTier,
    });

    turn.submitTurn(trimmed, fields);
  };

  // Markup

  // Life Cycle
  // When a turn creates a NEW persisted conversation (an id not already in the
  // list), refresh the sidebar so it shows up. Skipped in Private mode (no row)
  // and on restore (the id is already listed); the ref dedupes to one refresh.
  React.useEffect(() => {
    const id = turn.conversationId;
    if (id == null || id === refreshedForIdRef.current) {
      return;
    }

    const alreadyListed = conversationList.conversations.some(
      (conversation) => conversation.id === id,
    );
    if (persist && !alreadyListed) {
      refreshedForIdRef.current = id;
      conversationList.refresh();
    }
  }, [turn.conversationId, persist]);

  // 🔌 Short Circuit

  return {
    capabilities,
    checkouts,
    composerTextAreaRef,
    draft,
    hasModels,
    hasRepositories,
    isCliBackend,
    mentionProvider,
    mode,
    modelGroups,
    modelId,
    onSubmit,
    permissionMode,
    persist,
    personaId,
    personas,
    reasoning,
    repositoryId,
    serviceTier,
    setDraft,
    setMode,
    setModelId,
    setPermissionMode,
    setPersist,
    setPersonaId,
    setReasoning,
    setRepositoryId,
    setServiceTier,
    slashCommandProvider,
    voice,
  };
};
