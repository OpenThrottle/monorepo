import * as React from 'react';

export interface UseElapsedMsOptions {
  /** Whether the clock runs; false stops the interval and clears the reading. */
  readonly isActive: boolean;
  /** ISO timestamp to count from; undefined counts from when `isActive` began. */
  readonly startedAt: string | undefined;
}

export interface UseElapsedMsResult {
  /** Milliseconds since the start, or undefined while inactive. */
  readonly elapsedMs: number | undefined;
}

/**
 * @description Milliseconds a run has been going, re-read once a second while
 * `isActive`. Counts from `startedAt` when it parses, else from the moment the
 * run became active (live turns carry no timestamp). The interval exists only
 * while active and is cleared on cleanup, so an idle session schedules nothing.
 *
 * @public
 */
export const useElapsedMs = (
  options: UseElapsedMsOptions,
): UseElapsedMsResult => {
  const { isActive, startedAt } = options;

  // Hooks
  const [startMs, setStartMs] = React.useState<number | undefined>(undefined);
  const [now, setNow] = React.useState<number>(() => Date.now());

  // Setup
  const tickMs = 1_000;
  const hasStarted = isActive && startMs !== undefined;
  const elapsedMs = hasStarted ? Math.max(0, now - startMs) : undefined;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!isActive) {
      setStartMs(undefined);

      return undefined;
    }
    const parsed = startedAt === undefined ? Number.NaN : Date.parse(startedAt);
    setStartMs(Number.isNaN(parsed) ? Date.now() : parsed);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), tickMs);

    return () => clearInterval(id);
  }, [isActive, startedAt]);

  // 🔌 Short Circuit

  return { elapsedMs };
};
