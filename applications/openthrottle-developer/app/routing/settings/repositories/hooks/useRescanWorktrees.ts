/**
 * @description The "Rescan worktrees" control: submits the route's `rescanWorktrees` intent through
 * a fetcher.
 *
 * Not `revalidator.revalidate()`: the server caches each user's on-disk scan for a few seconds, so a
 * bare loader re-run would return the cached scan and the button would appear to do nothing. The
 * intent asks the server for a fresh scan, and the loader revalidation every action triggers then
 * reads it. `isRescanning` covers both halves, the action and that revalidation.
 */
import { useFetcher } from 'react-router';

import { RESCAN_WORKTREES_INTENT } from '~/routing/settings/repositories/config/repositories.defaults';

export interface UseRescanWorktreesResult {
  readonly isRescanning: boolean;
  readonly rescan: () => void;
}

export function useRescanWorktrees(): UseRescanWorktreesResult {
  // Hooks
  const fetcher = useFetcher();

  // Setup
  const isRescanning = fetcher.state !== 'idle';

  // Handlers
  const rescan = (): void => {
    void fetcher.submit(
      { intent: RESCAN_WORKTREES_INTENT },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { isRescanning, rescan };
}
