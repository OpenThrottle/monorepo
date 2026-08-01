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
  readChatOptionsCache,
  writeChatOptionsCache,
} from '~/routing/home/data/chat-options-cache';
import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
} from '~/routing/home/data/chat-toolbar';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { useConversationList } from '~/routing/home/hooks/useConversationList';
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
 * @description Builds the streaming chat surface for the GLOBAL HEADER ChatDialog
 * — the header counterpart of the home route (_index.tsx). Fetches discovery
 * options from `/resources/chat-options` (route-independent, since the header
 * mounts everywhere), drives the SAME persisted toolbar atom the home route uses
 * (so selections follow the user across both surfaces) reconciled against the
 * fetched options + backend capabilities, and runs its OWN {@link useAgenticChatTurn}
 * so the header conversation is separate from the home thread. When `enabled` is
 * false (logged out) it stays idle and hosts fall back to the legacy provider.
 *
 * NOTE: this duplicates the home route's toolbar→payload wiring; unifying the two
 * surfaces onto one component is deferred to plan d246beb9.
 */
export function useHeaderChatController(args: {
  readonly enabled: boolean;
}): HeaderChatSurface {
  const { enabled } = args;

  // Hooks
  const optionsFetcher = useFetcher<ChatOptionsResponse>();
  // Seed from the client-side discovery cache (module-scope + sessionStorage) so
  // a warm mount / same-session navigation reuses the last good result and skips
  // the `/resources/chat-options` probe while it is fresh. `null` when absent or
  // expired, in which case the effect below fetches.
  const [cachedOptions] = React.useState(() => readChatOptionsCache());
  const turn = useAgenticChatTurn();
  const conversationList = useConversationList();
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);
  // Dedupes the "new conversation created" refresh to one per conversation id.
  const refreshedForIdRef = React.useRef<string | null>(null);
  // Elevated permission modes decay to the safe default once per browser session.
  useSessionPermissionDecay();

  // Setup — prefer a live fetch, then the fresh client cache, then empty.
  const options = optionsFetcher.data ?? cachedOptions ?? EMPTY_OPTIONS;
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

    // Three shapes: the plain openai HTTP backend (baseUrl + model, no repo); a
    // CLI backend on its own cloud model; and a CLI backend pointed at a
    // discovered local endpoint (a driver id + baseUrl) — the last carries both
    // the endpoint fields AND the CLI/repo fields.
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
    // A fresh client cache was seeded — reuse it and skip the probe.
    if (cachedOptions !== null) {
      return;
    }
    if (optionsFetcher.state === 'idle' && optionsFetcher.data === undefined) {
      optionsFetcher.load(CHAT_OPTIONS_ROUTE);
    }
  }, [cachedOptions, enabled, optionsFetcher]);

  // Persist a fetched non-empty result to the client cache so the next warm
  // mount / reload reuses it. Empty results (a failed or genuinely empty scan)
  // are never cached, so a transient failure can't hide a working discovery.
  React.useEffect(() => {
    if (
      optionsFetcher.data !== undefined &&
      optionsFetcher.data.models.length > 0
    ) {
      writeChatOptionsCache(optionsFetcher.data);
    }
  }, [optionsFetcher.data]);

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
    canRetry: turn.canRetry,
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
    onRetry: turn.onRetry,
    onServiceTierChange: setServiceTier,
    onStop: turn.onStop,
    permissionMode,
    persist,
    personaId,
    personas,
    reasoning,
    selectedCheckoutId: repositoryId,
    serviceTier,
    sessionUsage: turn.sessionUsage,
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
