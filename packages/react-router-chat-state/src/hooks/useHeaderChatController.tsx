import * as React from 'react';
import { useFetcher } from 'react-router';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  parseFileMentions,
  useAgenticChatTurn,
  useConversationList,
  type ChatComposerControls,
  type ChatComposerMode,
  type ChatContextSource,
  type ChatConversationSidebarProps,
  type ChatMessage,
  type ChatPermissionMode,
  type ChatPersonaOption,
  type ChatReasoningLevel,
  type ChatServiceTier,
  type ConversationStreamSubscriptionData,
  type ConversationStreamSubscriptionVariables,
} from '@openthrottle/react-router-chat';
import type { GraphqlWsClient } from '@openthrottle/react-router-graphql';
import { useAtom } from 'jotai';
import { buildModelGroups } from '../utils/chat-model-option';
import { buildChatTurnFields } from '../utils/chat-turn-fields';
import { capabilitiesForChatOption } from '../config/chat-capabilities';
import { decodeChatOption } from '../utils/chat-model-option';
import { chatToolbarStateAtom } from '../data/atom.chat-toolbar';
import { reconcileChatToolbarState } from '../utils/chat-toolbar-reconcile';
import { useSessionPermissionDecay } from './useSessionPermissionDecay';
import type {
  ChatToolbarBackendPrefs,
  ChatToolbarState,
} from '../data/atom.chat-toolbar';
import type { ChatOptionsResponse } from '../utils/chat-discovery-options';

const CHAT_OPTIONS_ROUTE = '/resources/chat-options';

const EMPTY_OPTIONS: ChatOptionsResponse = {
  models: [],
  personas: [],
  repositories: [],
};

/**
 * A client-side discovery-options cache (module-scope + sessionStorage) the host
 * app may provide so a warm mount reuses the last good `/resources/chat-options`
 * result. Optional — omit it and the controller always probes the route.
 * @public
 */
export interface HeaderChatOptionsCache {
  read(): ChatOptionsResponse | null;
  write(options: ChatOptionsResponse): void;
}

/**
 * Host-provided wiring for {@link useHeaderChatController}. `streamClient` /
 * `streamDocument` feed the agentic turn subscription; `contextSources` and
 * `personasFallback` are the app's toolbar seeds; `optionsCache` is an optional
 * client-side discovery cache.
 * @public
 */
export interface UseHeaderChatControllerConfig {
  readonly contextSources: readonly ChatContextSource[];
  readonly enabled: boolean;
  readonly optionsCache?: HeaderChatOptionsCache | null;
  readonly personasFallback: readonly ChatPersonaOption[];
  readonly streamClient: GraphqlWsClient | null;
  readonly streamDocument: TypedDocumentNode<
    ConversationStreamSubscriptionData,
    ConversationStreamSubscriptionVariables
  >;
}

/** The header chat surface injected into GlobalProviders' ChatProvider. @public */
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
 * Shared by both apps; the host injects its ws client + subscription document +
 * toolbar seeds + optional discovery cache via {@link UseHeaderChatControllerConfig}.
 * @public
 */
export function useHeaderChatController(
  config: UseHeaderChatControllerConfig,
): HeaderChatSurface {
  const {
    contextSources,
    enabled,
    optionsCache,
    personasFallback,
    streamClient,
    streamDocument,
  } = config;

  // Hooks
  const optionsFetcher = useFetcher<ChatOptionsResponse>();
  // Seed from the client-side discovery cache (module-scope + sessionStorage) so
  // a warm mount / same-session navigation reuses the last good result and skips
  // the `/resources/chat-options` probe while it is fresh. `null` when absent or
  // expired (or when the host provides no cache), in which case the effect below
  // fetches.
  const [cachedOptions] = React.useState<ChatOptionsResponse | null>(
    () => optionsCache?.read() ?? null,
  );
  const turn = useAgenticChatTurn({ streamClient, streamDocument });
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
    options.personas.length > 0 ? options.personas : personasFallback;

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

  // Persist a fetched non-empty result to the host's client cache (when one is
  // provided) so the next warm mount / reload reuses it. Empty results (a failed
  // or genuinely empty scan) are never cached, so a transient failure can't hide
  // a working discovery.
  React.useEffect(() => {
    if (
      optionsFetcher.data !== undefined &&
      optionsFetcher.data.models.length > 0
    ) {
      optionsCache?.write(optionsFetcher.data);
    }
  }, [optionsCache, optionsFetcher.data]);

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
    contextSources,
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
