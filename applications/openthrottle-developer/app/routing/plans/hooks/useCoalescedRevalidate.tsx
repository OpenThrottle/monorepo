import * as React from 'react';
import { useRevalidator } from 'react-router';

export interface UseCoalescedRevalidateOptions {
  /** Quiet period after the last request before the route revalidates. */
  readonly delayMs: number;
}

export interface UseCoalescedRevalidateResult {
  /** Ask for a revalidation; calls inside `delayMs` of each other collapse into one. */
  readonly requestRevalidate: () => void;
}

/**
 * @description Trailing-edge coalescing around `useRevalidator().revalidate()`. A burst of
 * requests makes one loader run, and a request that lands while a revalidation is already in
 * flight is held and replayed once it settles, so the last change is never dropped and loaders
 * never stack.
 */
export const useCoalescedRevalidate = (
  options: UseCoalescedRevalidateOptions,
): UseCoalescedRevalidateResult => {
  const { delayMs } = options;

  // Hooks
  const revalidator = useRevalidator();
  const revalidatorRef = React.useRef(revalidator);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReplayOwedRef = React.useRef(false);

  // Setup
  revalidatorRef.current = revalidator;
  const isIdle = revalidator.state === 'idle';

  // Handlers
  const flush = React.useCallback((): void => {
    timerRef.current = null;

    if (revalidatorRef.current.state !== 'idle') {
      isReplayOwedRef.current = true;
      return;
    }

    void revalidatorRef.current.revalidate();
  }, []);

  const requestRevalidate = React.useCallback((): void => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, delayMs);
  }, [delayMs, flush]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!isIdle || !isReplayOwedRef.current) return;

    isReplayOwedRef.current = false;
    requestRevalidate();
  }, [isIdle, requestRevalidate]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // 🔌 Short Circuit

  return { requestRevalidate };
};
