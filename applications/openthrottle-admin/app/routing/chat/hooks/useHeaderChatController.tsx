import * as React from 'react';
import { useFetcher } from 'react-router';
import {
  parseFileMentions,
  type ChatComposerControls,
  type ChatComposerMode,
  type ChatConversationSidebarProps,
  type ChatMessage,
  type ChatPermissionMode,
  type ChatReasoningLevel,
  type ChatServiceTier,
} from '@openthrottle/react-router-chat';
import {
  buildModelGroups,
  capabilitiesForChatOption,
  chatToolbarStateAtom,
  decodeChatOption,
  reconcileChatToolbarState,
  useSessionPermissionDecay,
  type ChatToolbarBackendPrefs,
  type ChatToolbarState,
} from '@openthrottle/react-router-chat-state';
import { useAtom } from 'jotai';
import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
} from '~/routing/chat/data/chat-toolbar';
import { useAgenticChatTurn } from '~/routing/chat/hooks/useAgenticChatTurn';
import { useConversationList } from '~/routing/chat/hooks/useConversationList';
import type { ChatOptionsResponse } from '~/routes/resources.chat-options';

const CHAT_OPTIONS_ROUTE = '/resources/chat-options';

const EMPTY_OPTIONS: ChatOptionsResponse = {
  models: [],
  personas: [],
  repositories: [],
};

/** The header chat surface injected into GlobalProviders' ChatProvider. */
export interface HeaderChatSurface {
  readonly composer: ChatComposerControls;
  readonly composerDisabled: boolean;
  /** Conversations switcher for the header ChatDialog (list/restore/rename/delete/new). */
  readonly conversationSidebar: ChatConversationSidebarProps;
  readonly messages: ChatMessage[];
  readonly onSendMessage: (message: string) => void;
  /** New chat: reset the header thread to a fresh conversation. */
  readonly onStartNewChat: () => void;
}

/**
 * @description Builds the streaming chat surface for the admin GLOBAL HEADER
 * ChatDialog — admin-local mirror of the developer app's controller. Fetches
 * discovery options from `/resources/chat-options`, drives the shared persisted
 * toolbar atom (namespaced to the admin app) reconciled against the fetched
 * options + backend capabilities, and runs its own {@link useAgenticChatTurn}.
 * Admin often has no local models/repos, so the loaders/toolbar degrade to
 * empty/disabled gracefully. Full consolidation with the developer copy is
 * deferred to plan d246beb9.
 */
