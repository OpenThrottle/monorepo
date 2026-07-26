import { useState, useRef, useMemo, useEffect } from 'react';
import {
  ChatComposer,
  ChatComposerMode,
  ChatComposerToolbar,
  ChatThread,
  parseFileMentions,
  type ChatMessage,
  type ChatPermissionMode,
  type ChatReasoningLevel,
  type ChatServiceTier,
} from '@openthrottle/react-router-chat';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useFetcher } from 'react-router';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';
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
import { useConversationStream } from '~/routing/home/hooks/useConversationStream';
import { useFileMentionProvider } from '~/routing/home/hooks/useFileMentionProvider';
import { useVoiceInput } from '~/routing/home/hooks/useVoiceInput';
import { capabilitiesForChatOption } from '~/routing/home/utils/chat-capabilities';
import {
  buildModelGroups,
  decodeChatOption,
} from '~/routing/home/utils/chat-model-option';
import type { Route } from '@/app/routes/+types/_index';

/**
 * Stable empty seed: history seeding is keyed off a conversation in the URL, which the home route has none of.
 */
const EMPTY_SEED: readonly ChatMessage[] = [];

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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatComposerMode>(ChatComposerMode.plan);
  const [modelId, setModelId] = useState<string | undefined>(models[0]?.id);
  // The assistant turn that has been started but not yet reached a terminal
  // chunk. Keeps the composer in its streaming state and renders a running
  // indicator on the placeholder while a slow backend (e.g. cursor-agent, which
  // emits its whole turn in one end-of-turn burst) has produced nothing yet.
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null); // prettier-ignore
  const [permissionMode, setPermissionMode] = useState<ChatPermissionMode | undefined>(undefined); // prettier-ignore
  const [personaId, setPersonaId] = useState<string | undefined>(personas[0]?.id); // prettier-ignore
  const [reasoning, setReasoning] = useState<ChatReasoningLevel | undefined>(undefined); // prettier-ignore
  const [repositoryId, setRepositoryId] = useState<string | undefined>(repositories[0]?.id); // prettier-ignore
  const [serviceTier, setServiceTier] = useState<ChatServiceTier | undefined>(undefined); // prettier-ignore
  const cancelFetcher = useFetcher();
  const composerTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const localIdRef = useRef(0);
  const startFetcher = useFetcher<StartActionResult>();

  // Setup
  const stream = useConversationStream({
    conversationId,
    seedMessages: EMPTY_SEED,
  });

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

  // Streamed assistant turns overlay the ordered placeholders by message id,
  // carrying both the flat body (fallback) and the structured `events`
  // timeline (thinking / tool calls / output) so the thread renders the rich,
  // collapsible turn rather than the flat text.
  const streamedById = useMemo(
    () => new Map(stream.messages.map((message) => [message.id, message])),
    [stream.messages],
  );

  const threadMessages = useMemo(() => {
    return messages.map((message) => {
      const streamed = streamedById.get(message.id);
      // Overlay streamed body/events when present. Keep `pending` while this is
      // the in-flight assistant turn and nothing renderable has arrived yet —
      // including when the reducer already has an empty streamed entry.
      const base =
        streamed === undefined
          ? message
          : streamed.events !== undefined
            ? { ...message, body: streamed.body, events: streamed.events }
            : { ...message, body: streamed.body };

      const hasTimeline = base.events !== undefined && base.events.length > 0;
      const stillEmpty = (base.body?.trim() ?? '') === '' && !hasTimeline;
      const isPendingTurn = message.id === pendingAssistantId && stillEmpty;

      return isPendingTurn ? { ...base, pending: true } : base;
    });
  }, [messages, pendingAssistantId, streamedById]);

  const isStreaming =
    startFetcher.state !== 'idle' ||
    stream.isStreaming ||
    pendingAssistantId !== null;
  const isEmptyThread = threadMessages.length === 0;

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
      setError('Select a repository to run the agent in.');
      return;
    }

    setError(null);
    localIdRef.current += 1;

    const userId = `local-user-${localIdRef.current}`;
    const newMessage: ChatMessage = {
      body: trimmed,
      id: userId,
      role: 'user',
    };

    setMessages((previous) => [...previous, newMessage]);

    // @-mentioned files are parsed from the outgoing message and attached to the
    // payload. The @path tokens also remain inline in `message`, so a CLI agent
    // receives them directly; the structured list is for driver-side use
    // (dde67342). Only relevant for CLI backends, which run in a repository.
    const fileMentions = parseFileMentions(trimmed).map(
      (mention) => mention.path,
    );

    startFetcher.submit(
      decoded.baseUrl != null
        ? {
            backend: 'openai',
            baseUrl: decoded.baseUrl,
            conversationId: conversationId ?? '',
            intent: 'start',
            message: trimmed,
            modelId: decoded.model,
          }
        : {
            backend: decoded.backend,
            conversationId: conversationId ?? '',
            fileMentions: JSON.stringify(fileMentions),
            intent: 'start',
            message: trimmed,
            permissionMode: permissionMode ?? '',
            personaId: personaId ?? '',
            reasoning: reasoning ?? '',
            repositoryId: repositoryId ?? '',
            serviceTier: serviceTier ?? '',
          },
      { method: 'post' },
    );
  };

  const onStop = (): void => {
    if (!conversationId) {
      return;
    }

    // Leave the streaming state immediately; the terminal chunk may be missed
    // if the cancel lands before the stream published anything.
    setPendingAssistantId(null);

    cancelFetcher.submit(
      { conversationId, intent: 'cancel' },
      { method: 'post' },
    );
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
  useEffect(() => {
    const result = startFetcher.data;
    if (!result) {
      return;
    }

    if (result.errorMessage || !result.conversationId) {
      setError(result.errorMessage ?? 'Failed to start the conversation.');
      return;
    }

    setConversationId(result.conversationId);

    if (result.assistantMessageId) {
      const assistantId = result.assistantMessageId;
      setPendingAssistantId(assistantId);
      setMessages((previous) =>
        previous.some((message) => message.id === assistantId)
          ? previous
          : [...previous, { body: '', id: assistantId, role: 'assistant' }],
      );
    }
  }, [startFetcher.data]);

  // Clear the pending flag once the started turn reaches its terminal `done`
  // chunk (success or error), so the composer leaves its streaming state.
  useEffect(() => {
    if (
      pendingAssistantId !== null &&
      stream.completedIds.has(pendingAssistantId)
    ) {
      setPendingAssistantId(null);
    }
  }, [pendingAssistantId, stream.completedIds]);

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
        <ChatThread emptyStateLabel="" messages={threadMessages} />
        {error ? (
          <p className="text-destructive mb-2 text-center text-sm">{error}</p>
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
          isStreaming={isStreaming}
          mentionProvider={mentionProvider}
          onDraftChange={setDraft}
          onStop={onStop}
          onSubmit={onSubmit}
          readOnly={voice.isDraftFrozen}
          textAreaRef={composerTextAreaRef}
          toolbar={toolbar}
        />
      </div>
    </GlobalScreen>
  );
}

interface StartActionResult {
  readonly assistantMessageId: string | null;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly userMessageId: string | null;
}

/**
 * Decode the JSON-encoded `fileMentions` form field (workspace-relative paths
 * parsed from the composer draft) into a string array, or null when absent or
 * malformed. Defensive: the value is our own JSON.stringify output, but a bad
 * value must never 500 the turn.
 */
const parseFileMentionsField = (
  value: FormDataEntryValue | null,
): string[] | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const paths = parsed.filter(
      (entry): entry is string => typeof entry === 'string',
    );
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
};

