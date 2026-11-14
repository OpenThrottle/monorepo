import { Button, Empty } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/data.chat-conversation-sidebar.copy';

export interface ChatConversationListErrorProps {
  /** Why the list request failed, shown verbatim beneath the title. */
  readonly errorMessage: string;
  /** Re-request the list; omit to hide the Retry action. */
  readonly onRetry: (() => void) | undefined;
}

/**
 * @description The conversations list's failure state. A failed list request
 * returns zero rows, so without this the sidebar would show "No conversations
 * yet" while saved conversations exist — this says the load failed instead,
 * with the reason and a Retry.
 */
export const ChatConversationListError = (
  props: ChatConversationListErrorProps,
): React.ReactElement => {
  const { errorMessage, onRetry } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;

  // Handlers

  // Markup
  const retryButton = (
    <Button onClick={onRetry} size="sm" type="button" variant="outline">
      {copy.retry}
    </Button>
  );
  const retry = onRetry == null ? null : retryButton;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty
      className="px-2 py-6 text-center"
      data-testid="ChatConversationListError"
      role="alert"
    >
      <p className="text-sm font-medium">{copy.errorTitle}</p>
      <p className="text-muted-foreground text-xs break-words">
        {errorMessage}
      </p>
      {retry}
    </Empty>
  );
};
