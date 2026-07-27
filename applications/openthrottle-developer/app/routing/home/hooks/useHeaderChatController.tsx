import * as React from 'react';
import { useFetcher } from 'react-router';
import {
  parseFileMentions,
  type ChatComposerControls,
  type ChatComposerMode,
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
} from '@openthrottle/react-router-chat-state';
import { useAtom } from 'jotai';
import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
} from '~/routing/home/data/chat-toolbar';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
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
  readonly messages: ChatMessage[];
  readonly onSendMessage: (message: string) => void;
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
  const turn = useAgenticChatTurn();
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);

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
  const setPermissionMode = (permissionMode: ChatPermissionMode): void =>
    setToolbarState((previous) => ({ ...previous, permissionMode }));
  const setPersonaId = (personaId: string): void =>
    setToolbarState((previous) => ({ ...previous, personaId }));
  const setReasoning = (reasoning: ChatReasoningLevel): void =>
    setToolbarState((previous) => ({ ...previous, reasoning }));
  const setRepositoryId = (repositoryId: string): void =>
    setToolbarState((previous) => ({ ...previous, repositoryId }));
  const setServiceTier = (serviceTier: ChatServiceTier): void =>
    setToolbarState((previous) => ({ ...previous, serviceTier }));

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
  const personaId = effectiveToolbar.personaId;
  const reasoning = effectiveToolbar.reasoning;
  const repositoryId = effectiveToolbar.repositoryId;
  const serviceTier = effectiveToolbar.serviceTier;

  const decodedOption = modelId ? decodeChatOption(modelId) : null;
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
            modelId: decoded.model,
          }
        : {
            backend: decoded.backend,
            fileMentions: JSON.stringify(fileMentions),
            permissionMode: permissionMode ?? '',
            personaId: personaId ?? '',
            reasoning: reasoning ?? '',
            repositoryId: repositoryId ?? '',
            serviceTier: serviceTier ?? '',
          };

    turn.submitTurn(trimmed, fields);
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
    onPersonaChange: setPersonaId,
    onReasoningChange: setReasoning,
    onServiceTierChange: setServiceTier,
    onStop: turn.onStop,
    permissionMode,
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
    messages: turn.messages,
    onSendMessage,
  };
}
