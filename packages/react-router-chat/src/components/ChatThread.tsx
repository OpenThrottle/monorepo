import * as React from 'react';
import clsx from 'clsx';
import { ChatRetryNotice } from './ChatRetryNotice';
import { ChatThreadMessage } from './ChatThreadMessage';
import type { ChatMessage } from '../types';
import {
  findLastAssistantMessage,
  findLastUserMessageId,
  hasStreamedContent,
} from '../utils/chat-thread';

export interface ChatThreadProps {
  /**
   * When true, render a manual {@link ChatRetryNotice} after the last message —
   * the last turn timed out and its automatic retry was already spent. Requires
   * {@link onRetry}.
   */
  readonly canRetry?: boolean;
  readonly className?: string;
  readonly emptyStateLabel?: string;
  /** Disable the Retry button while a replay is in flight. */
  readonly isRetrying?: boolean;
  readonly messages: readonly ChatMessage[];
  /** Replay the last turn (wired to the Retry affordance). */
  readonly onRetry?: () => void;
}

/** Distance (px) from the bottom within which auto-scroll stays engaged. */
const NEAR_BOTTOM_THRESHOLD_PX = 64;

/**
 * @description Scrollable message list for modal chat with role-aware body
 * rendering. Rows are memoized (see {@link ChatThreadMessage}) so appends do
 * not re-render the whole thread. Auto-scroll is event-driven, not
 * change-driven: it fires only when the user sends a message (always jump to
 * the bottom) and when an assistant turn streams its first token (once per
 * turn, and only while the user is reading near the bottom). Subsequent tokens
 * of the same turn do not re-scroll, so streaming no longer jerks the view.
 * The first paint (bulk history hydration) jumps without smooth animation.
 */
export const ChatThread = (props: ChatThreadProps): React.ReactElement => {
  const {
    canRetry = false,
    className,
    emptyStateLabel = 'No messages yet. Send one to start.',
    isRetrying = false,
    messages,
    onRetry,
  } = props;

  // Hooks
  const containerRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const isNearBottomRef = React.useRef<boolean>(true);
  const hasRenderedRef = React.useRef<boolean>(false);
  // Id of the newest user message we have already reacted to; a change means
  // the user just sent a new one.
  const lastUserMessageIdRef = React.useRef<string | null>(null);
  // Id of the assistant turn whose first-response scroll already fired; guards
  // against re-scrolling as that same turn keeps streaming tokens.
  const firstResponseScrolledIdRef = React.useRef<string | null>(null);

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
    // First paint (bulk history hydration): jump straight to the bottom without
    // smooth animation, and seed the trackers so pre-existing history is not
    // mistaken for fresh activity on the next render.
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      lastUserMessageIdRef.current = findLastUserMessageId(messages);
      const hydratedAssistant = findLastAssistantMessage(messages);
      firstResponseScrolledIdRef.current =
        hydratedAssistant !== undefined && hasStreamedContent(hydratedAssistant)
          ? hydratedAssistant.id
          : null;
      endRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }
    // The user just sent a message: always jump to the bottom (we are following
    // our own message) and re-engage near-bottom follow for the coming reply.
    const latestUserMessageId = findLastUserMessageId(messages);
    if (
      latestUserMessageId !== null &&
      latestUserMessageId !== lastUserMessageIdRef.current
    ) {
      lastUserMessageIdRef.current = latestUserMessageId;
      isNearBottomRef.current = true;
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // First token of an assistant turn: scroll once (respecting a user who has
    // scrolled up), then record the id so the tokens that follow — same id,
    // growing body — do not re-scroll. This is the core anti-jitter guard.
    const latestAssistant = findLastAssistantMessage(messages);
    if (
      latestAssistant !== undefined &&
      hasStreamedContent(latestAssistant) &&
      latestAssistant.id !== firstResponseScrolledIdRef.current
    ) {
      firstResponseScrolledIdRef.current = latestAssistant.id;
      if (isNearBottomRef.current) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

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
      {canRetry && onRetry !== undefined ? (
        <ChatRetryNotice isRetrying={isRetrying} onRetry={onRetry} />
      ) : null}
      <div ref={endRef} />
    </div>
  );
};
