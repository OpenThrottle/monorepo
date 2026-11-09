import { Button, cn, Skeleton } from '@openthrottle/react-router-shadcn';
import { RefreshCwIcon } from 'lucide-react';
import * as React from 'react';

import { WorktreeDiscoveryNotice } from '~/routing/settings/repositories/components/WorktreeDiscoveryNotice';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { useRescanWorktrees } from '~/routing/settings/repositories/hooks/useRescanWorktrees';
import type {
  DiscoveredWorktreesResult,
  RepositoriesDiscoveryStatus,
} from '~/routing/settings/repositories/types';

export interface WorktreeDiscoveryStatusProps {
  className?: string;
  /** The scan, once it has resolved; null while pending or after a first-load failure. */
  discoveredWorktrees: DiscoveredWorktreesResult | null;
  status: RepositoriesDiscoveryStatus;
}

/**
 * @description The scan-level line under the repositories table, whatever state
 * the streamed on-disk scan is in: `WorktreeDiscoveryNotice` once it has resolved,
 * otherwise a pending line or — when the first scan failed — the failure and a
 * control to try again. The table above is already real either way: registered
 * checkouts come from the fast half of the loader.
 */
export const WorktreeDiscoveryStatus = (
  props: WorktreeDiscoveryStatusProps,
): React.ReactElement => {
  const { className, discoveredWorktrees, status } = props;

  // Hooks
  const { isRescanning, rescan } = useRescanWorktrees();

  // Setup
  const { pendingLabel, refreshButton, refreshingButton, rejectedBody } =
    WORKTREE_DISCOVERY_COPY;
  const rescanLabel = isRescanning ? refreshingButton : refreshButton;

  // Handlers
  const handleRescan = (): void => {
    rescan();
  };

  // Markup
  const pending = (
    <div
      aria-busy={true}
      className={cn('flex items-center gap-3', className)}
      data-testid="WorktreeDiscoveryStatus"
      role="status"
    >
      <Skeleton className="h-4 w-4 rounded-full" />
      <p className="text-muted-foreground text-sm">{pendingLabel}</p>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (discoveredWorktrees) {
    return (
      <WorktreeDiscoveryNotice
        className={className}
        discoveredWorktrees={discoveredWorktrees}
      />
    );
  }
  if (status !== 'rejected') return pending;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-3', className)}
      data-testid="WorktreeDiscoveryStatus"
      role="alert"
    >
      <p className="text-muted-foreground text-sm">{rejectedBody}</p>
      <Button
        disabled={isRescanning}
        onClick={handleRescan}
        size="sm"
        type="button"
        variant="outline"
      >
        <RefreshCwIcon aria-hidden={true} className="size-3" />
        {rescanLabel}
      </Button>
    </div>
  );
};
