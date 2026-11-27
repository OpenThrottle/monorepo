import * as React from 'react';

import { HomeSessionDrawer } from '~/routing/home/components/HomeSessionDrawer';
import type { HomeThreadColumnProps } from '~/routing/home/components/HomeThreadColumn';
import { HomeThreadColumn } from '~/routing/home/components/HomeThreadColumn';
import { useCheckoutDiff } from '~/routing/home/hooks/useCheckoutDiff';
import type { UseSessionDrawerResult } from '~/routing/home/hooks/useSessionDrawer';
import { isCheckoutDiffVisible } from '~/routing/home/utils/isCheckoutDiffVisible';

export interface HomeLayoutProps extends Pick<
  HomeThreadColumnProps,
  'composerData' | 'conversationList' | 'turn'
> {
  /** The session drawer's state, shared with the toolbar's sheet trigger. */
  readonly drawer: UseSessionDrawerResult;
}

/**
 * @description The home route's body: the centered thread column, with the
 * session drawer as a sibling on its right (md and up) so the thread stays
 * centered in the space that is left. An empty thread shows the hero line.
 * Extracted from the route so the route file stays inside the 210-line cap.
 */
export const HomeLayout = (props: HomeLayoutProps): React.ReactElement => {
  const { composerData, conversationList, drawer, turn } = props;

  // Hooks
  const checkoutDiff = useCheckoutDiff({
    checkoutId: drawer.environment?.checkout?.id,
    isEnabled: isCheckoutDiffVisible(drawer),
    isStreaming: turn.isStreaming,
  });

  // Setup
  const isEmptyThread = turn.messages.length === 0;

  // Handlers

  // Markup

  const hero = (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-center text-2xl">
        What would you like to build today?
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        OpenThrottle is a platform for building software, iteratively, and
        securely.
      </p>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-1" data-testid="HomeLayout">
      <div className="flex min-w-0 flex-1 flex-col justify-end p-4 pt-2 md:p-8 md:pt-4 lg:p-12 lg:pt-4">
        {isEmptyThread ? hero : null}

        <HomeThreadColumn
          composerData={composerData}
          conversationList={conversationList}
          onEnvironmentChange={drawer.setEnvironment}
          turn={turn}
        />
      </div>

      <HomeSessionDrawer
        changes={checkoutDiff}
        collapsedSections={drawer.collapsedSections}
        environment={drawer.environment}
        isOpen={drawer.isOpen}
        isSheetOpen={drawer.isSheetOpen}
        isStreaming={turn.isStreaming}
        messages={turn.messages}
        onSheetOpenChange={drawer.setSheetOpen}
        onToggleOpen={drawer.toggleOpen}
        onToggleSection={drawer.toggleSection}
        queuedMessages={turn.queuedMessages}
      />
    </div>
  );
};