export const action = async (
  args: Route.ActionArgs,
): Promise<StartActionResult | { cancelled: boolean }> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'cancel') {
    const conversationId = String(formData.get('conversationId') ?? '');
    if (conversationId) {
      await executeGraphqlWithAuth(
        args.request,
        CancelConversationStreamDocument,
        { conversationId },
      );
    }

    return { cancelled: true };
  }

  const conversationId = String(formData.get('conversationId') ?? '');
  const input = {
    backend: String(formData.get('backend') ?? '') || null,
    baseUrl: String(formData.get('baseUrl') ?? '') || null,
    conversationId: conversationId || null,
    fileMentions: parseFileMentionsField(formData.get('fileMentions')),
    message: String(formData.get('message') ?? ''),
    modelId: String(formData.get('modelId') ?? '') || null,
    permissionMode: String(formData.get('permissionMode') ?? '') || null,
    personaId: String(formData.get('personaId') ?? '') || null,
    reasoning: String(formData.get('reasoning') ?? '') || null,
    repositoryId: String(formData.get('repositoryId') ?? '') || null,
    serviceTier: String(formData.get('serviceTier') ?? '') || null,
  };

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      StartConversationStreamDocument,
      { input },
    );

    const result = data.startConversationStream;

    return {
      assistantMessageId: result.assistantMessageId ?? null,
      conversationId: result.conversationId ?? null,
      errorMessage: result.errorMessage ?? null,
      userMessageId: result.userMessageId ?? null,
    };
  } catch (error) {
    const isError = error instanceof Error;

    return {
      assistantMessageId: null,
      conversationId: null,
      errorMessage: isError ? error.message : 'Failed to start stream.',
      userMessageId: null,
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
