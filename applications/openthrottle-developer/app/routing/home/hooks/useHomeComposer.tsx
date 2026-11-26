import type {
  ChatBackendCapabilities,
  ChatCheckoutOption,
  ChatComposerModeValue,
  ChatMentionProvider,
  ChatModelGroup,
  ChatModelOption,
  ChatPermissionModeValue,
  ChatPersonaOption,
  ChatReasoningLevelValue,
  ChatServiceTierValue,
  ChatSlashCommandProvider,
} from '@openthrottle/react-router-chat';
import { parseFileMentions } from '@openthrottle/react-router-chat';
import type { ChatAgentRuntime } from '@openthrottle/react-router-chat-state';
import {
  buildChatTurnFields,
  buildModelGroups,
  capabilitiesForChatOption,
  CHAT_TOOLBAR_PERSONAS,
  chatToolbarStateAtom,
  decodeChatOption,
  reconcileChatToolbarState,
  toCheckoutOptions,
  useChatDraft,
  writeChatToolbarBackendPref,
} from '@openthrottle/react-router-chat-state';
import { useAtom } from 'jotai';
import * as React from 'react';

import { ConversationListContext } from '~/global/config/ConversationListContext';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import { useConversationUrlSync } from '~/routing/home/hooks/useConversationUrlSync';
import { useFileMentionProvider } from '~/routing/home/hooks/useFileMentionProvider';
import { useSkillCommandProvider } from '~/routing/home/hooks/useSkillCommandProvider';
import type { UseVoiceInputResult } from '~/routing/home/hooks/useVoiceInput';
import { useVoiceInput } from '~/routing/home/hooks/useVoiceInput';
import type { RepositoryOption } from '~/routing/home/utils/models.server';
import type { ComposerDefaultAgent } from '~/routing/home/utils/seedComposerDefaultAgent';
import { seedComposerDefaultAgent } from '~/routing/home/utils/seedComposerDefaultAgent';

export interface UseHomeComposerOptions {
  /** Live per-agent runtime facts (ACP approvals, auth) keyed by backend id. */
  agentRuntimes: Readonly<Record<string, ChatAgentRuntime>>;
  /** Sidebar-backing conversation list; the composer lists new persisted turns in it. */
  conversationList: UseConversationListResult;
  /** The saved default agent; seeds model + reasoning when the atom remembers none. */
  defaultAgent: ComposerDefaultAgent | null;
  /** Discovered composer models (local endpoints + agent CLIs + driver×endpoint). */
  models: ChatModelOption[];
  /** Registry personas; falls back to the mock list when empty. */
  personas: ChatPersonaOption[];
  /** Registered local checkouts selectable as the CLI working directory. */
  repositories: RepositoryOption[];
  /** Streaming turn lifecycle shared with the parent route (and sidebar). */
  turn: UseAgenticChatTurnResult;
}

export interface UseHomeComposerResult {
  readonly capabilities: ChatBackendCapabilities;
  readonly checkouts: ChatCheckoutOption[];
  readonly composerTextAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly draft: string;
  readonly hasModels: boolean;
  readonly hasRepositories: boolean;
  readonly isCliBackend: boolean;
  readonly mentionProvider: ChatMentionProvider | undefined;
  readonly mode: ChatComposerModeValue;
  readonly modelGroups: ChatModelGroup[];
  readonly modelId: string | undefined;
  readonly onSubmit: (message: string) => void;
  readonly permissionMode: ChatPermissionModeValue | undefined;
  readonly persist: boolean;
  readonly personaId: string | undefined;
  readonly personas: readonly ChatPersonaOption[];
  readonly promptHistory: readonly string[];
  readonly reasoning: ChatReasoningLevelValue | undefined;
  readonly rememberPermissionMode: boolean;
  readonly repositoryId: string | undefined;
  readonly repositoryIds: readonly string[];
  readonly serviceTier: ChatServiceTierValue | undefined;
  readonly setDraft: React.Dispatch<React.SetStateAction<string>>;
  readonly setMode: (mode: ChatComposerModeValue) => void;
  readonly setModelId: (modelId: string) => void;
  readonly setPermissionMode: (permissionMode: ChatPermissionModeValue) => void;
  readonly setPersist: (persist: boolean) => void;
  readonly setPersonaId: (personaId: string) => void;
  readonly setReasoning: (reasoning: ChatReasoningLevelValue) => void;
  readonly setRememberPermissionMode: (remember: boolean) => void;
  readonly setRepositoryId: (repositoryId: string) => void;
  readonly setRepositoryIds: (repositoryIds: readonly string[]) => void;
  readonly setServiceTier: (serviceTier: ChatServiceTierValue) => void;
  readonly slashCommandProvider: ChatSlashCommandProvider;
  readonly voice: UseVoiceInputResult;
}

