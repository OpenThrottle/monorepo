import { useState, useRef, useMemo, useEffect } from 'react';
import {
  ChatComposer,
  ChatComposerMode,
  ChatComposerToolbar,
  ChatThread,
  type ChatMessage,
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
import { decodeChatOption } from '~/routing/home/utils/chat-model-option';
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
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatComposerMode>(ChatComposerMode.plan);
  const [modelId, setModelId] = useState<string | undefined>(models[0]?.id);
  const [personaId, setPersonaId] = useState<string | undefined>(personas[0]?.id); // prettier-ignore
  const [repositoryId, setRepositoryId] = useState<string | undefined>(repositories[0]?.id); // prettier-ignore
  const cancelFetcher = useFetcher();
  const localIdRef = useRef(0);
  const startFetcher = useFetcher<StartActionResult>();

  // Setup
  const stream = useConversationStream({
    conversationId,
    seedMessages: EMPTY_SEED,
  });

  // Streamed assistant bodies overlay the ordered placeholders by message id.
  const streamedById = useMemo(
    () => new Map(stream.messages.map((message) => [message.id, message.body])),
    [stream.messages],
  );

  const threadMessages = useMemo(() => {
    return messages.map((message) => {
      const streamed = streamedById.get(message.id);
      const isUndefined = streamed === undefined;

      return isUndefined ? message : { ...message, body: streamed };
    });
  }, [messages, streamedById]);

  const isStreaming = startFetcher.state !== 'idle' || stream.isStreaming;
  const isEmptyThread = threadMessages.length === 0;

  const decodedOption = modelId ? decodeChatOption(modelId) : null;
  const isCliBackend =
    decodedOption !== null && decodedOption.backend !== 'openai';

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

    startFetcher.submit(
      decoded.backend === 'openai'
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
            intent: 'start',
            message: trimmed,
            personaId: personaId ?? '',
            repositoryId: repositoryId ?? '',
          },
      { method: 'post' },
    );
  };

  const onStop = (): void => {
    if (!conversationId) {
      return;
    }

    cancelFetcher.submit(
      { conversationId, intent: 'cancel' },
      { method: 'post' },
    );
  };

  // Markup
  const toolbar = (
    <div className="flex flex-col gap-2">
      <ChatComposerToolbar
        contextSources={CHAT_TOOLBAR_CONTEXT_SOURCES}
        mode={mode}
        modelId={modelId}
        models={models}
        onAddContext={() => {}}
        onModeChange={setMode}
        onModelChange={setModelId}
        onPersonaChange={setPersonaId}
        personaId={personaId}
        personas={personas}
      />
      {isCliBackend ? (
        hasRepositories ? (
          <select
            aria-label="Repository"
            className="border-input bg-background text-foreground w-fit rounded-md border px-2 py-1 text-sm"
            onChange={(event) =>
              setRepositoryId(event.target.value || undefined)
            }
            value={repositoryId ?? ''}
          >
            <option value="">Select a repository…</option>
            {repositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.displayName}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-muted-foreground text-xs">
            Register a local repository in Settings to run an agent CLI.
          </p>
        )
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
      setMessages((previous) =>
        previous.some((message) => message.id === assistantId)
          ? previous
          : [...previous, { body: '', id: assistantId, role: 'assistant' }],
      );
    }
  }, [startFetcher.data]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-1 flex-col justify-end p-4 md:p-8 lg:p-12">
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
        {!hasModels ? (
          <p className="text-muted-foreground mb-2 text-center text-sm">
            No local models discovered. Start a local OpenAI-compatible server
            (e.g. Ollama) and reload.
          </p>
        ) : null}
        <ChatComposer
          className="border-t-0"
          disabled={!hasModels}
          isStreaming={isStreaming}
          onStop={onStop}
          onSubmit={onSubmit}
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
    message: String(formData.get('message') ?? ''),
    modelId: String(formData.get('modelId') ?? '') || null,
    personaId: String(formData.get('personaId') ?? '') || null,
    repositoryId: String(formData.get('repositoryId') ?? '') || null,
  };

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      StartConversationStreamDocument,
      { input },
    );

    return data.startConversationStream;
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
