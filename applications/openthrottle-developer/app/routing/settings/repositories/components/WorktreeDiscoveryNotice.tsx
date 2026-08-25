import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { RefreshCwIcon } from 'lucide-react';
import { Link, useRevalidator } from 'react-router';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/data/types';

export interface WorktreeDiscoveryNoticeProps {
  className?: string;
  discoveredWorktrees: DiscoveredWorktreesResult;
}

/**
 * @description Scan-level context for the on-disk worktree list: where OpenThrottle
 * looked, anything that went wrong while looking, and a control to look again.
 *
 * Discovery runs live in the loader with no cached snapshot, so "refresh" is a
 * loader revalidation rather than a mutation. Warnings render as a plain list
 * because a scan that half-worked must say so — silently short lists are the
 * failure mode this whole surface exists to avoid.
 */
export const WorktreeDiscoveryNotice = (
  props: WorktreeDiscoveryNoticeProps,
): React.ReactElement => {
  const { className, discoveredWorktrees } = props;
  const { droppedCount, warnings, worktreeRoot } = discoveredWorktrees;

  // Hooks
  const revalidator = useRevalidator();

  // Setup
  const isRescanning = revalidator.state === 'loading';

  // Handlers
  const handleRescan = (): void => {
    void revalidator.revalidate();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-2', className)}
      data-testid="WorktreeDiscoveryNotice"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {worktreeRoot === null ? (
          <p className="text-sm font-medium">
            {WORKTREE_DISCOVERY_COPY.unconfiguredTitle}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {WORKTREE_DISCOVERY_COPY.rootPrefix}{' '}
            <span className="font-medium">{worktreeRoot}</span>
          </p>
        )}

        <Button
          disabled={isRescanning}
          onClick={handleRescan}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon aria-hidden={true} className="size-3" />
          {isRescanning
            ? WORKTREE_DISCOVERY_COPY.refreshingButton
            : WORKTREE_DISCOVERY_COPY.refreshButton}
        </Button>
      </div>

      {worktreeRoot === null ? (
        <p className="text-muted-foreground text-xs">
          {WORKTREE_DISCOVERY_COPY.unconfiguredBody}{' '}
          <Link
            className="hover:text-primary underline underline-offset-2"
            to="/settings/workspace"
          >
            {WORKTREE_DISCOVERY_COPY.unconfiguredLinkLabel}
          </Link>
        </p>
      ) : null}

      {droppedCount > 0 ? (
        <p className="text-muted-foreground text-xs">
          {droppedCount} {WORKTREE_DISCOVERY_COPY.droppedCountSuffix}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div role="alert">
          <p className="text-xs font-medium">
            {WORKTREE_DISCOVERY_COPY.warningsTitle}
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {warnings.map((warning) => (
              <li className="text-muted-foreground text-xs" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
