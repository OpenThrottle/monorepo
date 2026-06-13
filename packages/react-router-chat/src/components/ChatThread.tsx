import * as React from 'react';
import classnames from 'classnames';
import { ChatMessageBody } from './ChatMessageBody';
import { formatChatTimestamp } from '../utils/index';
import type { ChatMessage } from '../types';

export interface ChatThreadProps {
  readonly className?: string;
  readonly emptyStateLabel?: string;
  readonly messages: readonly ChatMessage[];
}

const roleLabel: Record<ChatMessage['role'], string> = {
  assistant: 'Assistant',
  system: 'System',
  user: 'You',
};

/**
 * @description Scrollable message list for modal chat with role-aware body rendering.
 */
export const ChatThread = (props: ChatThreadProps): React.ReactElement => {
  const {
    className,
    emptyStateLabel = 'No messages yet. Send one to start.',
    messages,
  } = props;

  // Hooks
  const endRef = React.useRef<HTMLDivElement>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Chat messages"
      aria-live="polite"
      className={classnames(
        'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1',
        className,
      )}
      data-testid="ChatThread"
      role="log"
    >
      {messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyStateLabel}</p>
      ) : (
        messages.map((message) => (
          <article
            className={classnames('flex flex-col gap-1 text-sm', {
              'items-end': message.role === 'user',
              'items-start': message.role !== 'user',
            })}
            data-testid={`ChatThread-message-${message.id}`}
            key={message.id}
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
              className={classnames('max-w-[85%] rounded-lg px-3 py-2', {
                'bg-muted text-foreground': message.role === 'assistant',
                'bg-primary text-primary-foreground': message.role === 'user',
                'text-muted-foreground border border-dashed':
                  message.role === 'system',
              })}
            >
              <ChatMessageBody body={message.body} role={message.role} />
              {message.footer != null && message.footer.trim() !== '' ? (
                <p className="text-muted-foreground border-border/60 mt-2 border-t pt-2 font-mono text-xs">
                  {message.footer}
                </p>
              ) : null}
            </div>
          </article>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};
