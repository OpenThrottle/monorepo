/**
 * @description The streamed on-disk discovery for /settings/repositories as render state.
 *
 * Same retention rule as `usePlanDeferredValue`: every revalidation (an action, a rescan) hands the
 * page a brand-new promise, and a bare `<Await>` would re-suspend on it and flash the worktree rows
 * away. Holding the last resolved scan means `pending` happens only on a genuine first load, and a
 * revalidation swaps the rows in place once its scan settles.
 *
 * A hook rather than `<Suspense>` + `<Await>` on purpose: the scan feeds the whole section (table
 * rows, toolbar counts, the add-folder dialog, the notice), so an Await boundary would have to wrap
 * the table and remount it — dropping its expanded groups — the moment the scan landed.
 */
import * as React from 'react';

import type {
  RepositoriesDiscovery,
  RepositoriesDiscoveryState,
} from '~/routing/settings/repositories/types';

export interface UseRepositoriesDiscoveryOptions {
  /** The loader's deferred discovery promise. */
  readonly promise: Promise<RepositoriesDiscovery>;
}

export type UseRepositoriesDiscoveryResult = RepositoriesDiscoveryState;

export function useRepositoriesDiscovery(
  options: UseRepositoriesDiscoveryOptions,
): UseRepositoriesDiscoveryResult {
  const { promise } = options;

  // Hooks
  const [state, setState] = React.useState<RepositoriesDiscoveryState>({
    status: 'pending',
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    let active = true;

    const settle = async (): Promise<void> => {
      try {
        const value = await promise;
        // 🚨 A superseded promise must never overwrite a newer scan.
        if (active) setState({ status: 'resolved', value });
      } catch {
        // Keep a previously resolved scan on screen: stale rows beat no rows. Only a first load
        // with nothing to fall back on reports the failure.
        if (active) {
          setState((previous) => {
            return previous.status === 'resolved'
              ? previous
              : { status: 'rejected' };
          });
        }
      }
    };
    void settle();

    return () => {
      active = false;
    };
  }, [promise]);

  // 🔌 Short Circuit

  return state;
}
