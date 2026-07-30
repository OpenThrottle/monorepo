import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatComposer,
  ChatComposerToolbar,
  ChatConversationSheet,
  ChatThread,
  parseFileMentions,
  type ChatComposerMode,
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
import { InlineErrors } from '@openthrottle/react-router-shadcn';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
} from '~/routing/home/data/chat-toolbar';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadDriverEndpointModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/data/models.server';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { useConversationList } from '~/routing/home/hooks/useConversationList';
import { useFileMentionProvider } from '~/routing/home/hooks/useFileMentionProvider';
import { useVoiceInput } from '~/routing/home/hooks/useVoiceInput';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const [localModels, agentClis, driverEndpointModels, repositories, personas] =
    await Promise.all([
      loadDiscoveredModels(args.request),
      loadAgentClis(args.request),
      loadDriverEndpointModels(args.request),
      loadRepositories(args.request),
      loadPersonas(args.request),
    ]);

  return {
    models: [...localModels, ...agentClis, ...driverEndpointModels],
    personas,
    repositories,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  const { models, repositories } = loaderData;
  const hasModels = models.length > 0;
  const hasRepositories = repositories.length > 0;
  // Registry personas when available, else the mock fallback list.
  const personas =
    loaderData.personas.length > 0
      ? loaderData.personas
      : CHAT_TOOLBAR_PERSONAS;

  // Hooks
  const [draft, setDraft] = useState('');

  // The streaming turn lifecycle (thread state, start/cancel to the
  // conversation-stream resource action, live subscription, pending overlay)
  // lives in a reusable hook shared with the global header chat.
  const turn = useAgenticChatTurn();

  // Persisted-conversation list backing the sidebar (list + rename + delete +
  // refresh); posts to the route-independent resource action.
  const conversationList = useConversationList();

  // Toolbar selections persist across reloads in a localStorage-backed atom.
  // Each per-field setter writes only its own key; absent id fields fall back to
  // the loader-derived seed for the effective value handed to the toolbar and to
  // onSubmit, without overwriting an explicit persisted choice.
  const [toolbarState, setToolbarState] = useAtom(chatToolbarStateAtom);

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

  // Effective (reconciled) toolbar values feed both the toolbar and the submit
  // payload: persisted selections are re-validated against the current loader
  // lists and the selected backend's capabilities on every render, so a stale
  // model/repo/persona id or a capability-invalid reasoning/tier/permission
  // never reaches the toolbar or onSubmit. Derive-only — reconciliation never
  // writes back to storage (see reconcileChatToolbarState).
  const effectiveToolbar = useMemo(
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

  const composerTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  // Dedupes the "new conversation created" refresh to one per conversation id.
  const refreshedForIdRef = useRef<string | null>(null);

  // Setup
  // Backs the composer's @-mention file picker for the selected checkout;
  // undefined (trigger disabled) until a repository is chosen.
  const mentionProvider = useFileMentionProvider(repositoryId);

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

  const isEmptyThread = turn.messages.length === 0;

  const decodedOption = modelId ? decodeChatOption(modelId) : null;
  const isCliBackend =
    decodedOption !== null && decodedOption.backend !== 'openai';

  // Capability descriptor for the selected backend gates the reasoning/tier,
  // permission, and checkout controls. Grouped model list + checkouts feed the
  // T3 composer primitives.
  const capabilities = capabilitiesForChatOption(decodedOption);
  const modelGroups = useMemo(() => buildModelGroups(models), [models]);
  const checkouts = useMemo(
    () =>
      repositories.map((repository) => ({
        id: repository.id,
        label: repository.displayName,
      })),
    [repositories],
  );

  // Handlers
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

  const onNewChat = (): void => {
    turn.reset();
  };

  const onSelectConversation = (conversationId: string): void => {
    turn.restore({ conversationId });
  };

  // Life Cycle
  // When a turn creates a NEW persisted conversation (an id not already in the
  // list), refresh the sidebar so it shows up. Skipped in Private mode (no row)
  // and on restore (the id is already listed); the ref dedupes to one refresh.
  useEffect(() => {
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

  // Markup
  const toolbar = (
    <div className="flex flex-col gap-2">
      <ChatComposerToolbar
        capabilities={capabilities}
        checkouts={checkouts}
        contextSources={CHAT_TOOLBAR_CONTEXT_SOURCES}
        micState={voice.micState}
        mode={mode}
        modelGroups={modelGroups}
        modelId={modelId}
        models={models}
        onAddContext={() => {}}
        onCheckoutChange={setRepositoryId}
        onMicToggle={() => void voice.toggle()}
        onModeChange={setMode}
        onModelChange={setModelId}
        onPermissionModeChange={setPermissionMode}
        onPersistChange={setPersist}
        onPersonaChange={setPersonaId}
        onReasoningChange={setReasoning}
        onServiceTierChange={setServiceTier}
        permissionMode={permissionMode}
        persist={persist}
        personaId={personaId}
        personas={personas}
        reasoning={reasoning}
        selectedCheckoutId={repositoryId}
        serviceTier={serviceTier}
      />
      {isCliBackend && !hasRepositories ? (
        <p className="text-muted-foreground text-xs">
          Register a local repository in Settings to run an agent CLI.
        </p>
      ) : null}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true} className="flex flex-1 flex-col">
      <div
        className="flex items-center gap-2 px-4 pt-4 md:px-8 md:pt-6 lg:px-12"
        data-testid="home-conversation-toolbar"
      >
        <ChatConversationSheet
          activeConversationId={turn.conversationId}
          conversations={conversationList.conversations}
          isLoading={conversationList.isLoading}
          isLoadingMore={conversationList.isLoadingMore}
          onDelete={conversationList.remove}
          onLoadMore={conversationList.loadMore}
          onNewChat={onNewChat}
          onRename={conversationList.rename}
          onSelect={onSelectConversation}
          side="left"
          totalCount={conversationList.totalCount}
        />
      </div>

      <div className="flex flex-1 flex-col justify-end p-4 pt-2 md:p-8 md:pt-4 lg:p-12 lg:pt-4">
        {isEmptyThread && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-center text-2xl">
              What would you like to build today?
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              OpenThrottle is a platform for building applications based on best
              practices for Agentic development.
            </p>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl">
          <ChatThread emptyStateLabel="" messages={turn.messages} />
          <InlineErrors errors={[turn.error, voice.error]} />
          {!hasModels ? (
            <p className="text-muted-foreground mb-2 text-center text-sm">
              No local models discovered. Start a local OpenAI-compatible server
              (e.g. Ollama) and reload.
            </p>
          ) : null}
          <ChatComposer
            className="border-t-0"
            disabled={!hasModels}
            draft={draft}
            isStreaming={turn.isStreaming}
            mentionProvider={mentionProvider}
            onDraftChange={setDraft}
            onStop={turn.onStop}
            onSubmit={onSubmit}
            readOnly={voice.isDraftFrozen}
            sessionUsage={turn.sessionUsage}
            textAreaRef={composerTextAreaRef}
            toolbar={toolbar}
          />
        </div>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