export function useHeaderChatController(args: {
  readonly enabled: boolean;
}): HeaderChatSurface {
  const { enabled } = args;

  // Hooks
  const optionsFetcher = useFetcher<ChatOptionsResponse>();
  const turn = useAgenticChatTurn();
  const conversationList = useConversationList();
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);
  // Dedupes the "new conversation created" refresh to one per conversation id.
  const refreshedForIdRef = React.useRef<string | null>(null);
  // Elevated permission modes decay to the safe default once per browser session.
  useSessionPermissionDecay();

  // Setup
  const options = optionsFetcher.data ?? EMPTY_OPTIONS;
  const models = options.models;
  const repositories = options.repositories;
  const personas =
    options.personas.length > 0 ? options.personas : CHAT_TOOLBAR_PERSONAS;

  const setMode = (mode: ChatComposerMode): void =>
    setToolbarState((previous) => ({ ...previous, mode }));
  const setModelId = (modelId: string): void =>
    setToolbarState((previous) => ({ ...previous, modelId }));
  const setPersist = (persist: boolean): void =>
    setToolbarState((previous) => ({ ...previous, persist }));
  const setPersonaId = (personaId: string): void =>
    setToolbarState((previous) => ({ ...previous, personaId }));
  const setRepositoryId = (repositoryId: string): void =>
    setToolbarState((previous) => ({ ...previous, repositoryId }));

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

  const decodedOption = modelId ? decodeChatOption(modelId) : null;
  const capabilities = capabilitiesForChatOption(decodedOption);

  // Last-used-wins write path for the capability-gated controls: persist the new
  // value both under the active backend's `perBackend` entry AND as the global
  // fallback, so a never-touched backend inherits the most-recent choice.
  const backendKey = decodedOption?.backend;
  const writeBackendPref = (
    previous: ChatToolbarState,
    patch: ChatToolbarBackendPrefs,
  ): ChatToolbarState =>
    backendKey == null
      ? { ...previous, ...patch }
      : {
          ...previous,
          ...patch,
          perBackend: {
            ...previous.perBackend,
            [backendKey]: { ...previous.perBackend[backendKey], ...patch },
          },
        };
  const setPermissionMode = (permissionMode: ChatPermissionMode): void =>
    setToolbarState((previous) =>
      writeBackendPref(previous, { permissionMode }),
    );
  const setReasoning = (reasoning: ChatReasoningLevel): void =>
    setToolbarState((previous) => writeBackendPref(previous, { reasoning }));
  const setServiceTier = (serviceTier: ChatServiceTier): void =>
    setToolbarState((previous) => writeBackendPref(previous, { serviceTier }));

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
  const onSendMessage = (message: string): void => {
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

    const fileMentions = parseFileMentions(trimmed).map(
      (mention) => mention.path,
    );

    const fields: Record<string, string> =
      decoded.baseUrl != null
        ? {
            backend: 'openai',
            baseUrl: decoded.baseUrl,
            modelId: decoded.model ?? '',
            persist: String(persist),
          }
        : {
            backend: decoded.backend,
            fileMentions: JSON.stringify(fileMentions),
            modelId: decoded.model ?? '',
            permissionMode: permissionMode ?? '',
            persist: String(persist),
            personaId: personaId ?? '',
            reasoning: reasoning ?? '',
            repositoryId: repositoryId ?? '',
            serviceTier: serviceTier ?? '',
          };

    turn.submitTurn(trimmed, fields);
  };

  const onStartNewChat = (): void => {
    turn.reset();
  };

  const conversationSidebar: ChatConversationSidebarProps = {
    activeConversationId: turn.conversationId,
    conversations: conversationList.conversations,
    isLoading: conversationList.isLoading,
    isLoadingMore: conversationList.isLoadingMore,
    onDelete: conversationList.remove,
    onLoadMore: conversationList.loadMore,
    onNewChat: onStartNewChat,
    onRename: conversationList.rename,
    onSelect: (id: string): void => turn.restore({ conversationId: id }),
    totalCount: conversationList.totalCount,
  };

  // Life Cycle
  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    if (optionsFetcher.state === 'idle' && optionsFetcher.data === undefined) {
      optionsFetcher.load(CHAT_OPTIONS_ROUTE);
    }
  }, [enabled, optionsFetcher]);

  // Refresh the switcher list once when a turn creates a NEW persisted
  // conversation (skipped in Private mode + on restore; ref-deduped).
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
  const composer: ChatComposerControls = {
    capabilities,
    checkouts,
    contextSources: CHAT_TOOLBAR_CONTEXT_SOURCES,
    isStreaming: turn.isStreaming,
    mode,
    modelGroups,
    modelId,
    models,
    onCheckoutChange: setRepositoryId,
    onModeChange: setMode,
    onModelChange: setModelId,
    onPermissionModeChange: setPermissionMode,
    onPersistChange: setPersist,
    onPersonaChange: setPersonaId,
    onReasoningChange: setReasoning,
    onServiceTierChange: setServiceTier,
    onStop: turn.onStop,
    permissionMode,
    persist,
    personaId,
    personas,
    reasoning,
    selectedCheckoutId: repositoryId,
    serviceTier,
  };

  return {
    composer,
    composerDisabled: models.length === 0,
    conversationSidebar,
    messages: turn.messages,
    onSendMessage,
    onStartNewChat,
  };
}
