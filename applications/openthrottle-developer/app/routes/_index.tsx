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
import * as React from 'react';
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
import { loadDiscoveredModels } from '~/routing/home/data/models.server';
import { useConversationStream } from '~/routing/home/hooks/useConversationStream';
import { decodeModelOptionId } from '~/routing/home/utils/chat-model-option';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

/** Stable empty seed: history seeding is keyed off a conversation in the URL, which the home route has none of. */
const EMPTY_SEED: readonly ChatMessage[] = [];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const models = await loadDiscoveredModels(args.request);
  return { models };
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

  const { models } = loaderData;
  const hasModels = models.length > 0;

  // Hooks
  const [modelId, setModelId] = React.useState<string | undefined>(
    models[0]?.id,
  );
  const [personaId, setPersonaId] = React.useState<string | undefined>(
    CHAT_TOOLBAR_PERSONAS[0]?.id,
  );
  const [mode, setMode] = React.useState<ChatComposerMode>(
    ChatComposerMode.plan,
  );
  const [conversationId, setConversationId] = React.useState<string | null>(
    null,
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const startFetcher = useFetcher<StartActionResult>();
  const cancelFetcher = useFetcher();
  const localIdRef = React.useRef(0);

  // Setup
  const stream = useConversationStream({
    conversationId,
    seedMessages: EMPTY_SEED,
  });

  // Streamed assistant bodies overlay the ordered placeholders by message id.
  const streamedById = React.useMemo(
    () => new Map(stream.messages.map((message) => [message.id, message.body])),
    [stream.messages],
  );
  const threadMessages = React.useMemo<ChatMessage[]>(
    () =>
      messages.map((message) => {
        const streamed = streamedById.get(message.id);
        return streamed === undefined
          ? message
          : { ...message, body: streamed };
      }),
    [messages, streamedById],
  );

  const isStreaming = startFetcher.state !== 'idle' || stream.isStreaming;

  // Handlers
  const onSubmit = (message: string): void => {
    const trimmed = message.trim();
    const decoded = modelId ? decodeModelOptionId(modelId) : null;
    if (!trimmed || !decoded) {
      return;
    }

    setError(null);
    localIdRef.current += 1;
    const userId = `local-user-${localIdRef.current}`;
    setMessages((previous) => [
      ...previous,
      { body: trimmed, id: userId, role: 'user' },
    ]);

    startFetcher.submit(
      {
        baseUrl: decoded.baseUrl,
        conversationId: conversationId ?? '',
        intent: 'start',
        message: trimmed,
        modelId: decoded.model,
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
      personas={CHAT_TOOLBAR_PERSONAS}
    />
  );

  // Life Cycle
  React.useEffect(() => {
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
    <GlobalScreen className="flex flex-1 flex-col p-4 md:p-8 lg:p-12">
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-center text-2xl">
          What would you like to build today?
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          OpenThrottle is a platform for building applications based on best
          practices for Agentic development.
        </p>
      </div>

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
    baseUrl: String(formData.get('baseUrl') ?? ''),
    conversationId: conversationId || null,
    message: String(formData.get('message') ?? ''),
    modelId: String(formData.get('modelId') ?? ''),
  };

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      StartConversationStreamDocument,
      { input },
    );
    return data.startConversationStream;
  } catch (caught) {
    return {
      assistantMessageId: null,
      conversationId: null,
      errorMessage:
        caught instanceof Error ? caught.message : 'Failed to start stream.',
      userMessageId: null,
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
