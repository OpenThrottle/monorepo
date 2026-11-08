import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { ChatPermissionResponderContext } from '../data/data.chat-permission-responder-context';
import { CHAT_PERMISSION_REQUEST_COPY } from '../data/data.copy';
import type { ChatTurnPermissionEvent } from '../types';

export interface ChatPermissionRequestProps {
  readonly className?: string;
  /** The permission request, pending or settled. */
  readonly event: ChatTurnPermissionEvent;
}

/**
 * @description Card for an agent permission request in supervised mode: the
 * tool's title and one button per offered option. Answering goes through the
 * responder {@link ChatThread} provides; once the server reports a resolution
 * the buttons give way to the outcome.
 * @public
 */
export const ChatPermissionRequest = (
  props: ChatPermissionRequestProps,
): React.ReactElement => {
  const { className, event } = props;
  const { resolution } = event;

  // Hooks
  const respond = React.useContext(ChatPermissionResponderContext);
  // Optimistic: disable the buttons the moment one is pressed.
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  // Setup
  const chosen = event.options.find((option) => {
    return option.optionId === resolution?.optionId;
  });
  const isPending = resolution === null;
  const outcomeLabel = chosen?.name ?? CHAT_PERMISSION_REQUEST_COPY.cancelled;

  // Handlers
  const onAnswer = (optionId: string | null): void => {
    setIsSubmitted(true);
    respond?.(event.requestId, optionId);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'border-border bg-muted/40 my-1 flex flex-col gap-2 rounded-md border p-3 text-sm',
        className,
      )}
      data-testid="ChatPermissionRequest"
    >
      <p className="text-muted-foreground text-xs font-medium">
        {CHAT_PERMISSION_REQUEST_COPY.heading}
      </p>
      <p className="font-mono break-words">{event.toolTitle}</p>
      {isPending && (
        <div className="flex flex-wrap gap-2">
          {event.options.map((option) => (
            <Button
              disabled={respond === undefined || isSubmitted}
              key={option.optionId}
              onClick={() => {
                onAnswer(option.optionId);
              }}
              size="sm"
              type="button"
              variant={option.kind.startsWith('allow') ? 'default' : 'outline'}
            >
              {option.name}
            </Button>
          ))}
        </div>
      )}
      {!isPending && (
        <p
          className="text-muted-foreground text-xs"
          data-testid="ChatPermissionRequest-outcome"
        >
          {CHAT_PERMISSION_REQUEST_COPY.selectedPrefix} {outcomeLabel}
        </p>
      )}
    </div>
  );
};
