import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanRunWorktreeTeardownOutcome } from '~/__generated__/graphql';
import { REMOVE_PLAN_RUN_WORKTREE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RemovePlanRunWorktreeResult } from '~/routing/settings/repositories/types';

export interface WorktreeRemovalOutcomeProps {
  className?: string;
  /** What `removePlanRunWorktree` answered for the row the user acted on. */
  result: RemovePlanRunWorktreeResult;
}

/**
 * @description Reports one worktree removal: the folder that went and the branch that stayed, or
 * why the server's guards kept it. A kept worktree is information, not an error — it usually
 * picked up work between the page load and the click.
 */
export const WorktreeRemovalOutcome = (
  props: WorktreeRemovalOutcomeProps,
): React.ReactElement => {
  const { className, result } = props;

  // Hooks

  // Setup
  const isRemoved = result.outcome === PlanRunWorktreeTeardownOutcome.Removed;
  const message = isRemoved
    ? REMOVE_PLAN_RUN_WORKTREE_COPY.removed(result.path, result.branch ?? null)
    : REMOVE_PLAN_RUN_WORKTREE_COPY.kept(result.path, result.detail ?? null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className={cn('text-sm break-all', className)}
      data-outcome={result.outcome}
      data-testid="WorktreeRemovalOutcome"
      role="status"
    >
      {message}
    </p>
  );
};
