import * as React from 'react';

export interface UseRotatingHeadlineOptions {
  readonly crossfadeMs: number;
  readonly intervalMs: number;
  readonly items: readonly string[];
}

/**
 * Cycles through `items` on an interval. `advance` steps forward and resets
 * the timer. Autoplay is skipped when `intervalMs` is not positive, there are
 * fewer than two items, or `prefers-reduced-motion: reduce` is set.
 *
 * `outgoing` is the line being faded out (null when idle). `incomingVisible`
 * flips on the frame after a swap so both layers can opacity-cross.
 */
export const useRotatingHeadline = (
  options: UseRotatingHeadlineOptions,
): {
  readonly advance: () => void;
  readonly headline: string;
  readonly incomingVisible: boolean;
  readonly outgoing: string | null;
} => {
  const { crossfadeMs, intervalMs, items } = options;

  // Hooks
  const [index, setIndex] = React.useState(0);
  const [incomingVisible, setIncomingVisible] = React.useState(true);
  const [outgoing, setOutgoing] = React.useState<string | null>(null);

  // Setup
  const length = items.length;
  const headline = items[index] ?? items[0] ?? '';

  // Handlers
  const advance = React.useCallback((): void => {
    if (length < 2) {
      return;
    }

    setOutgoing(items[index] ?? null);
    setIncomingVisible(false);
    setIndex((current) => (current + 1) % length);
  }, [index, items, length]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (length < 2 || intervalMs <= 0) {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const id = window.setInterval(advance, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [advance, index, intervalMs, length]);

  React.useEffect(() => {
    if (outgoing === null) {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || crossfadeMs <= 0) {
      setIncomingVisible(true);
      setOutgoing(null);

      return;
    }

    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        setIncomingVisible(true);
      });
    });
    const timeout = window.setTimeout(() => {
      setOutgoing(null);
    }, crossfadeMs);

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(timeout);
    };
  }, [crossfadeMs, outgoing]);

  // 🔌 Short Circuit

  return { advance, headline, incomingVisible, outgoing };
};
