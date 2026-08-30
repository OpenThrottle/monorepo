import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { RefreshCwIcon } from 'lucide-react';
import { Link, useRevalidator } from 'react-router';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { summarizeDiscovery } from '~/routing/settings/repositories/utils/discovery-problems';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/data/types';

export interface WorktreeDiscoveryNoticeProps {
  className?: string;
  discoveredWorktrees: DiscoveredWorktreesResult;
}

/**
 * @description Scan-level context for the on-disk worktree list: where OpenThrottle
 * looked, anything worth acting on, and a control to look again.
 *
 * Discovery runs live in the loader with no cached snapshot, so "refresh" is a
 * loader revalidation rather than a mutation. A healthy machine renders one quiet
 * line and no alert: a repository with no worktrees yet is the ordinary state, and
 * saying so once as a count beats a bullet per repository that never goes away.
 * A scan that genuinely half-worked still says so — that is what the surface is for
 * — but leads with a sentence and keeps the raw git output collapsed.
 */
export const WorktreeDiscoveryNotice = (
  props: WorktreeDiscoveryNoticeProps,
): React.ReactElement => {
  const { className, discoveredWorktrees } = props;
  const { droppedCount, worktreeRoot } = discoveredWorktrees;

  // Hooks
  const revalidator = useRevalidator();

  // Setup
  const isRescanning = revalidator.state === 'loading';
  const { emptyRootCount, groups, problemCount } =
    summarizeDiscovery(discoveredWorktrees);

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

      {emptyRootCount > 0 ? (
        <p className="text-muted-foreground text-xs">
          {emptyRootCount}{' '}
          {emptyRootCount === 1
            ? WORKTREE_DISCOVERY_COPY.emptyRootsSuffixOne
            : WORKTREE_DISCOVERY_COPY.emptyRootsSuffixOther}
        </p>
      ) : null}

      {droppedCount > 0 ? (
        <p className="text-muted-foreground text-xs">
          {droppedCount} {WORKTREE_DISCOVERY_COPY.droppedCountSuffix}
        </p>
      ) : null}

      {groups.length > 0 ? (
        <div className="flex flex-col gap-2" role="alert">
          <p className="text-xs font-medium">
            {problemCount}{' '}
            {problemCount === 1
              ? WORKTREE_DISCOVERY_COPY.problemsCountSuffixOne
              : WORKTREE_DISCOVERY_COPY.problemsCountSuffixOther}
          </p>

          {groups.map((group) => (
            <Collapsible className="flex flex-col gap-1" key={group.id}>
              <p className="text-muted-foreground text-xs">
                {group.summary}
                {group.remedy === null ? null : ` ${group.remedy}`}
              </p>

              <CollapsibleTrigger className="text-muted-foreground hover:text-primary w-fit text-xs underline underline-offset-2">
                {WORKTREE_DISCOVERY_COPY.detailsShow}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <ul className="list-inside list-disc space-y-1">
                  {group.details.map((detail) => (
                    <li
                      className="text-muted-foreground font-mono text-xs break-all"
                      key={detail}
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : null}
    </div>
  );
};
