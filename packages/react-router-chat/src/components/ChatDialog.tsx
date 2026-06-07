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
import classnames from 'classnames';
import { useChatOptional } from '../context/chat-context';
import { ChatComposer } from './ChatComposer';
import { ChatThread } from './ChatThread';
import type { ChatMessage } from '../types';
import { BotIcon } from 'lucide-react';

type ChatDialogVariant = 'dialog' | 'sheet';

export interface ChatDialogProps {
  readonly className?: string;
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
        onSubmit={onSendMessage}
      />
    </div>
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
          className={classnames(
            'flex w-full flex-col sm:max-w-md md:max-w-4xl',
            className,
          )}
          data-testid="ChatDialog"
          side="right"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center flex-row gap-4">
              <BotIcon className="text-muted-foreground" />
              {title}
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
        className={classnames(
          'flex max-h-[min(85vh,720px)] w-full max-w-3xl flex-col',
          className,
        )}
        data-testid="ChatDialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <BotIcon className="text-muted-foreground" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {shellBody}
      </DialogContent>
    </Dialog>
  );
};
