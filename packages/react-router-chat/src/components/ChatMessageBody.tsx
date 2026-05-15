import * as React from 'react';
import { Markdown } from '@openthrottle/react-router-shadcn';
import type { ChatMessageRole } from '../types';

export interface ChatMessageBodyProps {
  readonly body: string;
  readonly role: ChatMessageRole;
}

const EMPTY_BODY_LABEL = '(No content)';

/**
 * @description Renders a message body: plain text for user; {@link Markdown} for assistant/system.
 */
export const ChatMessageBody = (
  props: ChatMessageBodyProps,
): React.ReactElement => {
  const { body, role } = props;
  const trimmed = body.trim();

  if (!trimmed) {
    return (
      <p className="text-muted-foreground text-sm italic">{EMPTY_BODY_LABEL}</p>
    );
  }

  if (role === 'user') {
    return <p className="whitespace-pre-wrap break-words">{body}</p>;
  }

  return (
    <Markdown
      className="break-words text-sm [&_pre]:whitespace-pre-wrap"
      content={body}
    />
  );
};
