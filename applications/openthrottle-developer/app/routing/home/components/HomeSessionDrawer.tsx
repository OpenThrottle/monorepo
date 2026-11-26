import type { ChatSessionDrawerProps } from '@openthrottle/react-router-chat';
import { ChatSessionDrawer } from '@openthrottle/react-router-chat';
import {
  Button,
  cn,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import { PanelRight } from 'lucide-react';
import * as React from 'react';

import { HOME_SESSION_DRAWER_COPY } from '~/routing/home/data/copy';

export interface HomeSessionDrawerProps extends Pick<
  ChatSessionDrawerProps,
  | 'changes'
  | 'collapsedSections'
  | 'environment'
  | 'isStreaming'
  | 'messages'
  | 'onToggleSection'
  | 'queuedMessages'
> {
  /** Whether the inline column is open (md and up). */
  readonly isOpen: boolean;
  /** Whether the small-screen sheet is open. */
  readonly isSheetOpen: boolean;
  readonly onSheetOpenChange: (isSheetOpen: boolean) => void;
  readonly onToggleOpen: () => void;
}

/**
 * @description The home route's session drawer. From md up it is an inline
 * right column beside the thread that collapses to a slim rail with a show
 * button; opening and closing animate the slot's width, and the panel keeps its
 * full width inside the clipping slot so sections never reflow mid-animation.
 * Below md the same panel opens in a right-hand sheet from the toolbar button.
 */
export const HomeSessionDrawer = (
  props: HomeSessionDrawerProps,
): React.ReactElement => {
  const {
    changes,
    collapsedSections,
    environment,
    isOpen,
    isSheetOpen,
    isStreaming,
    messages,
    onSheetOpenChange,
    onToggleOpen,
    onToggleSection,
    queuedMessages,
  } = props;

  // Hooks

  // Setup
  const copy = HOME_SESSION_DRAWER_COPY;
  const slotClassName = cn(
    'bg-background flex h-full overflow-hidden border-l transition-[width] duration-200 ease-out motion-reduce:transition-none',
    isOpen ? 'w-80' : 'w-10',
  );

  // Handlers
  const closeSheet = (): void => {
    onSheetOpenChange(false);
  };

  // Markup
  const rail = (
    <div
      className="hover:bg-accent flex h-full w-10 shrink-0 cursor-pointer flex-col items-center py-2"
      data-testid="HomeSessionDrawer-rail"
      onClick={onToggleOpen}
    >
      <Button
        aria-label={copy.show}
        data-testid="HomeSessionDrawer-show"
        size="icon"
        title={copy.show}
        type="button"
        variant="ghost"
      >
        <PanelRight aria-hidden={true} className="size-4" />
      </Button>
    </div>
  );

  const column = (
    <div className="flex h-full w-80 shrink-0 flex-col">
      <ChatSessionDrawer
        changes={changes}
        collapsedSections={collapsedSections}
        environment={environment}
        isStreaming={isStreaming}
        messages={messages}
        onClose={onToggleOpen}
        onToggleSection={onToggleSection}
        queuedMessages={queuedMessages}
        showClose={true}
      />
    </div>
  );

  const sheet = (
    <Sheet onOpenChange={onSheetOpenChange} open={isSheetOpen}>
      <SheetContent
        className="flex w-80 flex-col gap-0 p-0 sm:max-w-80"
        data-testid="HomeSessionDrawer-sheet"
        side="right"
      >
        <SheetTitle className="sr-only">{copy.show}</SheetTitle>
        <SheetDescription className="sr-only">
          {copy.sheetDescription}
        </SheetDescription>
        <ChatSessionDrawer
          changes={changes}
          collapsedSections={collapsedSections}
          environment={environment}
          isStreaming={isStreaming}
          messages={messages}
          onClose={closeSheet}
          onToggleSection={onToggleSection}
          queuedMessages={queuedMessages}
          showClose={false}
        />
      </SheetContent>
    </Sheet>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div
        className="sticky top-0 z-10 hidden h-svh shrink-0 md:flex"
        data-testid="HomeSessionDrawer"
      >
        <div
          className={slotClassName}
          data-state={isOpen ? 'open' : 'closed'}
          data-testid="HomeSessionDrawer-slot"
        >
          {isOpen ? column : rail}
        </div>
      </div>
      {sheet}
    </>
  );
};
