import { Suspense, useEffect, useRef } from 'react';
import { Await, useSearchParams } from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
import { ChatThread } from '@openthrottle/react-router-chat';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { HomeComposer } from '~/routing/home/components/HomeComposer';
import { HomeComposerDock } from '~/routing/home/components/HomeComposerDock';
import { HomeConversationToolbar } from '~/routing/home/components/HomeConversationToolbar';
import { HomeComposerSkeleton } from '~/routing/home/components/HomeComposerSkeleton';
import {
  loadComposerModels,
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
  // (loadComposerModels probes local model servers). loadComposerModels issues
  // each discovery query once and derives the local / agent / driver×endpoint
  // lists from the shared payloads. Bundled into one Promise.all so
  // reconcileChatToolbarState reconciles them atomically on the client.
  const composerData = Promise.all([
    loadComposerModels(args.request),
    loadRepositories(args.request),
    loadPersonas(args.request),
  ]).then(([models, repositories, personas]) => ({
    models,
    personas,
    repositories,
  }));

  return { composerData };
};

// The composer discovery data is route-stable, and both the server (SWR cache)
// and the header chat (client cache) already keep repeat loads cheap. Skip
// re-running this loader for same-path navigations (e.g. search-param changes
// from opening a dialog) so a churn of `?…` updates doesn't re-probe. A form
// submission or a navigation from a different route still revalidates.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  defaultShouldRevalidate,
  formMethod,
  nextUrl,
}) => {
  if (formMethod === undefined && currentUrl.pathname === nextUrl.pathname) {
    return false;
  }

  return defaultShouldRevalidate;
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

  // Hooks

  // Deep-link entry point: `/?conversationId=<id>` (e.g. from the dashboard
  // "Recent chats" card) restores that conversation on mount. `turn` is fresh
  // each render, so read it through a ref to keep the effect keyed only on the
  // param; a ref of the last-restored id makes restore fire once per distinct
  // param value (not on every render, nor when in-page navigation changes other
  // search params).
  const [searchParams] = useSearchParams();
  // The streaming turn lifecycle (thread state, start/cancel to the
  // conversation-stream resource action, live subscription, pending overlay)
  // lives in a reusable hook shared with the global header chat. It is client
  // state — independent of the loader — so the shell renders without waiting.
  const turn = useAgenticChatTurn();
  const restoredConversationIdRef = useRef<string | null>(null);
  const turnRef = useRef(turn);
  turnRef.current = turn;

  // Persisted-conversation list backing the sidebar (list + rename + delete +
  // refresh); posts to the route-independent resource action.
  const conversationList = useConversationList();

  // Setup
  const isEmptyThread = turn.messages.length === 0;
  const conversationIdParam = searchParams.get('conversationId');

  // Handlers
  const onNewChat = (): void => {
    turn.reset();
  };

  const onSelectConversation = (conversationId: string): void => {
    turn.restore({ conversationId });
  };

  // Markup

  // Life Cycle
  useEffect(() => {
    const id = conversationIdParam?.trim() ?? '';
    if (id === '') {
      return;
    }

    const activeTurn = turnRef.current;
    if (
      id === activeTurn.conversationId ||
      id === restoredConversationIdRef.current
    ) {
      return;
    }

    restoredConversationIdRef.current = id;
    activeTurn.restore({ conversationId: id });
  }, [conversationIdParam]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-1 flex-col">
      <HomeConversationToolbar
        activeConversationId={turn.conversationId}
        conversationList={conversationList}
        onNewChat={onNewChat}
        onSelectConversation={onSelectConversation}
      />

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
          {/* Outside the <Await> on purpose: the thread needs no deferred
              data, and the fallback→composer swap must not re-mount it. */}
          <ChatThread
            canRetry={turn.canRetry}
            emptyStateLabel=""
            messages={turn.messages}
            onRetry={turn.onRetry}
          />

          {/* Docked so the composer stays reachable however far up you
              scroll; the skeleton shares the dock, so nothing shifts. */}
          <HomeComposerDock>
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
          </HomeComposerDock>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
