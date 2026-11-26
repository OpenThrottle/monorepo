import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import type { ShouldRevalidateFunction } from 'react-router';
import { useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/_index';
import { SITE_TITLE } from '~/global/config/settings';
import { markDeferredHandled } from '~/global/utils/markDeferredHandled';
import { HomeConversationToolbar } from '~/routing/home/components/HomeConversationToolbar';
import { HomeLayout } from '~/routing/home/components/HomeLayout';
import { useAgenticChatTurn } from '~/routing/home/hooks/useAgenticChatTurn';
import { useConversationList } from '~/routing/home/hooks/useConversationList';
import { useNewChatRequest } from '~/routing/home/hooks/useNewChatRequest';
import { useSessionDrawer } from '~/routing/home/hooks/useSessionDrawer';
import {
  clearConversationIdParam,
  writeConversationIdParam,
} from '~/routing/home/utils/conversation-url';
import { loadHomeComposer } from '~/routing/home/utils/home-composer-cache';
import {
  loadComposerData,
  loadDefaultAgent,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/utils/models.server';
import { parseSessionDrawerCookie } from '~/routing/home/utils/session-drawer-cookie';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = (args: Route.LoaderArgs) => {
  // Deferred: return the composer-data bundle as a naked promise (RR8 Single
  // Fetch serializes/streams it) so the route shell — hero + conversation
  // sidebar — paints immediately instead of blocking on cold model discovery
  // (loadComposerData probes local model servers). loadComposerData issues
  // each discovery query once and derives the local / agent / driver×endpoint
  // lists from the shared payloads. Bundled into one Promise.all so
  // reconcileChatToolbarState reconciles them atomically on the client.
  const composerData = Promise.all([
    loadComposerData(args.request),
    loadRepositories(args.request),
    loadPersonas(args.request),
    loadDefaultAgent(args.request),
  ]).then(
    ([{ agentRuntimes, models }, repositories, personas, defaultAgent]) => ({
      agentRuntimes,
      defaultAgent,
      models,
      personas,
      repositories,
    }),
  );

  // React Router owns it only after every loader in the match settles; until
  // then a rejection would be unhandled and exit the server.
  markDeferredHandled([composerData]);

  return {
    composerData,
    sessionDrawer: parseSessionDrawerCookie(
      args.request.headers.get('cookie') ?? '',
    ),
  };
};

// Five-minute client cache for the composer bundle (SSR still runs first).
export const clientLoader = (args: Route.ClientLoaderArgs) => {
  return {
    composerData: loadHomeComposer(async () => {
      return (await args.serverLoader()).composerData;
    }),
    sessionDrawer: parseSessionDrawerCookie(document.cookie),
  };
};

// Same-path `?…` navigations never re-probe. Submissions keep the default;
// root's shouldRevalidate (matched on every route) drops the composer cache
// first for any non-chat one, so an edit made on another route is seen too.
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
  const { composerData, sessionDrawer } = loaderData;

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
  const restoredConversationIdRef = React.useRef<string | null>(null);
  const turnRef = React.useRef(turn);
  turnRef.current = turn;

  // Persisted-conversation list backing the sidebar (list + rename + delete +
  // refresh); posts to the route-independent resource action. `/` sits behind
  // authMiddleware, so a rendered home route always has a user.
  const conversationList = useConversationList({ enabled: true });

  // The session drawer beside the thread: open/collapsed state (cookie-backed,
  // so SSR matches) and the composer's reported environment.
  const drawer = useSessionDrawer({ initialState: sessionDrawer });

  // Setup
  const conversationIdParam = searchParams.get('conversationId');

  // Handlers
  const onNewChat = (): void => {
    restoredConversationIdRef.current = null;
    turn.reset();
    // Drop the live-synced id so a reload after New chat is a blank composer.
    clearConversationIdParam();
  };

  const onSelectConversation = (conversationId: string): void => {
    turn.restore({ conversationId });
    // A listed conversation always has a row, so it is reloadable even with
    // the composer's Private toggle on (which gates the live-turn write).
    writeConversationIdParam(conversationId);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
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

  useNewChatRequest({ onNewChat });

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-1 flex-col">
      <HomeConversationToolbar
        activeConversationId={turn.conversationId}
        conversationList={conversationList}
        onNewChat={onNewChat}
        onOpenSessionDrawer={() => drawer.setSheetOpen(true)}
        onSelectConversation={onSelectConversation}
      />

      <HomeLayout
        composerData={composerData}
        conversationList={conversationList}
        drawer={drawer}
        turn={turn}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
