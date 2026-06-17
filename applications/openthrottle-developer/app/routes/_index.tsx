import * as React from 'react';
import {
  ChatComposer,
  ChatComposerMode,
  ChatComposerToolbar,
  ChatThread,
} from '@openthrottle/react-router-chat';
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
import { loadDiscoveredModels } from '~/routing/home/data/models.server';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const models = await loadDiscoveredModels(args.request);
  return { conversationId: null, models, seedMessages: [] };
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
  const [isStreaming, setIsStreaming] = React.useState(false);

  // Setup

  // Handlers
  // Mock wiring: a submit fakes an in-flight turn so Send↔Stop is exercisable;
  // Stop just clears it. Real send/cancel land when the route is wired to the
  // agents chat fetcher.
  const onSubmit = (_message: string): void => {
    setIsStreaming(true);
  };

  const onStop = (): void => {
    setIsStreaming(false);
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
        <ChatThread emptyStateLabel="" messages={[]} />
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

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
