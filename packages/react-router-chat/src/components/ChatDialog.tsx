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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { BotIcon, MessageSquarePlus } from 'lucide-react';
import { useChatOptional } from '../context/chat-context';
import type { ChatComposerControls } from '../context/chat-context';
import { ChatComposer } from './ChatComposer';
import { ChatComposerToolbar } from './ChatComposerToolbar';
import { ChatThread } from './ChatThread';
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
  const chatContext = useChatOptional();

  // Setup
  const messages = messagesProp ?? chatContext?.messages;
  const onSendMessage = onSendMessageProp ?? chatContext?.onSendMessage;
  const onOpenChange = onOpenChangeProp ?? chatContext?.onOpenChange;
  const open = openProp ?? chatContext?.open;
  const composerDisabled =
    composerDisabledProp ?? chatContext?.composerDisabled ?? false;
  const onStartNewChat = chatContext?.onStartNewChat;
  // Optional agentic surface: a prop overrides the provider. When present the
  // dialog renders the toolbar + streaming; when undefined it stays the bare
  // legacy shell (the dormant agentsRunChatTurn path).
  const composer = composerProp ?? chatContext?.composer;

  if (!messages || !onSendMessage) {
    throw new Error(
      'ChatDialog requires messages and onSendMessage props, or a ChatProvider ancestor.',
    );
  }

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
        toolbar={
          composer !== undefined ? (
            <ChatComposerToolbar {...composer} />
          ) : undefined
        }
      />
    </div>
  );

  const newChatControl =
    onStartNewChat != null ? (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="New chat"
            className="shrink-0"
            onClick={onStartNewChat}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MessageSquarePlus aria-hidden={true} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>New chat</TooltipContent>
      </Tooltip>
    ) : null;

  const headerTitle = (
    <span className="flex min-w-0 flex-1 items-center gap-4">
      <BotIcon aria-hidden={true} className="text-muted-foreground shrink-0" />
      <span className="truncate">{title}</span>
    </span>
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
              {headerTitle}
              {newChatControl}
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
            {headerTitle}
            {newChatControl}
          </DialogTitle>
        </DialogHeader>
        {shellBody}
      </DialogContent>
    </Dialog>
  );
};
