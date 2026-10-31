import clsx from 'clsx';
import * as React from 'react';

import { PruneWorktreeCheckoutOutcome } from '~/__generated__/graphql';
import { MISSING_WORKTREES_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { PruneWorktreeCheckoutResult } from '~/routing/settings/repositories/data/types';

export interface PruneWorktreesOutcomeProps {
  className?: string;
  /** One entry per requested checkout id, straight from `pruneWorktreeCheckouts`. */
  results: readonly PruneWorktreeCheckoutResult[];
}

/**
 * @description Reports a prune per id: how many records were removed, then each one that was
 * kept and why. A partial prune is the normal case — a worktree can come back, or a run can
 * still be holding one — so a kept record is information, not an error.
 */
export const PruneWorktreesOutcome = (
  props: PruneWorktreesOutcomeProps,
): React.ReactElement => {
  const { className, results } = props;

  // Hooks

  // Setup
  const prunedCount = results.filter(
    (result) => result.outcome === PruneWorktreeCheckoutOutcome.Pruned,
  ).length;
  const kept = results.flatMap((result) =>
    result.outcome === PruneWorktreeCheckoutOutcome.Pruned
      ? []
      : [
          {
            id: result.checkoutId,
            label: result.path ?? result.checkoutId,
            reason: MISSING_WORKTREES_COPY.outcomeReasons[result.outcome],
          },
        ],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('text-sm', className)}
      data-testid="PruneWorktreesOutcome"
      role="status"
    >
      <p>{MISSING_WORKTREES_COPY.outcomeRemoved(prunedCount)}</p>
      {kept.length > 0 ? (
        <>
          <p className="text-muted-foreground mt-1">
            {MISSING_WORKTREES_COPY.outcomeSkipped(kept.length)}
          </p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {kept.map((entry) => (
              <li key={entry.id}>
                <code className="break-all">{entry.label}</code> {entry.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
};