/**
 * @description All non-presentational state and behavior behind HomeComposer:
 * draft + persisted toolbar selections, capability-reconciled effective values,
 * voice input, @-mention file provider, submit payload assembly, and the
 * sidebar-refresh effect. Extracted from HomeComposer per
 * component-primitive-shape R7 so the component stays UI-focused.
 */
export const useHomeComposer = (
  options: UseHomeComposerOptions,
): UseHomeComposerResult => {
  const {
    agentRuntimes,
    conversationList,
    defaultAgent,
    models,
    repositories,
    turn,
  } = options;

  // Hooks
  // Unsent text is saved per conversation (a new chat drafts under a shared
  // 'new' key), so it survives navigation and reloads.
  const { clearDraft, draft, setDraft } = useChatDraft({
    conversationId: turn.conversationId,
  });

  // Toolbar selections persist across reloads in a localStorage-backed atom.
  // Each per-field setter writes only its own key; absent id fields fall back to
  // the loader-derived seed for the effective value handed to the toolbar and to
  // onSubmit, without overwriting an explicit persisted choice.
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);

  // Publishes the open conversation to the dock so it highlights it.
  const sharedConversations = React.useContext(ConversationListContext);

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
  // The saved default agent fills an empty modelId/reasoning first (D3/D4): a
  // remembered pick wins, then the preference, then the reconciler's discovery
  // seed. An invalid default is ignored rather than written anywhere.
  const effectiveToolbar = React.useMemo(
    () =>
      reconcileChatToolbarState(
        seedComposerDefaultAgent(toolbarState, defaultAgent, models),
        { agentRuntimes, models, personas, repositories },
      ),
    [agentRuntimes, defaultAgent, models, personas, repositories, toolbarState],
  );

  const mode = effectiveToolbar.mode;
  const modelId = effectiveToolbar.modelId;
  const permissionMode = effectiveToolbar.permissionMode;
  const persist = effectiveToolbar.persist;
  const personaId = effectiveToolbar.personaId;
  const reasoning = effectiveToolbar.reasoning;
  const rememberPermissionMode = effectiveToolbar.rememberPermissionMode;
  const repositoryIds = effectiveToolbar.repositoryIds;
  // @-mentions stay keyed on the PRIMARY checkout for v1: a multi-repo mention
  // needs repo-qualified paths or the agent cannot disambiguate them.
  const repositoryId = repositoryIds[0];
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
  // Capability-gated picks write per-backend AND global, like the header chat,
  // so an older per-backend value can never shadow a pick made here.
  const backendKey = decodedOption?.backend;

  // Capability descriptor for the selected backend gates the reasoning/tier,
  // permission, and checkout controls. Grouped model list + checkouts feed the
  // T3 composer primitives.
  const capabilities = capabilitiesForChatOption(
    decodedOption,
    decodedOption != null ? agentRuntimes[decodedOption.backend] : undefined,
  );
  // A backend that runs in a repository (agent CLIs) needs a checkout picked.
  const isCliBackend = decodedOption !== null && capabilities.requiresRepository; // prettier-ignore
  const modelGroups = React.useMemo(() => buildModelGroups(models), [models]);
  const checkouts = React.useMemo(
    () => toCheckoutOptions(repositories),
    [repositories],
  );
  // The conversation's sent prompts, oldest first, for ArrowUp recall; a
  // restored conversation brings its history with it.
  const promptHistory = React.useMemo(
    () =>
      turn.messages
        .filter((message) => message.role === 'user')
        .map((message) => message.body),
    [turn.messages],
  );

  // Handlers
  const setMode = (mode: ChatComposerModeValue): void => {
    return setToolbarState((previous) => ({ ...previous, mode }));
  };
  const setModelId = (modelId: string): void => {
    return setToolbarState((previous) => ({ ...previous, modelId }));
  };
  const setPermissionMode = (permissionMode: ChatPermissionModeValue): void => {
    return setToolbarState((previous) =>
      writeChatToolbarBackendPref(previous, backendKey, { permissionMode }),
    );
  };
  const setPersist = (persist: boolean): void => {
    return setToolbarState((previous) => ({ ...previous, persist }));
  };
  const setPersonaId = (personaId: string): void => {
    return setToolbarState((previous) => ({ ...previous, personaId }));
  };
  const setReasoning = (reasoning: ChatReasoningLevelValue): void => {
    return setToolbarState((previous) =>
      writeChatToolbarBackendPref(previous, backendKey, { reasoning }),
    );
  };
  const setRememberPermissionMode = (remember: boolean): void => {
    return setToolbarState((previous) => ({
      ...previous,
      rememberPermissionMode: remember,
    }));
  };
  const setRepositoryId = (repositoryId: string): void => {
    return setToolbarState((previous) => ({
      ...previous,
      repositoryIds: [repositoryId],
    }));
  };
  const setRepositoryIds = (repositoryIds: readonly string[]): void => {
    return setToolbarState((previous) => ({ ...previous, repositoryIds }));
  };
  const setServiceTier = (serviceTier: ChatServiceTierValue): void => {
    return setToolbarState((previous) =>
      writeChatToolbarBackendPref(previous, backendKey, { serviceTier }),
    );
  };

  const onSubmit = (message: string): void => {
    const trimmed = message.trim();
    const decoded = modelId ? decodeChatOption(modelId) : null;
    if (!trimmed || !decoded) {
      return;
    }

    const submitCapabilities = capabilitiesForChatOption(
      decoded,
      agentRuntimes[decoded.backend],
    );
    if (submitCapabilities.requiresRepository && repositoryIds.length === 0) {
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
      repositoryIds,
      serviceTier,
    });

    turn.submitTurn(trimmed, fields);
    clearDraft();
  };

  // Markup

  // Life Cycle
  useConversationUrlSync({ conversationId: turn.conversationId, persist });

  // Publish the open conversation so the dock highlights it, and when a turn
  // creates a NEW persisted conversation (an id not already in the list), list
  // it at once — titled as the server titles it, from the first message — then
  // reconcile with the server's row. Private mode has no row: nothing is listed
  // or highlighted. The ref dedupes the insert to one per conversation id.
  React.useEffect(() => {
    const id = turn.conversationId;
    const alreadyListed = conversationList.conversations.some(
      (conversation) => conversation.id === id,
    );
    const hasRow = id != null && (persist || alreadyListed);
    sharedConversations?.setActiveConversationId(hasRow ? id : null);

    if (id == null || !persist || alreadyListed) {
      return;
    }
    if (id === refreshedForIdRef.current) {
      return;
    }

    refreshedForIdRef.current = id;
    const firstMessage = turn.messages.find((message) => message.role === 'user'); // prettier-ignore
    conversationList.insert({
      groupId: null,
      id,
      pinned: false,
      status: 'active',
      title: firstMessage?.body.slice(0, 80) ?? null,
      updatedAt: new Date().toString(),
    });
    conversationList.refresh();
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
    promptHistory,
    reasoning,
    rememberPermissionMode,
    repositoryId,
    repositoryIds,
    serviceTier,
    setDraft,
    setMode,
    setModelId,
    setPermissionMode,
    setPersist,
    setPersonaId,
    setReasoning,
    setRememberPermissionMode,
    setRepositoryId,
    setRepositoryIds,
    setServiceTier,
    slashCommandProvider,
    voice,
  };
};
