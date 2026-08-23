import * as React from 'react';

/**
 * @description Re-renders the caller once a second and hands back "now" as an ISO string, so an
 * elapsed time computed against a run's `startedAt` actually counts up instead of freezing at the
 * value it had when the route loaded.
 *
 * Ticking is opt-out via `enabled`: with nothing in flight there is nothing to count, so the interval
 * is never created. The interval is cleared on unmount and whenever `enabled` goes false.
 */
export const useElapsedTicker = (enabled = true): string => {
  const [now, setNow] = React.useState(() => new Date().toISOString());

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    // Re-read immediately: `enabled` flipping true means something just started.
    setNow(new Date().toISOString());

    const interval = setInterval(() => {
      setNow(new Date().toISOString());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  return now;
};
