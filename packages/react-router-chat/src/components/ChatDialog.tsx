import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import type { ChatComposerControls } from '../context/chat-context';
import { ChatComposer } from './ChatComposer';
import { ChatComposerToolbar } from './ChatComposerToolbar';
import { ChatDialogHeader } from './ChatDialogHeader';
import type { ChatConversationSidebarProps } from './ChatConversationSidebar';
import { ChatThread } from './ChatThread';
import { useChatDialog } from '../hooks/use-chat-dialog';
import type { ChatMessage } from '../types';

type ChatDialogVariant = 'dialog' | 'sheet';

export interface ChatDialogProps {
  readonly className?: string;
  /**
   * Optional agentic-composer surface (seven-control toolbar + streaming). When
   * present — here or via {@link ChatProvider} — the dialog renders the toolbar
   * and streaming send/stop; when absent it stays the bare legacy shell. A prop
   * here overrides the provider's value.
   */
  readonly composer?: ChatComposerControls;
  readonly composerDisabled?: boolean;
  /**
   * Optional conversations switcher. When present — here or via
   * {@link ChatProvider} — the header renders a "Conversations" popover backed
   * by {@link ChatConversationSidebar}. A prop here overrides the provider.
   */
  readonly conversationSidebar?: ChatConversationSidebarProps;
  readonly defaultOpen?: boolean;
  /** When omitted, values come from {@link ChatProvider}. */
  readonly messages?: readonly ChatMessage[];
  readonly onOpenChange?: (open: boolean) => void;
  /** When omitted, values come from {@link ChatProvider}. */
  readonly onSendMessage?: (message: string) => void;
  readonly open?: boolean;
  readonly title?: string;
  readonly trigger?: React.ReactNode;
  readonly triggerLabel?: string;
  readonly variant?: ChatDialogVariant;
}

/**
 * @description Modal chat shell: dialog or sheet with thread + composer.
 */
export const ChatDialog = (props: ChatDialogProps): React.ReactElement => {
  const {
    className,
    composer: composerProp,
    composerDisabled: composerDisabledProp,
    conversationSidebar: conversationSidebarProp,
    defaultOpen,
    messages: messagesProp,
    onOpenChange: onOpenChangeProp,
    onSendMessage: onSendMessageProp,
    open: openProp,
    title = 'Chat',
    trigger,
    triggerLabel = 'Open chat',
    variant = 'sheet',
  } = props;

  // Hooks
  const {
    composer,
    composerDisabled,
    conversationSidebar,
    messages,
    onOpenChange,
    onSendMessage,
    onStartNewChat,
    open,
  } = useChatDialog({
    composer: composerProp,
    composerDisabled: composerDisabledProp,
    conversationSidebar: conversationSidebarProp,
    messages: messagesProp,
    onOpenChange: onOpenChangeProp,
    onSendMessage: onSendMessageProp,
    open: openProp,
  });

  // Setup
  const triggerNode = trigger ?? (
    <Button size="sm" type="button" variant="secondary">
      {triggerLabel}
    </Button>
  );

  const shellBody = (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ChatThread messages={messages} />
      <ChatComposer
        className="border-t-0"
        disabled={composerDisabled}
        isStreaming={composer?.isStreaming}
        onStop={composer?.onStop}
        onSubmit={onSendMessage}
        sessionUsage={composer?.sessionUsage}
        toolbar={
          composer !== undefined ? (
            <ChatComposerToolbar {...composer} />
          ) : undefined
        }
      />
    </div>
  );

  const header = (
    <ChatDialogHeader
      conversationSidebar={conversationSidebar}
      onStartNewChat={onStartNewChat}
      title={title}
    />
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (variant === 'sheet') {
    return (
      <Sheet defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
        <SheetTrigger asChild={true}>{triggerNode}</SheetTrigger>
        <SheetContent
          className={clsx(
            'flex w-full flex-col sm:max-w-md md:max-w-4xl',
            className,
          )}
          data-testid="ChatDialog"
          side="right"
        >
          <SheetHeader>
            <SheetTitle className="flex w-full items-center gap-2">
              {header}
            </SheetTitle>
          </SheetHeader>
          {shellBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild={true}>{triggerNode}</DialogTrigger>
      <DialogContent
        className={clsx(
          'flex max-h-[min(85vh,720px)] w-full max-w-3xl flex-col',
          className,
        )}
        data-testid="ChatDialog"
      >
        <DialogHeader>
          <DialogTitle className="flex w-full items-center gap-2">
            {header}
          </DialogTitle>
        </DialogHeader>
        {shellBody}
      </DialogContent>
    </Dialog>
  );
};
