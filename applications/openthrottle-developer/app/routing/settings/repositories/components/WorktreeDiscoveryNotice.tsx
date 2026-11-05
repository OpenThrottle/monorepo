import {
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { RefreshCwIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useRevalidator } from 'react-router';

import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/types';
import { configuredRoots } from '~/routing/settings/repositories/utils/configured-roots';
import { summarizeDiscovery } from '~/routing/settings/repositories/utils/discovery-problems';
import { pluralSuffix } from '~/routing/settings/repositories/utils/plural-suffix';

export interface WorktreeDiscoveryNoticeProps {
  className?: string;
  discoveredWorktrees: DiscoveredWorktreesResult;
}

/**
 * @description Scan-level context for the on-disk worktree list: the configured
 * root(s) OpenThrottle looked under and where each came from, anything worth acting
 * on, and a control to look again.
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
  const { droppedCount, scannedRoots } = discoveredWorktrees;

  // Hooks
  const revalidator = useRevalidator();

  // Setup
  const isRescanning = revalidator.state === 'loading';
  const roots = configuredRoots(scannedRoots);
  const hasNoRoots = roots.length === 0;
  const [singleRoot] = roots.length === 1 ? roots : [];
  const hasSingleRoot = singleRoot !== undefined;
  const { emptyRootCount, groups, problemCount } =
    summarizeDiscovery(discoveredWorktrees);
  const {
    emptyRootsSuffixOne,
    emptyRootsSuffixOther,
    problemsCountSuffixOne,
    problemsCountSuffixOther,
    refreshButton,
    refreshingButton,
  } = WORKTREE_DISCOVERY_COPY;
  const emptyRootsSuffix = pluralSuffix(
    emptyRootCount,
    emptyRootsSuffixOne,
    emptyRootsSuffixOther,
  );
  const problemsSuffix = pluralSuffix(
    problemCount,
    problemsCountSuffixOne,
    problemsCountSuffixOther,
  );
  const rescanLabel = isRescanning ? refreshingButton : refreshButton;

  // Handlers
  const handleRescan = (): void => {
    void revalidator.revalidate();
  };

  // Markup
  const unconfiguredHeading = (
    <p className="text-sm font-medium">
      {WORKTREE_DISCOVERY_COPY.unconfiguredTitle}
    </p>
  );
  const multiRootHeading = (
    <p className="text-muted-foreground text-xs">
      {WORKTREE_DISCOVERY_COPY.rootsPrefixOther}
    </p>
  );
  const singleRootHeading = (
    <p className="text-muted-foreground text-xs">
      {WORKTREE_DISCOVERY_COPY.rootPrefix}{' '}
      <span className="font-medium">{singleRoot?.baseRoot}</span>{' '}
      <span>({singleRoot?.sourceLabel})</span>
    </p>
  );
  const populatedHeading = hasSingleRoot ? singleRootHeading : multiRootHeading;
  const rootsHeading = hasNoRoots ? unconfiguredHeading : populatedHeading;
  const rootList = (
    <ul className="list-inside list-disc space-y-1">
      {roots.map((root) => (
        <li className="text-muted-foreground text-xs" key={root.baseRoot}>
          <span className="font-medium">{root.baseRoot}</span>{' '}
          <span>({root.sourceLabel})</span>
        </li>
      ))}
    </ul>
  );
  const unconfiguredHint = (
    <p className="text-muted-foreground text-xs">
      {WORKTREE_DISCOVERY_COPY.unconfiguredBody}{' '}
      <Link
        className="hover:text-primary underline underline-offset-2"
        to="/settings/workspace"
      >
        {WORKTREE_DISCOVERY_COPY.unconfiguredLinkLabel}
      </Link>
    </p>
  );
  const emptyRootsNotice = (
    <p className="text-muted-foreground text-xs">
      {emptyRootCount} {emptyRootsSuffix}
    </p>
  );
  const droppedNotice = (
    <p className="text-muted-foreground text-xs">
      {droppedCount} {WORKTREE_DISCOVERY_COPY.droppedCountSuffix}
    </p>
  );
  const problemsAlert = (
    <div className="flex flex-col gap-2" role="alert">
      <p className="text-xs font-medium">
        {problemCount} {problemsSuffix}
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
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-testid="WorktreeDiscoveryNotice"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {rootsHeading}

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

      {roots.length > 1 ? rootList : null}

      {hasNoRoots ? unconfiguredHint : null}

      {emptyRootCount > 0 ? emptyRootsNotice : null}

      {droppedCount > 0 ? droppedNotice : null}

      {groups.length > 0 ? problemsAlert : null}
    </div>
  );
};
