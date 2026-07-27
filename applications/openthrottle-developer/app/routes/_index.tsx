import { useMemo, useRef, useState } from 'react';
import {
  ChatComposer,
  ChatComposerToolbar,
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
  loadPersonas,
  loadRepositories,
} from '~/routing/home/data/models.server';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { useFileMentionProvider } from '~/routing/home/hooks/useFileMentionProvider';
import { useVoiceInput } from '~/routing/home/hooks/useVoiceInput';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const [localModels, agentClis, repositories, personas] = await Promise.all([
    loadDiscoveredModels(args.request),
    loadAgentClis(args.request),
    loadRepositories(args.request),
    loadPersonas(args.request),
  ]);

  return {
    models: [...localModels, ...agentClis],
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
  const personaId = effectiveToolbar.personaId;
  const reasoning = effectiveToolbar.reasoning;
  const repositoryId = effectiveToolbar.repositoryId;
  const serviceTier = effectiveToolbar.serviceTier;

  const composerTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

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
        onPersonaChange={setPersonaId}
        onReasoningChange={setReasoning}
        onServiceTierChange={setServiceTier}
        permissionMode={permissionMode}
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
    <GlobalScreen
      beta={true}
      className="flex flex-1 flex-col justify-end p-4 md:p-8 lg:p-12"
    >
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
        {turn.error ? (
          <p className="text-destructive mb-2 text-center text-sm">
            {turn.error}
          </p>
        ) : null}
        {voice.error ? (
          <p className="text-destructive mb-2 text-center text-sm">
            {voice.error}
          </p>
        ) : null}
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
          textAreaRef={composerTextAreaRef}
          toolbar={toolbar}
        />
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
