import * as React from 'react';

export interface UsePinnedToBottomOptions {
  /**
   * The element wrapping the content that grows (messages, streamed tokens).
   * Its mutations drive the pinned scroll; also the starting point for the
   * default scroller lookup.
   */
  readonly contentRef: React.RefObject<HTMLElement | null>;
  /**
   * Resolve the element that actually scrolls. Omit to use the nearest
   * scrollable ancestor of {@link contentRef} (the content element itself
   * counts) — which is what makes the same thread work whether it owns its
   * scroll (a dialog) or rides a page-level scroller (a route layout).
   */
  readonly getScrollElement?: () => HTMLElement | null;
  /**
   * Re-pin whenever this value changes — pass the id of the newest user
   * message so sending re-engages following. `null` never re-pins.
   */
  readonly repinKey?: string | null;
}

export interface UsePinnedToBottomResult {
  /** True while the view is following the bottom. */
  readonly isPinned: boolean;
  /** Jump to the bottom and re-engage following (the jump-to-latest control). */
  readonly repin: () => void;
}

/** Distance (px) from the bottom within which the view counts as "at bottom". */
export const NEAR_BOTTOM_THRESHOLD_PX = 64;

const OVERFLOW_SCROLLS = new Set(['auto', 'overlay', 'scroll']);

const findScroller = (start: HTMLElement | null): HTMLElement | null => {
  for (
    let element: HTMLElement | null = start;
    element !== null;
    element = element.parentElement
  ) {
    if (OVERFLOW_SCROLLS.has(getComputedStyle(element).overflowY)) {
      return element;
    }
  }
  return null;
};

const distanceFromBottom = (scroller: HTMLElement): number =>
  scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;

/**
 * Explicit pin-to-bottom for a streaming thread, replacing the guesswork of
 * scroll-on-every-change. The view follows the bottom while pinned, and the
 * only thing that unpins it is the user scrolling away — never a scroll we
 * performed ourselves, and never a token arriving. Sending a message (a change
 * in {@link UsePinnedToBottomOptions.repinKey}) re-pins, as does
 * {@link UsePinnedToBottomResult.repin}.
 *
 * Tracking is observer-driven rather than per-message: a `MutationObserver`
 * catches streamed text and newly rendered rows, and a `ResizeObserver` catches
 * late layout (markdown, images, a group being expanded), so mid-turn growth
 * keeps the bottom in view without a re-render per token.
 *
 * The scroller is pluggable because ownership differs by surface: a chat dialog
 * scrolls itself, while a route-level chat rides the page layout's scroller. The
 * default lookup walks up to the nearest scrollable ancestor, so the
 * user-scrolled-away guard listens to the element that genuinely scrolls.
 *
 * Coordinating with scroll restoration: a layout that restores a remembered
 * position on back-nav does so in its own layout effect, which runs after this
 * one, so restoration wins the initial position. The scroll it performs then
 * lands here as a user-ish scroll and unpins — the reader keeps the position
 * they came back to, and the affordance offers the way back down.
 *
 * @public
 */
export const usePinnedToBottom = (
  options: UsePinnedToBottomOptions,
): UsePinnedToBottomResult => {
  const { contentRef, getScrollElement, repinKey = null } = options;

  // Hooks
  const [isPinned, setIsPinned] = React.useState<boolean>(true);
  // Observers and scroll listeners fire outside render, so they read the pin
  // state from a ref rather than a stale closure.
  const isPinnedRef = React.useRef<boolean>(true);
  // Set while we are the ones moving the scroller, so our own scroll events
  // cannot be mistaken for the user scrolling away.
  const isSelfScrollingRef = React.useRef<boolean>(false);
  const getScrollElementRef = React.useRef(getScrollElement);
  getScrollElementRef.current = getScrollElement;

  // Setup

  // Handlers
  const resolveScroller = React.useCallback((): HTMLElement | null => {
    const content = contentRef.current;
    const explicit = getScrollElementRef.current?.();
    // Fall back to the content element itself: it is the closest thing to a
    // scroller we have, and in the surfaces where it is not the real one the
    // consumer supplies `getScrollElement` (that mismatch is exactly the bug
    // this prop exists to fix).
    return explicit ?? findScroller(content) ?? content;
  }, [contentRef]);

  const scrollToBottom = React.useCallback((): void => {
    const scroller = resolveScroller();
    if (scroller === null) {
      return;
    }
    isSelfScrollingRef.current = true;
    scroller.scrollTop = scroller.scrollHeight;
  }, [resolveScroller]);

  const setPinned = React.useCallback((next: boolean): void => {
    isPinnedRef.current = next;
    setIsPinned(next);
  }, []);

  const repin = React.useCallback((): void => {
    setPinned(true);
    scrollToBottom();
  }, [scrollToBottom, setPinned]);

  // Markup

  // Life Cycle
  // Follow the bottom while pinned. MutationObserver carries the load (streamed
  // text, appended rows); ResizeObserver adds late layout where available.
  React.useEffect(() => {
    const content = contentRef.current;
    if (content === null) {
      return;
    }

    const follow = (): void => {
      if (isPinnedRef.current) {
        scrollToBottom();
      }
    };

    const mutations = new MutationObserver(follow);
    mutations.observe(content, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    const resizes =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(follow);
    resizes?.observe(content);

    return () => {
      mutations.disconnect();
      resizes?.disconnect();
    };
  }, [contentRef, scrollToBottom]);

  // Unpin when the user scrolls away from the bottom — and only then.
  React.useEffect(() => {
    const scroller = resolveScroller();
    if (scroller === null) {
      return;
    }

    const handleScroll = (): void => {
      const away = distanceFromBottom(scroller) > NEAR_BOTTOM_THRESHOLD_PX;
      // Our own jump can emit a scroll event before the browser settles; ignore
      // exactly one, and only while it left us at the bottom.
      if (isSelfScrollingRef.current) {
        isSelfScrollingRef.current = false;
        if (!away) {
          return;
        }
      }
      if (away === isPinnedRef.current) {
        setPinned(!away);
      }
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [resolveScroller, setPinned]);

  // First paint: land at the bottom of whatever history hydrated, without
  // animation. Safe on an empty thread — there is nothing to scroll.
  React.useEffect(() => {
    scrollToBottom();
    // `scrollToBottom` is stable, so this stays a mount-only jump; later scrolls
    // are driven by the observers and by repinning.
  }, [scrollToBottom]);

  // A new user message means the reader is following their own send.
  React.useEffect(() => {
    if (repinKey === null) {
      return;
    }
    setPinned(true);
    scrollToBottom();
  }, [repinKey, scrollToBottom, setPinned]);

  // 🔌 Short Circuit

  return { isPinned, repin };
};
