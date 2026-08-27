import * as React from 'react';
import { Await } from 'react-router';
import { usePlanDeferredValue } from '~/routing/plans/hooks/usePlanDeferredValue';

export interface PlanDeferredSectionProps<T> {
  children: (data: T) => React.ReactNode;
  errorText: string;
  fallback: React.ReactNode;
  resolve: Promise<T>;
}

/**
 * @description Suspense + Await boundary for one deferred plan-detail region:
 * renders `fallback` on the first load, a muted `errorText` line when the
 * region's own promise rejects, and `children` once it resolves.
 *
 * Unlike `DashboardDeferredCard`, this keeps the previously resolved value on
 * screen while a revalidation's replacement promise is pending, so a running
 * plan's frequent lifecycle revalidations do not flash every region back to a
 * skeleton. See `usePlanDeferredValue`.
 */
export const PlanDeferredSection = <T,>(
  props: PlanDeferredSectionProps<T>,
): React.ReactElement => {
  const { children, errorText, fallback, resolve } = props;

  // Hooks
  const retained = usePlanDeferredValue(resolve);

  // Setup

  // Handlers

  // Markup
  const errorElement = (
    <p className="text-muted-foreground text-sm">{errorText}</p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  // A value from a previous promise stands in for the pending one, so the region
  // never re-suspends — nor falls back to `errorText` — after its first
  // successful load. Stale content beats a skeleton on every revalidation tick.
  if (retained !== undefined) {
    return <>{children(retained)}</>;
  }

  return (
    <React.Suspense fallback={fallback}>
      <Await errorElement={errorElement} resolve={resolve}>
        {children}
      </Await>
    </React.Suspense>
  );
};
