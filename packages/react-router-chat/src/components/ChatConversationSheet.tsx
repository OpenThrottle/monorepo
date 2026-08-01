import * as React from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { ChatConversationSidebar } from './ChatConversationSidebar';
import type { ChatConversationSidebarProps } from './ChatConversationSidebar';

export interface ChatConversationSheetProps extends ChatConversationSidebarProps {
  /** Controls the sheet open state externally; omit to keep it uncontrolled. */
  readonly onOpenChange?: (open: boolean) => void;
  /** External open state; pair with {@link onOpenChange} to control the sheet. */
  readonly open?: boolean;
  /** Edge the sheet slides in from. Default `'left'`. */
  readonly side?: 'left' | 'right';
  /** data-testid for the default icon-button trigger. */
  readonly triggerTestId?: string;
}

/**
 * @description Wraps the fully-controlled {@link ChatConversationSidebar} in a
 * shadcn `Sheet` so the conversation list stays out of the way behind a
 * "Conversations" trigger until opened. Selecting a conversation or starting a
 * New chat closes the sheet; rename, delete, and load-more keep it open. Owns
 * only open/close state — every list prop and handler still comes from the
 * consumer. Uncontrolled by default; pass {@link open} + {@link onOpenChange} to
 * drive it externally.
 *
 * @public
 */
export const ChatConversationSheet = (
  props: ChatConversationSheetProps,
): React.ReactElement => {
  const {
    onNewChat,
    onOpenChange,
    onSelect,
    open,
    side = 'left',
    triggerTestId = 'ChatConversationSheet-trigger',
    ...sidebar
  } = props;

  // Hooks
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  // Handlers
  const setOpen = (next: boolean): void => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  // Picking a thread or starting fresh dismisses the sheet; rename/delete/
  // load-more all keep it open so the user can keep managing the list.
  const handleSelect = (conversationId: string): void => {
    onSelect(conversationId);
    setOpen(false);
  };

  const handleNewChat = (): void => {
    onNewChat();
    setOpen(false);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={setOpen} open={isOpen}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild={true}>
          <SheetTrigger asChild={true}>
            <Button
              aria-label={copy.title}
              className="shrink-0"
              data-testid={triggerTestId}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MessagesSquare aria-hidden={true} className="size-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>{copy.title}</TooltipContent>
      </Tooltip>
      <SheetContent
        className="flex flex-col gap-0 p-0"
        data-testid="ChatConversationSheet"
        side={side}
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b px-4 py-3 pr-12 text-left">
          <div className="flex min-w-0 flex-col">
            <SheetTitle className="text-sm font-medium">
              {copy.title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {copy.switcherDescription}
            </SheetDescription>
          </div>
          <Button
            aria-label={copy.newChat}
            data-testid="ChatConversationSheet-new-chat"
            onClick={handleNewChat}
            size="sm"
            type="button"
            variant="ghost"
          >
            <MessageSquarePlus className="size-4" />
            {copy.newChat}
          </Button>
        </SheetHeader>
        <ChatConversationSidebar
          {...sidebar}
          className="min-h-0 flex-1"
          hideHeader={true}
          onNewChat={handleNewChat}
          onSelect={handleSelect}
        />
      </SheetContent>
    </Sheet>
  );
};
