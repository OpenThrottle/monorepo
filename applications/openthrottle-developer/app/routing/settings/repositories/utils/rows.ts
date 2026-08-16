import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import type {
  RepositoryCheckout,
  RepositoryCheckoutRow,
} from '~/routing/settings/repositories/data/types';

/** The `kind` discriminator the server writes for worktree checkouts. */
const WORKTREE_CHECKOUT_KIND = 'worktree';

const toRow = (
  repository: WorkspaceRepositoryFieldsFragment,
  checkout: RepositoryCheckout,
  children: RepositoryCheckoutRow[] = [],
): RepositoryCheckoutRow => ({
  branch:
    checkout.inspection?.git.currentBranch ?? repository.defaultBranch ?? null,
  checkout,
  children: children.length > 0 ? children : undefined,
  isWorktree: checkout.kind === WORKTREE_CHECKOUT_KIND,
  remoteUrl: repository.normalizedRemoteUrl ?? null,
  repositoryId: repository.id,
  repositoryName: repository.name,
});

/**
 * @description Turn the flat `workspaceRepositories` payload into the two-level
 * row model the repositories table renders: a repository's primary checkout is a
 * parent row and its worktree checkouts hang off it as children.
 *
 * Edge cases, all deliberate and covered by tests:
 * - **Zero checkouts** — the repository is skipped entirely. Every row is a
 *   checkout, and a repository with none has nothing to act on; the repository
 *   itself remains reachable at its detail route.
 * - **Several primary checkouts** — each becomes its own parent row. The
 *   repository's worktrees attach to the first primary so they surface exactly
 *   once rather than being duplicated under every primary.
 * - **Worktrees with no primary sibling** — the first worktree is promoted to
 *   parent (still flagged `isWorktree`) and the rest nest beneath it, so an
 *   orphaned worktree is never dropped from the table.
 */
export function buildRepositoryRows(
  repositories: WorkspaceRepositoryFieldsFragment[],
): RepositoryCheckoutRow[] {
  const rows: RepositoryCheckoutRow[] = [];

  for (const repository of repositories) {
    const checkouts = repository.checkouts ?? [];

    if (checkouts.length === 0) {
      continue;
    }

    const primaries = checkouts.filter(
      (checkout) => checkout.kind !== WORKTREE_CHECKOUT_KIND,
    );
    const worktrees = checkouts.filter(
      (checkout) => checkout.kind === WORKTREE_CHECKOUT_KIND,
    );

    if (primaries.length === 0) {
      const [promoted, ...rest] = worktrees;

      rows.push(
        toRow(
          repository,
          promoted,
          rest.map((worktree) => toRow(repository, worktree)),
        ),
      );

      continue;
    }

    primaries.forEach((primary, index) => {
      const children =
        index === 0
          ? worktrees.map((worktree) => toRow(repository, worktree))
          : [];

      rows.push(toRow(repository, primary, children));
    });
  }

  return rows;
}
