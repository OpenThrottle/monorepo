import * as React from 'react';
import { Await } from 'react-router';
import { ChatJumpToLatest, ChatThread } from '@openthrottle/react-router-chat';
import { getGlobalScrollElement } from '@openthrottle/react-router-ui-global';
import { HomeComposer } from '~/routing/home/components/HomeComposer';
import { HomeComposerDock } from '~/routing/home/components/HomeComposerDock';
import { HomeComposerSkeleton } from '~/routing/home/components/HomeComposerSkeleton';
import type { HomeComposerProps } from '~/routing/home/components/HomeComposer';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';

type ComposerData = Pick<
  HomeComposerProps,
  'models' | 'personas' | 'repositories'
>;

export interface HomeThreadColumnProps {
  /** The deferred composer-data bundle from the home loader. */
  composerData: Promise<ComposerData>;
  /** Sidebar-backing conversation list, forwarded to the composer. */
  conversationList: UseConversationListResult;
  /** Streaming turn lifecycle shared with the route and sidebar. */
  turn: UseAgenticChatTurnResult;
}

/**
 * @description The reading column of the home route: the thread, the docked
 * composer, and the control that gets you back to the newest message.
 *
 * The thread does not own its scroll here — `GlobalLayout`'s wrapper is the
 * page's only scroll container — so it is handed that element explicitly, and
 * the pin state it reports drives a jump control docked with the composer. An
 * empty thread has nothing to jump to, so the control stays hidden there
 * regardless of pin state.
 */
export const HomeThreadColumn = (
  props: HomeThreadColumnProps,
): React.ReactElement => {
  const { composerData, conversationList, turn } = props;

  // Hooks
  const repinRef = React.useRef<(() => void) | null>(null);
  const [isPinned, setIsPinned] = React.useState<boolean>(true);

  // Setup
  const isEmptyThread = turn.messages.length === 0;

  // Handlers
  const onJumpToLatest = React.useCallback((): void => {
    repinRef.current?.();
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Outside the <Await> on purpose: the thread needs no deferred
          data, and the fallback→composer swap must not re-mount it. */}
      <ChatThread
        canRetry={turn.canRetry}
        emptyStateLabel=""
        getScrollElement={getGlobalScrollElement}
        messages={turn.messages}
        onPinnedChange={setIsPinned}
        onRetry={turn.onRetry}
        repinRef={repinRef}
      />

      {/* Docked so the composer stays reachable however far up you
          scroll; the skeleton shares the dock, so nothing shifts. */}
      <HomeComposerDock>
        {/* Floats above the dock, over the gradient, so appearing and
            disappearing never shifts the composer. */}
        <ChatJumpToLatest
          className="absolute inset-x-0 bottom-full z-10 mx-auto mb-2 w-fit"
          isPinned={isPinned || isEmptyThread}
          onJump={onJumpToLatest}
        />

        {/* Deferred: the composer + toolbar subtree needs the streamed
            models/personas/repositories. It streams in behind a disabled
            skeleton so the input frame is visibly present immediately. The
            home loader helpers catch→[] (the promise resolves), but the
            errorElement guards defensively against an unexpected reject. */}
        <React.Suspense fallback={<HomeComposerSkeleton />}>
          <Await
            errorElement={
              <p className="text-muted-foreground py-4 text-center text-sm">
                Couldn&rsquo;t load composer options. Reload to try again.
              </p>
            }
            resolve={composerData}
          >
            {(data: ComposerData) => (
              <HomeComposer
                conversationList={conversationList}
                models={data.models}
                personas={data.personas}
                repositories={data.repositories}
                turn={turn}
              />
            )}
          </Await>
        </React.Suspense>
      </HomeComposerDock>
    </div>
  );
};
