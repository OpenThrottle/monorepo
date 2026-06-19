import * as React from 'react';
import classnames from 'classnames';
import { ChatMessageBody } from './ChatMessageBody';
import { ChatTurnTimeline } from './ChatTurnTimeline';
import { formatChatTimestamp } from '../utils/index';
import type { ChatMessage } from '../types';

export interface ChatThreadMessageProps {
  readonly message: ChatMessage;
}

const roleLabel: Record<ChatMessage['role'], string> = {
  assistant: 'Assistant',
  system: 'System',
  user: 'You',
};

/**
 * @description Single chat thread row. Memoized so appending a message does not
 * re-render the entire thread — only new/changed rows render.
 */
const ChatThreadMessageComponent = (
  props: ChatThreadMessageProps,
): React.ReactElement => {
  const { message } = props;

  // Hooks

  // Setup
  const hasTimeline =
    message.role === 'assistant' &&
    message.events !== undefined &&
    message.events.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <article
      className={classnames('flex flex-col gap-1 text-sm', {
        'items-end': message.role === 'user',
        'items-start': message.role !== 'user',
      })}
      data-testid={`ChatThread-message-${message.id}`}
    >
      <div
        className={classnames(
          'flex flex-wrap items-baseline gap-x-2 gap-y-0.5',
          {
            'justify-end': message.role === 'user',
            'justify-start': message.role !== 'user',
          },
        )}
      >
        <span className="text-muted-foreground text-xs font-medium">
          {roleLabel[message.role]}
        </span>
        {message.createdAt ? (
          <time
            className="text-muted-foreground text-xs"
            dateTime={message.createdAt}
          >
            {formatChatTimestamp(message.createdAt)}
          </time>
        ) : null}
      </div>
      <div
        className={classnames('max-w-[85%] rounded-lg', {
          'bg-primary text-primary-foreground px-3 py-2':
            message.role === 'user',
          // 'px-3 py-2': message.role === 'assistant',
          'text-muted-foreground border border-dashed':
            message.role === 'system',
        })}
      >
        {hasTimeline && message.events !== undefined ? (
          <ChatTurnTimeline events={message.events} />
        ) : (
          <ChatMessageBody body={message.body} role={message.role} />
        )}
        {message.footer != null && message.footer.trim() !== '' ? (
          <p className="text-muted-foreground border-border/60 mt-2 border-t pt-2 font-mono text-xs">
            {message.footer}
          </p>
        ) : null}
      </div>
    </article>
  );
};

/**
 * @description Memoized chat thread row keyed by message identity. Re-renders
 * only when its own `message` reference changes.
 *
 * @publicApi
 */
export const ChatThreadMessage = React.memo(ChatThreadMessageComponent);
