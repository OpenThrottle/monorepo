/**
 * @description Retains the last resolved value of a deferred loader promise while
 * a newer promise for the same region is still pending.
 *
 * Why this exists: `usePlanLifecycleRevalidation` revalidates the route on every
 * plan/task notification, and each revalidation hands every deferred region a
 * brand-new promise. A bare `<Await>` re-suspends on that new promise, so a plan
 * that is actively running would flash its skeletons on every tick. Holding the
 * previous value means the skeleton is shown only on a genuine first load, and a
 * revalidation swaps content in place once the new promise settles.
 *
 * Returns `undefined` only before the first resolution, which is the caller's
 * cue to render the fallback.
 */
import * as React from 'react';

export function usePlanDeferredValue<T>(promise: Promise<T>): T | undefined {
  // Hooks
  const [resolved, setResolved] = React.useState<T | undefined>(undefined);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    let active = true;

    promise
      .then((value) => {
        // 🚨 A superseded promise must never overwrite a newer region value.
        if (active) setResolved(value);
      })
      .catch(() => {
        // Rejections belong to the region's own error boundary, which renders
        // from the same promise. Swallowing here would otherwise surface as an
        // unhandled rejection while the retained value stays on screen.
      });

    return () => {
      active = false;
    };
  }, [promise]);

  // 🔌 Short Circuit

  return resolved;
}
