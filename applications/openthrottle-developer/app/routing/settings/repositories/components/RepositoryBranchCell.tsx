import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/types';
import { planDetailPath } from '~/routing/settings/repositories/utils/paths';
import {
  deriveWorktreeBadges,
  WORKTREE_BADGE_COLORS,
} from '~/routing/settings/repositories/utils/worktree-badges';

export interface RepositoryBranchCellProps {
  row: RepositoryCheckoutRow;
}

/**
 * @description The branch column: the branch badge, a managed marker, the worktree
 * status badges and, for a plan-run worktree, a link to the run's plan. Split out
 * of RepositoriesTable for its line cap.
 */
export const RepositoryBranchCell = (
  props: RepositoryBranchCellProps,
): React.ReactElement => {
  const { row } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const branchBadge = <Badge variant="outline">{row.branch}</Badge>;
  const managedBadge = (
    <Badge variant="secondary">{WORKSPACE_FOLDERS_COPY.managedBadge}</Badge>
  );
  const planLink = (
    <Link
      className="hover:text-primary text-xs underline underline-offset-2"
      to={planDetailPath(row.planId ?? '')}
    >
      {REPOSITORIES_TABLE_COPY.worktreeRunLinkLabel}
    </Link>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-wrap items-center gap-1">
      {row.branch ? branchBadge : null}
      {row.checkout?.managed ? managedBadge : null}
      {deriveWorktreeBadges(row).map((badge) => (
        <Badge
          color={WORKTREE_BADGE_COLORS[badge.tone]}
          key={badge.id}
          size="xs"
          title={badge.title}
          variant="secondary"
        >
          {badge.label}
        </Badge>
      ))}
      {row.planId ? planLink : null}
    </div>
  );
};
