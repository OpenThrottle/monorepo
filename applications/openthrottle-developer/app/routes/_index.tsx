import { Suspense } from 'react';
import { Await } from 'react-router';
import { ChatConversationSheet } from '@openthrottle/react-router-chat';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { HomeComposer } from '~/routing/home/components/HomeComposer';
import { HomeComposerSkeleton } from '~/routing/home/components/HomeComposerSkeleton';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadDriverEndpointModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/data/models.server';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { useConversationList } from '~/routing/home/hooks/useConversationList';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = (args: Route.LoaderArgs) => {
  // Deferred: return the composer-data bundle as a naked promise (RR8 Single
  // Fetch serializes/streams it) so the route shell — hero + conversation
  // sidebar — paints immediately instead of blocking on cold model discovery
  // (loadDiscoveredModels / loadDriverEndpointModels probe local model servers).
  // Bundled into one Promise.all so reconcileChatToolbarState reconciles the
  // three lists atomically on the client.
  const composerData = Promise.all([
    loadDiscoveredModels(args.request),
    loadAgentClis(args.request),
    loadDriverEndpointModels(args.request),
    loadRepositories(args.request),
    loadPersonas(args.request),
  ]).then(
    ([
      localModels,
      agentClis,
      driverEndpointModels,
      repositories,
      personas,
    ]) => ({
      models: [...localModels, ...agentClis, ...driverEndpointModels],
      personas,
      repositories,
    }),
  );

  return { composerData };
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

  const { composerData } = loaderData;

  // The streaming turn lifecycle (thread state, start/cancel to the
  // conversation-stream resource action, live subscription, pending overlay)
  // lives in a reusable hook shared with the global header chat. It is client
  // state — independent of the loader — so the shell renders without waiting.
  const turn = useAgenticChatTurn();

  // Persisted-conversation list backing the sidebar (list + rename + delete +
  // refresh); posts to the route-independent resource action.
  const conversationList = useConversationList();

  const isEmptyThread = turn.messages.length === 0;

  // Handlers
  const onNewChat = (): void => {
    turn.reset();
  };

  const onSelectConversation = (conversationId: string): void => {
    turn.restore({ conversationId });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-1 flex-col">
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
              OpenThrottle is a platform for building software, fast, and
              secure.
            </p>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl">
          {/* Deferred: the composer + toolbar subtree needs the streamed
              models/personas/repositories. It streams in behind a disabled
              skeleton so the input frame is visibly present immediately. The
              home loader helpers catch→[] (the promise resolves), but the
              errorElement guards defensively against an unexpected reject. */}
          <Suspense fallback={<HomeComposerSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Couldn&rsquo;t load composer options. Reload to try again.
                </p>
              }
              resolve={composerData}
            >
              {(data) => (
                <HomeComposer
                  conversationList={conversationList}
                  models={data.models}
                  personas={data.personas}
                  repositories={data.repositories}
                  turn={turn}
                />
              )}
            </Await>
          </Suspense>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
