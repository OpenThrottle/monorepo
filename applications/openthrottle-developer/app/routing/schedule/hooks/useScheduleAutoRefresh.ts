import * as React from 'react';
import { useRevalidator } from 'react-router';

/** How often to re-read the route while something is in flight. */
const REFRESH_INTERVAL_MS = 5000;

/**
 * @description Keeps /schedule's activity view current by revalidating the route on an interval —
 * but only while `inFlightCount` is above zero, so an idle page makes no background traffic at all.
 *
 * This is polling rather than a subscription on purpose: the server publishes per-stream
 * subscriptions only (`queueJobLogTail`, `planOutputChunkAdded`, …) and nothing publishes
 * scheduled-run status transitions, so there is no `scheduledAgentJobRunStatusChanged` to listen to.
 * Interval `useRevalidator` is the established pattern in this app (see `SettingsDebugPanel`,
 * `PlanTasksBoard`, `root.tsx`). A real lifecycle subscription is a deliberate follow-up.
 *
 * Three details that make the polling behave:
 * - A tick is skipped while the revalidator is busy, so a slow response cannot stack up requests.
 * - A hidden tab does not poll; becoming visible again revalidates once immediately rather than
 *   waiting out an interval, so returning to the tab never shows a stale snapshot.
 * - The transition from in-flight to idle fires one final revalidate, so the stats row settles on
 *   the finished counts instead of keeping the last polled snapshot of a run that has since ended.
 */
export const useScheduleAutoRefresh = (inFlightCount: number): void => {
  const revalidator = useRevalidator();
  const isInFlight = inFlightCount > 0;

  // Read the revalidator through a ref so changing `state` does not tear down
  // and rebuild the interval on every request.
  const revalidatorRef = React.useRef(revalidator);
  revalidatorRef.current = revalidator;

  const wasInFlightRef = React.useRef(isInFlight);

  React.useEffect(() => {
    const revalidateWhenIdle = (): void => {
      if (revalidatorRef.current.state === 'idle') {
        void revalidatorRef.current.revalidate();
      }
    };

    // Whatever was running has finished: take one more reading so the counts
    // reflect the terminal state rather than the last in-flight poll.
    if (wasInFlightRef.current && !isInFlight) {
      wasInFlightRef.current = false;
      revalidateWhenIdle();
      return;
    }
    wasInFlightRef.current = isInFlight;

    if (!isInFlight) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      revalidateWhenIdle();
    }, REFRESH_INTERVAL_MS);

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        revalidateWhenIdle();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isInFlight]);
};
