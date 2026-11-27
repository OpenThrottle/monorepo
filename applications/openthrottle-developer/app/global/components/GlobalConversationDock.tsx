import {
  CHAT_PANEL_HOVER_CLASSES,
  ChatConversationSidebar,
} from '@openthrottle/react-router-chat';
import { Button, cn } from '@openthrottle/react-router-shadcn';
import { MessageSquare } from 'lucide-react';
import * as React from 'react';

import { CONVERSATION_DOCK_COPY } from '~/global/data/copy';
import { useConversationDock } from '~/global/hooks/useConversationDock';
import type { ChatDockState } from '~/global/utils/chat-dock-cookie';

export interface GlobalConversationDockProps {
  /** Whether conversations may be fetched; false while logged out. */
  readonly enabled: boolean;
  /** The dock state the root loader read from the cookie. */
  readonly initialState: ChatDockState;
}

/**
 * @description The conversations column docked between the primary nav and
 * the page on every route, pinned below the sticky header (it reads the
 * header's `--global-header-height`, as the session drawer does) (md and up; smaller screens keep the chat route's
 * conversation sheet). Collapses to a slim rail with a Show chats button. One
 * chat icon marks the state on both toggles: outlined collapsed, filled open.
 * Opening and closing animate the slot's width; the column keeps its full
 * width inside the clipping slot so rows never reflow mid-animation. A CSS
 * transition only runs on a change, so the cookie-restored state paints in
 * place on SSR and hydration.
 */
export const GlobalConversationDock = (
  props: GlobalConversationDockProps,
): React.ReactElement => {
  const { enabled, initialState } = props;

  // Hooks
  const dock = useConversationDock({ enabled, initialState });

  // Setup
  const copy = CONVERSATION_DOCK_COPY;
  const { list } = dock;
  const slotClassName = cn(
    'bg-background flex h-full overflow-hidden border-r transition-[width] duration-200 ease-out motion-reduce:transition-none',
    dock.isOpen ? 'w-72' : 'w-10',
  );

  // Handlers

  // Markup
  const collapseButton = (
    <Button
      aria-label={copy.collapse}
      className={CHAT_PANEL_HOVER_CLASSES}
      data-testid="GlobalConversationDock-collapse"
      onClick={dock.toggleOpen}
      size="icon"
      title={copy.collapse}
      type="button"
      variant="ghost"
    >
      <MessageSquare
        className="size-4 fill-current"
        data-testid="GlobalConversationDock-icon-open"
      />
    </Button>
  );

  // A click anywhere on the rail opens the dock. The Show button stays the
  // one focusable, labelled control: its own click (mouse, Enter or Space)
  // bubbles here, so it carries no handler of its own.
  const rail = (
    <div
      className={cn(
        'flex h-full w-10 shrink-0 cursor-pointer flex-col items-center py-2',
        CHAT_PANEL_HOVER_CLASSES,
      )}
      data-testid="GlobalConversationDock-rail"
      onClick={dock.toggleOpen}
    >
      <Button
        aria-label={copy.show}
        className={CHAT_PANEL_HOVER_CLASSES}
        data-testid="GlobalConversationDock-show"
        size="icon"
        title={copy.show}
        type="button"
        variant="ghost"
      >
        <MessageSquare
          className="size-4"
          data-testid="GlobalConversationDock-icon-closed"
        />
      </Button>
    </div>
  );

  const column = (
    <aside
      aria-label={copy.region}
      className="flex w-72 shrink-0 flex-col py-1"
      data-testid="GlobalConversationDock"
    >
      <ChatConversationSidebar
        activeConversationId={dock.activeConversationId}
        className="min-h-0 flex-1"
        conversations={list.conversations}
        errorMessage={list.errorMessage}
        grouping={dock.grouping}
        headerEnd={collapseButton}
        isLoading={list.isLoading}
        isLoadingMore={list.isLoadingMore}
        onDelete={list.remove}
        onLoadMore={list.loadMore}
        onNewChat={dock.newChat}
        onRename={list.rename}
        onRestore={list.restore}
        onRetry={list.refresh}
        onSelect={dock.selectConversation}
        totalCount={list.totalCount}
      />
    </aside>
  );

  // Pointer-only mirror of the rail: a strip just past the open column's edge
  // collapses it. It sits outside the border so it never covers rows, the row
  // menu or the scrollbar; the collapse button stays the labelled control.
  const edge = (
    <div
      aria-hidden={true}
      className="hover:bg-border absolute inset-y-0 -right-2 z-20 w-2 cursor-pointer transition-colors"
      data-testid="GlobalConversationDock-edge"
      onClick={dock.toggleOpen}
      title={copy.collapse}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="sticky top-(--global-header-height,0px) z-10 hidden h-[calc(100svh-var(--global-header-height,0px))] shrink-0 md:flex">
      <div
        className={slotClassName}
        data-state={dock.isOpen ? 'open' : 'closed'}
        data-testid="GlobalConversationDock-slot"
      >
        {dock.isOpen ? column : rail}
      </div>
      {dock.isOpen ? edge : null}
    </div>
  );
};
