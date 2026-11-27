import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { ChatPermissionResponderContext } from '../data/chat-permission-responder-context';
import { usePinnedToBottom } from '../hooks/usePinnedToBottom';
import type {
  ChatMessage,
  ChatPermissionResponder,
  ChatThreadLoadEarlier,
} from '../types';
import { findLastUserMessageId } from '../utils/findLastUserMessageId';
import { findScroller } from '../utils/findScroller';
import { ChatLoadEarlier } from './ChatLoadEarlier';
import { ChatRetryNotice } from './ChatRetryNotice';
import { ChatThreadMessage } from './ChatThreadMessage';

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
  /**
   * Pages back through a restored conversation. Renders a Load earlier control
   * above the oldest message while older rows exist.
   */
  readonly loadEarlier?: ChatThreadLoadEarlier;
  readonly messages: readonly ChatMessage[];
  /** Told when the view stops or resumes following the bottom. */
  readonly onPinnedChange?: (isPinned: boolean) => void;
  /** Answers an ACP permission request card (wired to the respond mutation). */
  readonly onRespondToPermission?: ChatPermissionResponder;
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
 * plugs in the real scroller when the thread does not own it. Loading earlier
 * messages keeps the reader where they were: the distance from the bottom is
 * captured before the page loads and restored once it is prepended.
 */
export const ChatThread = (props: ChatThreadProps): React.ReactElement => {
  const {
    canRetry = false,
    className,
    emptyStateLabel = 'No messages yet. Send one to start.',
    getScrollElement,
    isRetrying = false,
    loadEarlier,
    messages,
    onPinnedChange,
    onRespondToPermission,
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
  // Distance from the bottom when Load earlier was clicked, restored once the
  // older page is prepended so the reading position does not jump.
  const offsetFromBottomRef = React.useRef<number | null>(null);

  // Setup
  const isEmpty = messages.length === 0;
  const firstMessageId = messages[0]?.id ?? null;
  const showLoadEarlier = loadEarlier?.hasEarlier === true;

  // Handlers
  const resolveScroller = (): HTMLElement | null => {
    const content = contentRef.current;

    return getScrollElement?.() ?? findScroller(content) ?? content;
  };

  const onLoadEarlier = (): void => {
    const scroller = resolveScroller();
    if (scroller !== null) {
      offsetFromBottomRef.current = scroller.scrollHeight - scroller.scrollTop;
    }
    loadEarlier?.onLoadEarlier();
  };

  // Markup

  // Life Cycle
  // Before paint, so the prepended page never flashes at the old offset.
  React.useLayoutEffect(() => {
    const offset = offsetFromBottomRef.current;
    const scroller = resolveScroller();
    if (offset === null || scroller === null) {
      return;
    }
    offsetFromBottomRef.current = null;
    scroller.scrollTop = scroller.scrollHeight - offset;
  }, [firstMessageId]);

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
    <ChatPermissionResponderContext.Provider value={onRespondToPermission}>
      <div
        aria-label="Chat messages"
        aria-live="polite"
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1',
          className,
        )}
        data-testid="ChatThread"
        ref={contentRef}
        role="log"
      >
        {showLoadEarlier && (
          <ChatLoadEarlier
            isLoading={loadEarlier.isLoading}
            onLoadEarlier={onLoadEarlier}
          />
        )}
        {isEmpty && (
          <p className="text-muted-foreground text-sm">{emptyStateLabel}</p>
        )}
        {!isEmpty &&
          messages.map((message) => (
            <ChatThreadMessage key={message.id} message={message} />
          ))}
        {canRetry && onRetry !== undefined && (
          <ChatRetryNotice isRetrying={isRetrying} onRetry={onRetry} />
        )}
      </div>
    </ChatPermissionResponderContext.Provider>
  );
};
