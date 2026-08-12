import * as React from 'react';
import { Await } from 'react-router';

export interface DashboardDeferredCardProps<T> {
  children: (data: Awaited<T>) => React.ReactNode;
  errorText: string;
  fallback: React.ReactNode;
  resolve: T;
}

/**
 * @description Suspense + Await boundary for one deferred dashboard card: shows
 * `fallback` while pending and a muted `errorText` line on rejection. Keeps the
 * dashboard grid DRY and under the component-shape line cap.
 */
export const DashboardDeferredCard = <T,>(
  props: DashboardDeferredCardProps<T>,
): React.ReactElement => {
  const { children, errorText, fallback, resolve } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Suspense fallback={fallback}>
      <Await
        errorElement={
          <p className="text-muted-foreground text-sm">{errorText}</p>
        }
        resolve={resolve}
      >
        {children}
      </Await>
    </React.Suspense>
  );
};
