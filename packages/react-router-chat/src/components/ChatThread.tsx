import * as React from 'react';
import clsx from 'clsx';
import { ChatRetryNotice } from './ChatRetryNotice';
import { ChatThreadMessage } from './ChatThreadMessage';
import { usePinnedToBottom } from '../hooks/use-pinned-to-bottom';
import type { ChatMessage } from '../types';
import { findLastUserMessageId } from '../utils/chat-thread';

export interface ChatThreadProps {
  /**
   * When true, render a manual {@link ChatRetryNotice} after the last message —
   * the last turn timed out and its automatic retry was already spent. Requires
   * {@link onRetry}.
   */
  readonly canRetry?: boolean;
  readonly className?: string;
  readonly emptyStateLabel?: string;
  /**
   * Resolve the element that actually scrolls. Omit when the thread owns its
   * own scroll (a dialog); supply the page scroller when the thread rides a
   * route layout, or the scrolled-away guard listens to the wrong element.
   */
  readonly getScrollElement?: () => HTMLElement | null;
  /** Disable the Retry button while a replay is in flight. */
  readonly isRetrying?: boolean;
  readonly messages: readonly ChatMessage[];
  /** Told when the view stops or resumes following the bottom. */
  readonly onPinnedChange?: (isPinned: boolean) => void;
  /** Replay the last turn (wired to the Retry affordance). */
  readonly onRetry?: () => void;
  /**
   * Receives the "jump to latest" callback, so a control rendered outside the
   * thread (next to the composer) can re-engage following.
   */
  readonly repinRef?: React.RefObject<(() => void) | null>;
}

/**
 * @description Scrollable message list for modal chat with role-aware body
 * rendering. Rows are memoized (see {@link ChatThreadMessage}) so appends do
 * not re-render the whole thread. Scrolling is an explicit pinned-to-bottom
 * mode rather than a set of heuristics (see {@link usePinnedToBottom}): the
 * view follows the bottom while pinned, sending a message re-pins, and only the
 * user scrolling away unpins it — a streamed token never does. Because the
 * scroll owner differs by surface, {@link ChatThreadProps.getScrollElement}
 * plugs in the real scroller when the thread does not own it.
 */
export const ChatThread = (props: ChatThreadProps): React.ReactElement => {
  const {
    canRetry = false,
    className,
    emptyStateLabel = 'No messages yet. Send one to start.',
    getScrollElement,
    isRetrying = false,
    messages,
    onPinnedChange,
    onRetry,
    repinRef,
  } = props;

  // Hooks
  const contentRef = React.useRef<HTMLDivElement>(null);
  const { isPinned, repin } = usePinnedToBottom({
    contentRef,
    getScrollElement,
    repinKey: findLastUserMessageId(messages),
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    onPinnedChange?.(isPinned);
  }, [isPinned, onPinnedChange]);

  React.useEffect(() => {
    if (repinRef === undefined) {
      return;
    }
    repinRef.current = repin;
    return () => {
      repinRef.current = null;
    };
  }, [repin, repinRef]);

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Chat messages"
      aria-live="polite"
      className={clsx(
        'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1',
        className,
      )}
      data-testid="ChatThread"
      ref={contentRef}
      role="log"
    >
      {messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyStateLabel}</p>
      ) : (
        messages.map((message) => (
          <ChatThreadMessage key={message.id} message={message} />
        ))
      )}
      {canRetry && onRetry !== undefined ? (
        <ChatRetryNotice isRetrying={isRetrying} onRetry={onRetry} />
      ) : null}
    </div>
  );
};
