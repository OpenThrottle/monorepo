import * as React from 'react';
import classnames from 'classnames';
import { ChatThreadMessage } from './ChatThreadMessage';
import type { ChatMessage } from '../types';

export interface ChatThreadProps {
  readonly className?: string;
  readonly emptyStateLabel?: string;
  readonly messages: readonly ChatMessage[];
}

/** Distance (px) from the bottom within which auto-scroll stays engaged. */
const NEAR_BOTTOM_THRESHOLD_PX = 64;

/**
 * @description Scrollable message list for modal chat with role-aware body
 * rendering. Rows are memoized (see {@link ChatThreadMessage}) so appends do
 * not re-render the whole thread. Auto-scroll only fires while the user is
 * near the bottom — scrolling up to read history is not hijacked — and the
 * first paint (bulk history hydration) jumps without smooth animation.
 */
export const ChatThread = (props: ChatThreadProps): React.ReactElement => {
  const {
    className,
    emptyStateLabel = 'No messages yet. Send one to start.',
    messages,
  } = props;

  // Hooks
  const containerRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const isNearBottomRef = React.useRef<boolean>(true);
  const hasRenderedRef = React.useRef<boolean>(false);

  // Setup

  // Handlers
  const handleScroll = React.useCallback((): void => {
    const container = containerRef.current;
    if (container == null) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    // Nothing to scroll to on an empty thread — skip the no-op scroll that
    // would otherwise fire on every empty mount (and in jsdom).
    if (messages.length === 0) {
      return;
    }
    // Skip smooth-scroll on the first paint (bulk history hydration); jump
    // straight to the bottom instead. Afterwards, only follow new messages
    // when the user is already reading at the bottom.
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      endRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }
    if (isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      onScroll={handleScroll}
      ref={containerRef}
      role="log"
    >
      {messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyStateLabel}</p>
      ) : (
        messages.map((message) => (
          <ChatThreadMessage key={message.id} message={message} />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};
