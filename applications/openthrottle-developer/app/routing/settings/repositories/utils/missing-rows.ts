import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

/** Search param that reveals registered worktrees the last scan could not find on disk. */
export const SHOW_MISSING_PARAM = 'showMissing';

/** The value {@link SHOW_MISSING_PARAM} carries when set. */
export const SHOW_MISSING_VALUE = '1';

/** Route-action intent for `pruneWorktreeCheckouts`; ids travel comma-joined in `checkoutIds`. */
export const PRUNE_WORKTREE_CHECKOUTS_INTENT = 'pruneWorktreeCheckouts';

/**
 * @description Drops the rows flagged `missing`, so the default view lists exactly what is on
 * disk — the same set `git worktree list` reports.
 *
 * A missing row only ever carries children when it was PROMOTED to parent (its repository has no
 * primary checkout). Dropping it must not take its live siblings with it, so the first surviving
 * child is promoted in its place and the rest nest beneath it, mirroring how `buildRepositoryRows`
 * promotes in the first place.
 */
export const hideMissingRows = (
  rows: readonly RepositoryCheckoutRow[],
): RepositoryCheckoutRow[] =>
  rows.flatMap((row): RepositoryCheckoutRow[] => {
    const children = (row.children ?? []).filter((child) => !child.missing);

    if (!row.missing) {
      return [{ ...row, children: children.length > 0 ? children : undefined }];
    }

    const [promoted, ...rest] = children;
    if (promoted === undefined) return [];

    return [{ ...promoted, children: rest.length > 0 ? rest : undefined }];
  });
